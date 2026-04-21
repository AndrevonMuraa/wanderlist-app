"""Comprehensive DB quality check for WanderMark landmarks.

Read-only. Safe to run on prod anytime. Detects:

  1. Exact duplicate landmark_ids (critical)
  2. Exact duplicate (country_id, name) pairs (critical)
  3. Near-duplicate names WITHIN the same country (fuzzy — likely dupes)
  4. Near-duplicate names ACROSS countries (weaker signal, flags for review)
  5. Orphan landmarks (country_id not in countries collection)
  6. Per-country count mismatches (not 10 official + 5 premium)
  7. Landmark name red flags (empty, very short, likely-activity patterns)
  8. Country count sanity (expected 100)
  9. Total landmark count sanity (expected 1500 / 1000o + 500p)

Exit codes:
  0 — no issues
  1 — issues found (see output)

Run via Render Shell:
    cd scripts && python3 db_quality_check.py
"""
import asyncio
import os
import re
import sys
from collections import defaultdict
from difflib import SequenceMatcher
from motor.motor_asyncio import AsyncIOMotorClient


# --- Name normalization ---
STOPWORDS = {"the", "a", "an", "of", "and", "&"}
PUNCT_RE = re.compile(r"[^\w\s]")
WS_RE = re.compile(r"\s+")


def normalize_name(name: str) -> str:
    """Lowercase, strip punctuation + stopwords, collapse whitespace."""
    s = name.lower()
    s = PUNCT_RE.sub(" ", s)  # replace punctuation with space
    tokens = [t for t in s.split() if t and t not in STOPWORDS]
    return " ".join(tokens)


def name_tokens(name: str) -> set[str]:
    return set(normalize_name(name).split())


def token_jaccard(a: str, b: str) -> float:
    ta, tb = name_tokens(a), name_tokens(b)
    if not ta or not tb:
        return 0.0
    return len(ta & tb) / len(ta | tb)


def sequence_ratio(a: str, b: str) -> float:
    return SequenceMatcher(None, normalize_name(a), normalize_name(b)).ratio()


# Activity / tourist-packaging name patterns (should be landmarks, not activities)
ACTIVITY_PATTERNS = [
    "cruise", "balloon", "safari", "diving", "surf", "rafting",
    "train", "whale watching", "swimming", "snorkeling", "fish fry",
    "festival", "dancers", "hunters", "camel", "shark cage",
    "land diving", "ride", "express", "tour", "icebreaker",
    "hot air", "sea turtles", "red elephants", "mud festival",
    "light show", "pepper farm", "shipwreck div", "boat tour",
    "fire dance", "bird watch", "whale shark swim", "walking tour",
    "gaucho festival", "white water",
]


async def main():
    client = AsyncIOMotorClient(os.environ["MONGO_URL"])
    db = client[os.environ.get("DB_NAME", "wandermark")]

    issues = 0
    warnings = 0

    print("=" * 60)
    print("WanderMark DB Quality Check")
    print("=" * 60)

    # --- 1. Counts ---
    countries_count = await db.countries.count_documents({})
    lm_total = await db.landmarks.count_documents({"archived": {"$ne": True}})
    lm_official = await db.landmarks.count_documents(
        {"category": "official", "archived": {"$ne": True}}
    )
    lm_premium = await db.landmarks.count_documents(
        {"category": "premium", "archived": {"$ne": True}}
    )
    lm_archived = await db.landmarks.count_documents({"archived": True})
    print(f"\n[COUNTS]")
    print(f"  Countries               : {countries_count}  (expected 100)")
    print(f"  Active landmarks        : {lm_total}  (expected 1500)")
    print(f"  Official / Premium      : {lm_official} / {lm_premium}  (expected 1000 / 500)")
    print(f"  Archived landmarks      : {lm_archived}")
    if countries_count != 100:
        issues += 1
        print(f"  ISSUE: expected 100 countries, got {countries_count}")
    if lm_total != 1500 or lm_official != 1000 or lm_premium != 500:
        issues += 1
        print(f"  ISSUE: active landmark counts don't match expectations")

    # --- 2. Exact duplicate landmark_ids ---
    print(f"\n[1] EXACT DUPLICATE landmark_id")
    dup_ids = []
    pipeline = [
        {"$group": {"_id": "$landmark_id", "n": {"$sum": 1}}},
        {"$match": {"n": {"$gt": 1}}},
    ]
    async for d in db.landmarks.aggregate(pipeline):
        dup_ids.append(d["_id"])
    print(f"  Found: {len(dup_ids)}")
    for d in dup_ids:
        print(f"    - {d}")
        issues += 1

    # --- 3. Exact duplicate (country_id, name) ---
    print(f"\n[2] EXACT DUPLICATE (country_id, name)")
    dup_pairs = []
    pipeline = [
        {"$match": {"archived": {"$ne": True}}},
        {"$group": {
            "_id": {"country_id": "$country_id", "name": "$name"},
            "n": {"$sum": 1},
            "ids": {"$push": "$landmark_id"},
        }},
        {"$match": {"n": {"$gt": 1}}},
    ]
    async for d in db.landmarks.aggregate(pipeline):
        dup_pairs.append(d)
    print(f"  Found: {len(dup_pairs)}")
    for d in dup_pairs:
        print(f"    - {d['_id']['country_id']}/{d['_id']['name']}  ids: {d['ids']}")
        issues += 1

    # --- 4. Orphan landmarks ---
    print(f"\n[3] ORPHAN landmarks (country_id not in countries)")
    valid_cids = set()
    async for c in db.countries.find({}, {"_id": 0, "country_id": 1}):
        valid_cids.add(c["country_id"])
    orphans = []
    async for lm in db.landmarks.find(
        {"archived": {"$ne": True}},
        {"_id": 0, "landmark_id": 1, "name": 1, "country_id": 1},
    ):
        cid = lm.get("country_id")
        if not cid or cid not in valid_cids:
            orphans.append(lm)
    print(f"  Found: {len(orphans)}")
    for o in orphans:
        print(f"    - {o['landmark_id']}  '{o['name']}'  country_id='{o.get('country_id')}'")
        issues += 1

    # --- 5. Per-country mismatch ---
    print(f"\n[4] PER-COUNTRY count mismatches (not 10 official + 5 premium)")
    bad_countries = []
    async for c in db.countries.find(
        {}, {"_id": 0, "country_id": 1, "name": 1}
    ).sort("name", 1):
        o = await db.landmarks.count_documents(
            {"country_id": c["country_id"], "category": "official", "archived": {"$ne": True}}
        )
        p = await db.landmarks.count_documents(
            {"country_id": c["country_id"], "category": "premium", "archived": {"$ne": True}}
        )
        if o != 10 or p != 5:
            bad_countries.append(f"{c['name']}: {o}o + {p}p = {o + p}")
    print(f"  Found: {len(bad_countries)}")
    for b in bad_countries:
        print(f"    - {b}")
        issues += 1

    # --- 6. Near-duplicates WITHIN same country ---
    print(f"\n[5] NEAR-DUPLICATES within same country (fuzzy)")
    country_landmarks: dict[str, list] = defaultdict(list)
    async for lm in db.landmarks.find(
        {"archived": {"$ne": True}},
        {"_id": 0, "landmark_id": 1, "name": 1, "country_id": 1, "category": 1},
    ):
        country_landmarks[lm["country_id"]].append(lm)

    near_dupes_same = []
    for cid, lms in country_landmarks.items():
        for i in range(len(lms)):
            for j in range(i + 1, len(lms)):
                a, b = lms[i], lms[j]
                if a["name"] == b["name"]:
                    continue  # exact dupes handled above
                na, nb = normalize_name(a["name"]), normalize_name(b["name"])
                if na == nb:
                    near_dupes_same.append((cid, a, b, 1.0, "normalized-equal"))
                    continue
                j_sim = token_jaccard(a["name"], b["name"])
                s_sim = sequence_ratio(a["name"], b["name"])
                # Trigger if tokens overlap strongly OR char-sequence is very close
                if j_sim >= 0.67 or s_sim >= 0.85:
                    near_dupes_same.append((cid, a, b, max(j_sim, s_sim),
                                            f"jaccard={j_sim:.2f} seq={s_sim:.2f}"))
    near_dupes_same.sort(key=lambda x: -x[3])
    print(f"  Found: {len(near_dupes_same)}")
    for cid, a, b, sim, reason in near_dupes_same:
        print(f"    - [{cid}] '{a['name']}' [{a['category'][0]}]  <->  "
              f"'{b['name']}' [{b['category'][0]}]  ({reason})")
        issues += 1

    # --- 7. Near-duplicates ACROSS countries ---
    print(f"\n[6] NEAR-DUPLICATES across countries (weaker signal, review)")
    by_norm: dict[str, list] = defaultdict(list)
    for cid, lms in country_landmarks.items():
        for lm in lms:
            by_norm[normalize_name(lm["name"])].append(lm)
    cross_dupes = []
    for norm, lms in by_norm.items():
        # Same normalized name in different countries
        countries = {l["country_id"] for l in lms}
        if len(countries) > 1:
            cross_dupes.append((norm, lms))
    print(f"  Found: {len(cross_dupes)}")
    for norm, lms in cross_dupes:
        names = [f"{l['country_id']}/'{l['name']}'" for l in lms]
        print(f"    - '{norm}' appears in: {names}")
        warnings += 1

    # --- 8. Name red flags ---
    print(f"\n[7] NAME red flags (empty, too short, activity-like)")
    red_flags = []
    async for lm in db.landmarks.find(
        {"archived": {"$ne": True}},
        {"_id": 0, "landmark_id": 1, "name": 1},
    ):
        name = (lm.get("name") or "").strip()
        if not name:
            red_flags.append((lm["landmark_id"], "EMPTY"))
            continue
        if len(name) < 3:
            red_flags.append((lm["landmark_id"], f"TOO SHORT: '{name}'"))
            continue
        lower = name.lower()
        for pat in ACTIVITY_PATTERNS:
            if pat in lower and "sliding" not in lower:
                red_flags.append((lm["landmark_id"], f"ACTIVITY-LIKE: '{name}' (matches '{pat}')"))
                break
    print(f"  Found: {len(red_flags)}")
    for lid, msg in red_flags:
        print(f"    - {lid}: {msg}")
        warnings += 1

    # --- SUMMARY ---
    print("\n" + "=" * 60)
    print("SUMMARY")
    print("=" * 60)
    print(f"  Critical issues : {issues}")
    print(f"  Warnings        : {warnings}")
    if issues == 0 and warnings == 0:
        print("\n  STATUS: PRISTINE. Ready to ship.")
    elif issues == 0:
        print(f"\n  STATUS: Clean (with {warnings} soft warnings for manual review).")
    else:
        print(f"\n  STATUS: {issues} critical issue(s) need fixing.")

    client.close()
    return 0 if issues == 0 else 1


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))
