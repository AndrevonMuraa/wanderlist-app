"""
Support Tickets — In-app reply/conversation with moderators.

When a user receives a moderator_message, they can open a ticket with a reply.
Moderators see tickets in admin inbox and reply back (creating moderator_message
notifications). Simple two-way thread; no external email required.
"""
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, Field
from datetime import datetime, timezone
from typing import Optional, List
import uuid
import os
from motor.motor_asyncio import AsyncIOMotorClient

from models.all import User
from utils.auth import get_current_user, get_admin_user
from utils.helpers import create_notification

router = APIRouter()
client = AsyncIOMotorClient(os.environ["MONGO_URL"])
db = client[os.environ["DB_NAME"]]


# ---------- Models ----------
class TicketCreate(BaseModel):
    subject: str = Field(..., min_length=1, max_length=200)
    message: str = Field(..., min_length=1, max_length=4000)
    related_notification_id: Optional[str] = None


class TicketReply(BaseModel):
    message: str = Field(..., min_length=1, max_length=4000)
    close_after: bool = False


# ---------- User endpoints ----------
@router.post("/support/tickets")
async def create_ticket(body: TicketCreate, current_user: User = Depends(get_current_user)):
    ticket_id = f"ticket_{uuid.uuid4().hex[:12]}"
    now = datetime.now(timezone.utc)
    first_msg = {
        "message_id": f"msg_{uuid.uuid4().hex[:10]}",
        "from_user_id": current_user.user_id,
        "from_name": current_user.name,
        "from_role": "user",
        "body": body.message,
        "created_at": now,
    }
    ticket = {
        "ticket_id": ticket_id,
        "user_id": current_user.user_id,
        "user_name": current_user.name,
        "user_email": current_user.email,
        "subject": body.subject,
        "status": "open",
        "related_notification_id": body.related_notification_id,
        "messages": [first_msg],
        "created_at": now,
        "updated_at": now,
        "last_message_from": "user",
        "unread_for_mods": True,
        "unread_for_user": False,
    }
    await db.support_tickets.insert_one(ticket)
    return {"ticket_id": ticket_id, "status": "open"}


@router.get("/support/tickets")
async def list_my_tickets(current_user: User = Depends(get_current_user)):
    tickets = await db.support_tickets.find(
        {"user_id": current_user.user_id},
        {"_id": 0},
    ).sort("updated_at", -1).limit(100).to_list(100)
    return {"tickets": tickets}


@router.get("/support/tickets/{ticket_id}")
async def get_my_ticket(ticket_id: str, current_user: User = Depends(get_current_user)):
    ticket = await db.support_tickets.find_one(
        {"ticket_id": ticket_id, "user_id": current_user.user_id},
        {"_id": 0},
    )
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    if ticket.get("unread_for_user"):
        await db.support_tickets.update_one({"ticket_id": ticket_id}, {"$set": {"unread_for_user": False}})
    return ticket


# ---------- Admin endpoints ----------
@router.get("/admin/tickets")
async def admin_list_tickets(
    status: Optional[str] = None,
    admin_user: User = Depends(get_admin_user),
):
    q = {}
    if status in ("open", "closed"):
        q["status"] = status
    tickets = await db.support_tickets.find(q, {"_id": 0}).sort("updated_at", -1).limit(200).to_list(200)
    unread_count = await db.support_tickets.count_documents({"status": "open", "unread_for_mods": True})
    return {"tickets": tickets, "unread_count": unread_count}


@router.get("/admin/tickets/{ticket_id}")
async def admin_get_ticket(ticket_id: str, admin_user: User = Depends(get_admin_user)):
    ticket = await db.support_tickets.find_one({"ticket_id": ticket_id}, {"_id": 0})
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    if ticket.get("unread_for_mods"):
        await db.support_tickets.update_one({"ticket_id": ticket_id}, {"$set": {"unread_for_mods": False}})
    return ticket


@router.post("/admin/tickets/{ticket_id}/reply")
async def admin_reply(ticket_id: str, body: TicketReply, admin_user: User = Depends(get_admin_user)):
    ticket = await db.support_tickets.find_one({"ticket_id": ticket_id})
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    if ticket["status"] == "closed" and not body.close_after:
        # Re-open automatically on reply
        pass
    now = datetime.now(timezone.utc)
    msg = {
        "message_id": f"msg_{uuid.uuid4().hex[:10]}",
        "from_user_id": admin_user.user_id,
        "from_name": admin_user.name,
        "from_role": "moderator",
        "body": body.message,
        "created_at": now,
    }
    update = {
        "$push": {"messages": msg},
        "$set": {
            "updated_at": now,
            "last_message_from": "moderator",
            "unread_for_user": True,
            "unread_for_mods": False,
            "status": "closed" if body.close_after else "open",
        },
    }
    await db.support_tickets.update_one({"ticket_id": ticket_id}, update)
    # Notify the user
    await create_notification(
        user_id=ticket["user_id"],
        notif_type="moderator_message",
        title=f"Re: {ticket['subject']}",
        message=body.message,
        related_id=ticket_id,
        related_user_id=admin_user.user_id,
        related_user_name=admin_user.name,
    )
    # Audit
    await db.admin_logs.insert_one({
        "log_id": f"log_{uuid.uuid4().hex[:10]}",
        "action": "ticket_reply",
        "ticket_id": ticket_id,
        "admin_user_id": admin_user.user_id,
        "admin_user_name": admin_user.name,
        "closed": body.close_after,
        "created_at": now,
    })
    return {"ticket_id": ticket_id, "status": "closed" if body.close_after else "open"}


@router.post("/admin/tickets/{ticket_id}/close")
async def admin_close_ticket(ticket_id: str, admin_user: User = Depends(get_admin_user)):
    res = await db.support_tickets.update_one(
        {"ticket_id": ticket_id},
        {"$set": {"status": "closed", "updated_at": datetime.now(timezone.utc), "unread_for_mods": False}},
    )
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="Ticket not found")
    return {"ticket_id": ticket_id, "status": "closed"}
