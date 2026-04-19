"""Auto-flag helper: content with 3+ pending reports gets temporarily hidden
from community discovery surfaces (highlight hero, top 10, trending, feed)
until an admin reviews the reports.
"""
from utils.db import db

AUTO_FLAG_THRESHOLD = 3


async def get_flagged_target_ids() -> set:
    """Return the set of target_ids (visit_id or user_created_visit_id) that
    currently have at least AUTO_FLAG_THRESHOLD pending photo reports.

    Reports with status 'resolved' or 'dismissed' no longer count — so once an
    admin handles the case, the content is either removed (owner notified) or
    the hide is lifted.
    """
    pipeline = [
        {"$match": {"report_type": "photo", "status": "pending"}},
        {"$group": {"_id": "$target_id", "count": {"$sum": 1}}},
        {"$match": {"count": {"$gte": AUTO_FLAG_THRESHOLD}}},
    ]
    docs = await db.reports.aggregate(pipeline).to_list(1000)
    return {d["_id"] for d in docs if d.get("_id")}
