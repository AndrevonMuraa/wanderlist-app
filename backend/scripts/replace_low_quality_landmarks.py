"""Replace 7 low-quality tourist-facility landmarks with authentic ones,
plus rename 3 landmarks that have real places but activity-suffixed names.

Changes preserve 10 official + 5 premium counts for each affected country.

SAFETY:
  - Visit-count check before delete. Archive instead if visits exist.
  - Unique landmark_id generation (suffix scheme).
  - Dry-run by default. Pass --apply to execute.

Run via Render Shell:
    cd scripts && python3 replace_low_quality_landmarks.py
    cd scripts && python3 replace_low_quality_landmarks.py --apply
"""
import asyncio
import os
import sys
from datetime import datetime, timezone
from motor.motor_asyncio import AsyncIOMotorClient


# 7 DELETE + INSERT pairs. Each preserves the country's 10o/5p split.
REPLACEMENTS = [
    {
        "country_id": "senegal",
        "country_name": "Senegal",
        "continent": "Africa",
        "delete_name": "Saly Beach Resort",
        "delete_category": "official",
        "insert": {
            "_base_id": "senegal_ile_de_madeleine",
            "name": "Île de Madeleine National Park",
            "category": "official",
            "points": 10,
            "description": "Small volcanic island national park off Dakar with dramatic cliffs, unique baobabs, and seabird colonies.",
        },
    },
    {
        "country_id": "lesotho",
        "country_name": "Lesotho",
        "continent": "Africa",
        "delete_name": "Afriski Mountain Resort",
        "delete_category": "official",
        "insert": {
            "_base_id": "lesotho_mohale_dam",
            "name": "Mohale Dam",
            "category": "official",
            "points": 10,
            "description": "Soaring rockfill dam in the Maloti Mountains, part of the Lesotho Highlands Water Project.",
        },
    },
    {
        "country_id": "cape_verde",
        "country_name": "Cape Verde",
        "continent": "Africa",
        "delete_name": "Santo Antao Hiking Trails",
        "delete_category": "official",
        "insert": {
            "_base_id": "cape_verde_tope_de_coroa",
            "name": "Tope de Coroa",
            "category": "official",
            "points": 10,
            "description": "Highest peak on Santo Antão (1,979m), an ancient shield volcano summit with panoramic Atlantic views.",
        },
    },
    {
        "country_id": "uzbekistan",
        "country_name": "Uzbekistan",
        "continent": "Asia",
        "delete_name": "Chimgan Mountain Resort",
        "delete_category": "premium",
        "insert": {
            "_base_id": "uzbekistan_shakhrisabz_historic_center",
            "name": "Shakhrisabz Historic Center",
            "category": "premium",
            "points": 25,
            "description": "UNESCO-listed birthplace of Tamerlane, featuring the ruins of the colossal Ak-Saray Palace.",
        },
    },
    {
        "country_id": "papua_new_guinea",
        "country_name": "Papua New Guinea",
        "continent": "Oceania",
        "delete_name": "Karawari River Lodge",
        "delete_category": "premium",
        "insert": {
            "_base_id": "papua_new_guinea_mount_hagen",
            "name": "Mount Hagen",
            "category": "premium",
            "points": 25,
            "description": "Highland town famed for its annual Sing-Sing cultural gathering where tribes showcase traditional dress.",
        },
    },
    {
        "country_id": "ecuador",
        "country_name": "Ecuador",
        "continent": "Americas",
        "delete_name": "Amazon Yasuni Lodge",
        "delete_category": "premium",
        "insert": {
            "_base_id": "ecuador_la_compania_church",
            "name": "La Compañía de Jesús Church",
            "category": "premium",
            "points": 25,
            "description": "Jesuit Baroque church in Quito considered the most beautiful in the Americas, with a fully gilded interior.",
        },
    },
    {
        "country_id": "rwanda",
        "country_name": "Rwanda",
        "continent": "Africa",
        "delete_name": "Nyiragongo Volcano Hike",
        "delete_category": "premium",
        "insert": {
            "_base_id": "rwanda_mount_karisimbi",
            "name": "Mount Karisimbi",
            "category": "premium",
            "points": 25,
            "description": "Highest peak in Rwanda (4,507m) — a massive dormant volcano in the Virunga range, home to mountain gorillas.",
        },
    },
]

# 3 pure RENAMES (same landmark, strip activity word)
RENAMES = [
    {
        "country_id": "palau",
        "old_name": "Blue Corner Wall Dive",
        "new_name": "Blue Corner Wall",
    },
    {
        "country_id": "hungary",
        "old_name": "Lillafured Palace Hotel",
        "new_name": "Lillafüred Palace",
    },
    {
        "country_id": "cambodia",
        "old_name": "Cardamom Mountains Trek",
        "new_name": "Cardamom Mountains",
    },
]


async def unique_id(db, base: str) -> str:
    lid = base
    suffix = 2
    while await db.landmarks.find_one({"landmark_id": lid}, {"_id": 1}):
        lid = f"{base}_v{suffix}"
        suffix += 1
    return lid


async def run(apply: bool):
    client = AsyncIOMotorClient(os.environ["MONGO_URL"])
    db = client[os.environ.get("DB_NAME", "wandermark")]

    print("=" * 60)
    print(f"Low-quality landmark cleanup — {'APPLY' if apply else 'DRY-RUN'}")
    print("=" * 60)

    now = datetime.now(timezone.utc).isoformat()

    # ---------- PART 1: RENAMES ----------
    print("\n[1] RENAMES (preserves all visits)")
    for r in RENAMES:
        doc = await db.landmarks.find_one(
            {"country_id": r["country_id"], "name": r["old_name"]},
            {"_id": 0, "landmark_id": 1},
        )
        if not doc:
            print(f"  SKIP  {r['country_id']} / '{r['old_name']}' — not found")
            continue
        if apply:
            await db.landmarks.update_one(
                {"landmark_id": doc["landmark_id"]},
                {"$set": {"name": r["new_name"]}},
            )
        print(f"  RENAME  [{r['country_id']}] '{r['old_name']}' -> '{r['new_name']}'")

    # ---------- PART 2: REPLACEMENTS ----------
    print("\n[2] REPLACEMENTS (delete low-quality + insert authentic)")
    for rep in REPLACEMENTS:
        print(f"\n=== {rep['country_id']} ===")
        target = await db.landmarks.find_one(
            {"country_id": rep["country_id"], "name": rep["delete_name"]},
            {"_id": 0, "landmark_id": 1, "category": 1},
        )
        if not target:
            print(f"  SKIP DELETE — '{rep['delete_name']}' not found")
        else:
            visits = await db.visits.count_documents({"landmark_id": target["landmark_id"]})
            print(f"  Delete: {target['landmark_id']}  '{rep['delete_name']}'  "
                  f"[{target['category']}]  visits={visits}")
            if visits > 0:
                if apply:
                    await db.landmarks.update_one(
                        {"landmark_id": target["landmark_id"]},
                        {"$set": {"archived": True, "archived_at": now}},
                    )
                print(f"  -> ARCHIVE (visits exist)")
            else:
                if apply:
                    await db.landmarks.delete_one({"landmark_id": target["landmark_id"]})
                print(f"  -> DELETE (zero visits)")

        ins = rep["insert"]
        existing = await db.landmarks.find_one(
            {"country_id": rep["country_id"], "name": ins["name"]}, {"_id": 1}
        )
        if existing:
            print(f"  SKIP INSERT — '{ins['name']}' already exists")
            continue
        base = ins["_base_id"]
        new_id = await unique_id(db, base) if apply else base
        doc = {
            "landmark_id": new_id,
            "country_id": rep["country_id"],
            "country_name": rep["country_name"],
            "continent": rep["continent"],
            "name": ins["name"],
            "description": ins["description"],
            "category": ins["category"],
            "points": ins["points"],
            "difficulty": "Moderate" if ins["category"] == "premium" else "Easy",
            "best_time_to_visit": "Year-round",
            "duration": "Half day" if ins["category"] == "premium" else "2-3 hours",
            "image_url": "",
            "images": [],
            "upvotes": 0,
            "created_by": None,
            "created_at": now,
            "facts": [{"text": "Worth 25 points!", "icon": "star-outline"}]
                     if ins["category"] == "premium" else [],
            "latitude": None,
            "longitude": None,
        }
        if apply:
            await db.landmarks.insert_one(doc)
        print(f"  Insert: {new_id}  '{ins['name']}'  [{ins['category']}]")

    # ---------- VERIFY ----------
    print("\n" + "=" * 60)
    print("FINAL STATE")
    print("=" * 60)
    affected = sorted({r["country_id"] for r in REPLACEMENTS} |
                      {r["country_id"] for r in RENAMES})
    all_good = True
    for cid in affected:
        o = await db.landmarks.count_documents(
            {"country_id": cid, "category": "official", "archived": {"$ne": True}}
        )
        p = await db.landmarks.count_documents(
            {"country_id": cid, "category": "premium", "archived": {"$ne": True}}
        )
        status = "OK" if (o == 10 and p == 5) else "WRONG"
        if status != "OK":
            all_good = False
        print(f"  {cid:25} {o}o + {p}p = {o + p}  [{status}]")

    total = await db.landmarks.count_documents({"archived": {"$ne": True}})
    print(f"\n  Active landmarks: {total}  (expected 1500)")

    print("\n" + ("APPLIED." if apply else "DRY RUN — re-run with --apply to execute."))
    print("Then run: python3 db_quality_check.py")

    client.close()
    return 0 if all_good else 1


if __name__ == "__main__":
    sys.exit(asyncio.run(run("--apply" in sys.argv)))
