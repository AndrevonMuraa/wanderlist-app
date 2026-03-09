"""Shared imports and utilities for social module routes."""
from fastapi import APIRouter, HTTPException, Depends, Request
from typing import List
import asyncio
import os
import logging
import uuid
from datetime import datetime, timezone, timedelta

from utils.db import db
from utils.auth import get_current_user, get_user_limits
from models.all import (
    User, UserPublic, Friend, FriendRequest, Message, MessageCreate,
    Activity, Comment, CommentCreate,
)
from utils.helpers import check_and_award_badges, create_notification

# Simple TTL cache for static reference data (countries + landmark stats)
_cache = {}
_CACHE_TTL = 300  # 5 minutes

__all__ = ["_get_static_geo_data", "_cache", "_CACHE_TTL",
    "APIRouter", "HTTPException", "Depends", "Request", "List",
    "asyncio", "os", "logging", "uuid", "datetime", "timezone", "timedelta",
    "db", "get_current_user", "get_user_limits",
    "User", "UserPublic", "Friend", "FriendRequest", "Message", "MessageCreate",
    "Activity", "Comment", "CommentCreate",
    "check_and_award_badges", "create_notification"]

async def _get_static_geo_data():
    """Cached countries list + landmark-per-country counts."""
    now = datetime.now(timezone.utc).timestamp()
    if "geo" in _cache and now - _cache["geo"]["ts"] < _CACHE_TTL:
        return _cache["geo"]["countries"], _cache["geo"]["lm_map"], _cache["geo"]["total_lm"]

    countries_task = db.countries.find({}, {"_id": 0, "country_id": 1, "name": 1, "continent": 1}).to_list(300)
    lm_pipeline = [{"$group": {"_id": "$country_id", "count": {"$sum": 1}, "landmark_ids": {"$push": "$landmark_id"}}}]
    lm_task = db.landmarks.aggregate(lm_pipeline).to_list(300)
    countries, lm_stats = await asyncio.gather(countries_task, lm_task)

    lm_map = {s["_id"]: s for s in lm_stats}
    total_lm = sum(s["count"] for s in lm_stats)
    _cache["geo"] = {"countries": countries, "lm_map": lm_map, "total_lm": total_lm, "ts": now}
    return countries, lm_map, total_lm
