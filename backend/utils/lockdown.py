"""Emergency Lockdown — break-glass kill switch for moderator/admin write actions.

When `system_flags.global.admin_lockdown == True`, the helpers in this module
raise HTTP 503 from any high-risk write endpoint that asserts on it.

Reads remain open so the operator can audit logs and decide what to do next.
Disabling the lockdown requires a fresh TOTP code from a super-admin — even
if a super-admin's password is compromised, the attacker cannot un-freeze
the system without their second factor.
"""
import os
from datetime import datetime, timezone
from fastapi import HTTPException
from motor.motor_asyncio import AsyncIOMotorClient

_client = AsyncIOMotorClient(os.environ["MONGO_URL"])
_db = _client[os.environ["DB_NAME"]]

LOCKDOWN_FLAG_ID = "global"


async def get_lockdown_state() -> dict:
    doc = await _db.system_flags.find_one({"_id": LOCKDOWN_FLAG_ID}, {"_id": 0})
    if not doc:
        return {"admin_lockdown": False}
    return doc


async def is_locked_down() -> bool:
    state = await get_lockdown_state()
    return bool(state.get("admin_lockdown"))


async def assert_not_locked_down() -> None:
    """Raise 503 if global admin lockdown is active.

    Inject as the FIRST awaitable inside any moderator/admin write endpoint:
        await assert_not_locked_down()
    """
    if await is_locked_down():
        raise HTTPException(
            status_code=503,
            detail={
                "admin_lockdown": True,
                "message": (
                    "All moderator/admin write actions are temporarily frozen. "
                    "Contact the super-admin to lift the lockdown."
                ),
            },
        )


async def set_lockdown(active: bool, admin_id: str, admin_name: str) -> dict:
    update = {
        "admin_lockdown": active,
    }
    if active:
        update["lockdown_started_at"] = datetime.now(timezone.utc)
        update["lockdown_started_by"] = admin_id
    else:
        update["lockdown_started_at"] = None
        update["lockdown_started_by"] = None
        update["lockdown_lifted_at"] = datetime.now(timezone.utc)
        update["lockdown_lifted_by"] = admin_id

    await _db.system_flags.update_one(
        {"_id": LOCKDOWN_FLAG_ID},
        {"$set": update},
        upsert=True,
    )
    await _db.admin_logs.insert_one({
        "log_id": f"log_lockdown_{int(datetime.now(timezone.utc).timestamp())}",
        "admin_id": admin_id,
        "admin_name": admin_name,
        "action": "lockdown_enabled" if active else "lockdown_disabled",
        "target_id": "system",
        "created_at": datetime.now(timezone.utc),
    })
    return await get_lockdown_state()
