from fastapi import APIRouter, HTTPException, Depends, Request, Response, Cookie, Body
from fastapi.responses import HTMLResponse
from typing import List, Optional
import os
import logging
import uuid
from datetime import datetime, timezone, timedelta

from utils.db import db
from utils.auth import get_current_user, is_user_pro
from models.all import User, BucketListCreate, Collection, CollectionCreate


router = APIRouter()

# ============= BUCKET LIST ENDPOINTS =============

@router.get("/bucket-list")
async def get_bucket_list(current_user: User = Depends(get_current_user)):
    """Get user's bucket list with full landmark details"""
    bucket_items = await db.bucket_list.find(
        {"user_id": current_user.user_id}, {"_id": 0}
    ).sort("added_at", -1).to_list(1000)
    
    # Get full landmark details
    landmark_ids = [item["landmark_id"] for item in bucket_items]
    landmarks = await db.landmarks.find(
        {"landmark_id": {"$in": landmark_ids}}, {"_id": 0}
    ).to_list(1000)
    
    # Create lookup dictionary
    landmarks_dict = {lm["landmark_id"]: lm for lm in landmarks}
    
    # Combine bucket list items with landmark details
    result = []
    for item in bucket_items:
        landmark = landmarks_dict.get(item["landmark_id"])
        if landmark:
            result.append({
                "bucket_list_id": item["bucket_list_id"],
                "added_at": item["added_at"],
                "notes": item.get("notes"),
                "landmark": landmark
            })
    
    return result

@router.post("/bucket-list")
async def add_to_bucket_list(data: BucketListCreate, current_user: User = Depends(get_current_user)):
    """Add a landmark to bucket list"""
    # Check if already in bucket list
    existing = await db.bucket_list.find_one({
        "user_id": current_user.user_id,
        "landmark_id": data.landmark_id
    })
    
    if existing:
        raise HTTPException(status_code=400, detail="Landmark already in bucket list")
    
    # Verify landmark exists
    landmark = await db.landmarks.find_one({"landmark_id": data.landmark_id})
    if not landmark:
        raise HTTPException(status_code=404, detail="Landmark not found")
    
    # Create bucket list item
    bucket_list_id = f"bucket_{uuid.uuid4().hex[:12]}"
    bucket_item = {
        "bucket_list_id": bucket_list_id,
        "user_id": current_user.user_id,
        "landmark_id": data.landmark_id,
        "added_at": datetime.now(timezone.utc),
        "notes": data.notes
    }
    
    await db.bucket_list.insert_one(bucket_item)
    
    bucket_item.pop("_id", None)
    return bucket_item

@router.delete("/bucket-list/{bucket_list_id}")
async def remove_from_bucket_list(bucket_list_id: str, current_user: User = Depends(get_current_user)):
    """Remove a landmark from bucket list"""
    result = await db.bucket_list.delete_one({
        "bucket_list_id": bucket_list_id,
        "user_id": current_user.user_id
    })
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Bucket list item not found")
    
    return {"message": "Removed from bucket list"}

@router.get("/bucket-list/check/{landmark_id}")
async def check_in_bucket_list(landmark_id: str, current_user: User = Depends(get_current_user)):
    """Check if a landmark is in user's bucket list"""
    item = await db.bucket_list.find_one({
        "user_id": current_user.user_id,
        "landmark_id": landmark_id
    })
    
    return {"in_bucket_list": item is not None, "bucket_list_id": item.get("bucket_list_id") if item else None}

# ============= END BUCKET LIST ENDPOINTS =============

# ============= CUSTOM COLLECTIONS ENDPOINTS (PREMIUM FEATURE) =============

@router.get("/collections")
async def get_user_collections(current_user: User = Depends(get_current_user)):
    """Get user's custom collections"""
    collections = await db.collections.find(
        {"user_id": current_user.user_id}, 
        {"_id": 0}
    ).sort("created_at", -1).to_list(1000)
    
    # Get landmark count for each collection
    result = []
    for collection in collections:
        count = await db.collection_items.count_documents({"collection_id": collection["collection_id"]})
        collection["landmark_count"] = count
        result.append(Collection(**collection))
    
    return result

@router.post("/collections")
async def create_collection(data: CollectionCreate, current_user: User = Depends(get_current_user)):
    """Create a new custom collection"""
    collection_id = f"collection_{uuid.uuid4().hex[:12]}"
    
    collection = {
        "collection_id": collection_id,
        "user_id": current_user.user_id,
        "name": data.name,
        "description": data.description,
        "icon": data.icon or "star",
        "color": data.color or "#20B2AA",
        "created_at": datetime.now(timezone.utc),
        "updated_at": datetime.now(timezone.utc)
    }
    
    await db.collections.insert_one(collection)
    collection["landmark_count"] = 0
    
    return Collection(**collection)

@router.delete("/collections/{collection_id}")
async def delete_collection(collection_id: str, current_user: User = Depends(get_current_user)):
    """Delete a collection"""
    # Verify ownership
    collection = await db.collections.find_one({"collection_id": collection_id, "user_id": current_user.user_id})
    if not collection:
        raise HTTPException(status_code=404, detail="Collection not found")
    
    # Delete collection and all its items
    await db.collections.delete_one({"collection_id": collection_id})
    await db.collection_items.delete_many({"collection_id": collection_id})
    
    return {"message": "Collection deleted successfully"}

@router.post("/collections/{collection_id}/landmarks")
async def add_landmark_to_collection(
    collection_id: str, 
    landmark_id: str,
    current_user: User = Depends(get_current_user)
):
    """Add a landmark to a collection"""
    # Verify collection ownership
    collection = await db.collections.find_one({"collection_id": collection_id, "user_id": current_user.user_id})
    if not collection:
        raise HTTPException(status_code=404, detail="Collection not found")
    
    # Check if landmark exists
    landmark = await db.landmarks.find_one({"landmark_id": landmark_id}, {"_id": 0})
    if not landmark:
        raise HTTPException(status_code=404, detail="Landmark not found")
    
    # Check if already in collection
    exists = await db.collection_items.find_one({
        "collection_id": collection_id,
        "landmark_id": landmark_id
    })
    if exists:
        raise HTTPException(status_code=400, detail="Landmark already in collection")
    
    # Add to collection
    item_id = f"item_{uuid.uuid4().hex[:12]}"
    item = {
        "item_id": item_id,
        "collection_id": collection_id,
        "user_id": current_user.user_id,
        "landmark_id": landmark_id,
        "added_at": datetime.now(timezone.utc)
    }
    
    await db.collection_items.insert_one(item)
    
    # Update collection updated_at
    await db.collections.update_one(
        {"collection_id": collection_id},
        {"$set": {"updated_at": datetime.now(timezone.utc)}}
    )
    
    return {"message": "Landmark added to collection", "item_id": item_id}

@router.get("/collections/{collection_id}/landmarks")
async def get_collection_landmarks(collection_id: str, current_user: User = Depends(get_current_user)):
    """Get all landmarks in a collection"""
    # Verify ownership
    collection = await db.collections.find_one({"collection_id": collection_id, "user_id": current_user.user_id})
    if not collection:
        raise HTTPException(status_code=404, detail="Collection not found")
    
    # Get items
    items = await db.collection_items.find({"collection_id": collection_id}, {"_id": 0}).to_list(1000)
    
    # Get full landmark details
    landmark_ids = [item["landmark_id"] for item in items]
    landmarks = await db.landmarks.find({"landmark_id": {"$in": landmark_ids}}, {"_id": 0}).to_list(1000)
    
    # Add is_locked flag based on user tier
    results = []
    for landmark in landmarks:
        landmark_dict = dict(landmark)
        if current_user.subscription_tier == "free" and landmark_dict.get("category") == "premium":
            landmark_dict["is_locked"] = True
        else:
            landmark_dict["is_locked"] = False
        results.append(Landmark(**landmark_dict))
    
    return results

@router.delete("/collections/{collection_id}/landmarks/{landmark_id}")
async def remove_landmark_from_collection(
    collection_id: str,
    landmark_id: str,
    current_user: User = Depends(get_current_user)
):
    """Remove a landmark from a collection"""
    result = await db.collection_items.delete_one({
        "collection_id": collection_id,
        "landmark_id": landmark_id,
        "user_id": current_user.user_id
    })
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Item not found in collection")
    
    # Update collection updated_at
    await db.collections.update_one(
        {"collection_id": collection_id},
        {"$set": {"updated_at": datetime.now(timezone.utc)}}
    )
    
    return {"message": "Landmark removed from collection"}

# ============= END CUSTOM COLLECTIONS ENDPOINTS =============
