"""
Admin widget summary — lightweight payload for the iOS Lock-Screen / Home-Screen
widget. Cached in-memory for 30s so a refresh storm from the WidgetKit timeline
provider can't pummel the DB.

Returned payload matches the App-Group `UserDefaults` JSON the widget extension
reads on its `getTimeline(...)` call (see `targets/wandermarkadminwidget/`).
"""
from __future__ import annotations

import time
from datetime import datetime, timezone
from typing import Any

from fastapi import APIRouter, Depends

from models.all import User
from utils.auth import get_admin_user
from utils.db import db

router = APIRouter()

_CACHE: dict[str, Any] = {"ts": 0.0, "payload": None}
_CACHE_TTL_S = 30.0


@router.get("/admin/widget/summary")
async def widget_summary(_: User = Depends(get_admin_user)) -> dict[str, Any]:
    """Tiny, denormalised, cached payload designed for the iOS widget."""
    now = time.monotonic()
    if _CACHE["payload"] is not None and (now - _CACHE["ts"]) < _CACHE_TTL_S:
        return _CACHE["payload"]

    pending_reports = await db.reports.count_documents({"status": "pending"})
    open_tickets = await db.support_tickets.count_documents({"status": "open"})

    cursor = db.admin_logs.find({}, {"_id": 0}).sort("created_at", -1).limit(3)
    log_rows = await cursor.to_list(length=3)

    # Resolve admin display names for the ticker (one batch lookup)
    ids = {r.get("admin_id") for r in log_rows if r.get("admin_id")}
    name_by_id: dict[str, str] = {}
    if ids:
        async for u in db.users.find(
            {"user_id": {"$in": list(ids)}},
            {"_id": 0, "user_id": 1, "username": 1, "name": 1},
        ):
            name_by_id[u["user_id"]] = u.get("username") or u.get("name") or u["user_id"][:8]

    recent: list[dict[str, Any]] = []
    for r in log_rows:
        ts = r.get("created_at")
        if isinstance(ts, datetime):
            if ts.tzinfo is None:
                ts = ts.replace(tzinfo=timezone.utc)
            ts_iso = ts.isoformat()
        else:
            ts_iso = None
        recent.append({
            "actor": name_by_id.get(r.get("admin_id"), ""),
            "action": (r.get("action") or "").replace("_", " "),
            "created_at": ts_iso,
        })

    payload = {
        "pending_reports": pending_reports,
        "open_tickets": open_tickets,
        "recent_actions": recent,
        "generated_at": datetime.now(timezone.utc).isoformat(),
    }
    _CACHE["payload"] = payload
    _CACHE["ts"] = now
    return payload
