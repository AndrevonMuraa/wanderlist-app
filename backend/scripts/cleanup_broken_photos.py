"""One-shot CLI to scan & repair broken photo URLs in the database.

Run from /app/backend:
    python -m scripts.cleanup_broken_photos              # dry-run report
    python -m scripts.cleanup_broken_photos --apply      # actually remove broken URLs

Equivalent to the admin endpoints but bypasses HTTP auth — useful for
production Render shells where you can't easily POST as an admin.
"""
from __future__ import annotations

import argparse
import asyncio
import sys
from pathlib import Path

# Ensure the backend root is importable when run via `python -m scripts....`
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from routes.photo_health import _collect_all_urls  # noqa: E402
from utils.photo_health import check_urls  # noqa: E402
from utils.db import db  # noqa: E402
from utils.helpers import recalculate_user_points  # noqa: E402


async def run(apply: bool) -> int:
    by_collection = await _collect_all_urls()
    all_urls = set().union(*by_collection.values()) if by_collection else set()
    print(f"Scanning {len(all_urls)} distinct photo URLs across {len(by_collection)} collections…")
    broken = await check_urls(all_urls)
    print(f"\n→ Broken URLs: {len(broken)}")
    for u in sorted(broken):
        print(f"  ✗ {u}")
    if not broken:
        print("\n✔ Nothing to repair.")
        return 0

    if not apply:
        print("\nDry-run only. Re-run with --apply to actually remove these URLs.")
        return 0

    print("\nApplying repair…")

    affected_user_ids: set[str] = set()
    verified_revoked = 0

    affected_visits = await db.visits.find(
        {"photos": {"$in": list(broken)}},
        {"_id": 0, "visit_id": 1, "user_id": 1, "photos": 1, "photo_base64": 1, "verified": 1},
    ).to_list(None)
    for v in affected_visits:
        clean = [p for p in (v.get("photos") or []) if p not in broken]
        update = {"photos": clean}
        if not clean and not v.get("photo_base64") and v.get("verified"):
            update["verified"] = False
            verified_revoked += 1
        await db.visits.update_one({"visit_id": v["visit_id"]}, {"$set": update})
        if v.get("user_id"):
            affected_user_ids.add(v["user_id"])

    cv_affected = await db.user_created_visits.find(
        {"$or": [{"photos": {"$in": list(broken)}}, {"photo_url": {"$in": list(broken)}}]},
        {"_id": 0, "user_created_visit_id": 1, "user_id": 1, "photos": 1, "photo_url": 1},
    ).to_list(None)
    for v in cv_affected:
        update = {}
        if v.get("photos"):
            clean = [p for p in v["photos"] if p not in broken]
            if len(clean) != len(v["photos"]):
                update["photos"] = clean
        if v.get("photo_url") in broken:
            update["photo_url"] = None
        if update:
            await db.user_created_visits.update_one(
                {"user_created_visit_id": v["user_created_visit_id"]}, {"$set": update}
            )
            if v.get("user_id"):
                affected_user_ids.add(v["user_id"])

    cy_affected = await db.country_visits.find(
        {"photos": {"$in": list(broken)}},
        {"_id": 0, "country_visit_id": 1, "user_id": 1, "photos": 1},
    ).to_list(None)
    for v in cy_affected:
        clean = [p for p in (v.get("photos") or []) if p not in broken]
        if len(clean) != len(v.get("photos") or []):
            await db.country_visits.update_one(
                {"country_visit_id": v["country_visit_id"]}, {"$set": {"photos": clean}}
            )
            if v.get("user_id"):
                affected_user_ids.add(v["user_id"])

    lm = await db.landmarks.update_many(
        {"image_url": {"$in": list(broken)}}, {"$set": {"image_url": ""}}
    )
    us = await db.users.update_many(
        {"photo_url": {"$in": list(broken)}}, {"$set": {"photo_url": ""}}
    )

    for uid in affected_user_ids:
        await recalculate_user_points(uid)

    print(f"  ✔ visits patched: {len(affected_visits)}")
    print(f"  ✔ user_created_visits patched: {len(cv_affected)}")
    print(f"  ✔ country_visits patched: {len(cy_affected)}")
    print(f"  ✔ landmarks.image_url cleared: {lm.modified_count}")
    print(f"  ✔ users.photo_url cleared: {us.modified_count}")
    print(f"  ✔ verified revoked on visits: {verified_revoked}")
    print(f"  ✔ users recomputed: {len(affected_user_ids)}")
    return 0


def main():
    p = argparse.ArgumentParser()
    p.add_argument("--apply", action="store_true", help="Actually delete broken URLs from DB")
    args = p.parse_args()
    sys.exit(asyncio.run(run(apply=args.apply)))


if __name__ == "__main__":
    main()
