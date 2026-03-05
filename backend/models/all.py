from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime


class User(BaseModel):
    user_id: str
    email: str
    username: Optional[str] = None
    name: str
    picture: Optional[str] = None
    bio: Optional[str] = None
    location: Optional[str] = None
    is_premium: bool = False
    subscription_tier: str = "free"
    subscription_expires_at: Optional[datetime] = None
    password_hash: Optional[str] = None
    current_streak: int = 0
    longest_streak: int = 0
    last_visit_date: Optional[str] = None
    default_privacy: str = "public"
    comment_permission: str = "everyone"
    role: str = "user"
    is_banned: bool = False
    banned_at: Optional[datetime] = None
    ban_reason: Optional[str] = None
    created_at: datetime


class UserPublic(BaseModel):
    user_id: str
    username: Optional[str] = None
    name: str
    picture: Optional[str] = None
    bio: Optional[str] = None
    location: Optional[str] = None
    banner_image: Optional[str] = None
    is_premium: bool = False
    subscription_tier: str = "free"
    default_privacy: str = "public"
    comment_permission: str = "everyone"
    role: str = "user"


class ProfileUpdate(BaseModel):
    name: Optional[str] = None
    username: Optional[str] = None
    picture: Optional[str] = None
    bio: Optional[str] = None
    location: Optional[str] = None
    banner_image: Optional[str] = None


class RegisterRequest(BaseModel):
    email: str
    username: str
    password: str
    name: str


class LoginRequest(BaseModel):
    email: str
    password: str


class GoogleTokenRequest(BaseModel):
    email: str
    name: str
    picture: Optional[str] = None
    google_id: str


class MagicLinkRequest(BaseModel):
    email: str


class MagicLinkVerifyRequest(BaseModel):
    email: str
    code: str


class SessionDataResponse(BaseModel):
    user_id: str
    email: str
    name: str
    picture: Optional[str] = None
    session_token: str


class Country(BaseModel):
    country_id: str
    name: str
    continent: str
    image_url: Optional[str] = None
    landmark_count: int = 0
    total_points: int = 0


class LandmarkFact(BaseModel):
    title: Optional[str] = None
    text: str
    icon: str


class Landmark(BaseModel):
    landmark_id: str
    name: str
    country_id: str
    country_name: str
    continent: str
    description: str
    category: str
    image_url: Optional[str] = None
    images: Optional[List[str]] = []
    facts: Optional[List[LandmarkFact]] = []
    best_time_to_visit: Optional[str] = "Year-round"
    duration: Optional[str] = "2-3 hours"
    difficulty: Optional[str] = "Easy"
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    points: int = 10
    upvotes: int = 0
    created_by: Optional[str] = None
    created_at: datetime
    is_locked: bool = False
    is_visited: bool = False


class LandmarkCreate(BaseModel):
    name: str
    country_id: str
    description: str
    image_url: str


class Visit(BaseModel):
    visit_id: str
    user_id: str
    landmark_id: str
    landmark_name: Optional[str] = None
    country_name: Optional[str] = None
    photo_base64: Optional[str] = None
    photos: Optional[List[str]] = []
    points_earned: int = 10
    comments: Optional[str] = None
    visit_location: Optional[dict] = None
    diary_notes: Optional[str] = None
    status: str = "accepted"
    verified: bool = True
    visibility: str = "public"
    visited_at: datetime
    created_at: datetime


class VisitCreate(BaseModel):
    landmark_id: str
    photo_base64: Optional[str] = None
    photos: Optional[List[str]] = []
    comments: Optional[str] = None
    visit_location: Optional[dict] = None
    diary_notes: Optional[str] = None
    visibility: Optional[str] = None
    visited_at: Optional[datetime] = None
    share_diary: Optional[bool] = True


class Friend(BaseModel):
    friendship_id: str
    user_id: str
    friend_id: str
    status: str
    created_at: datetime


class FriendRequest(BaseModel):
    friend_username: str


class Message(BaseModel):
    message_id: str
    sender_id: str
    receiver_id: str
    content: str
    image_base64: Optional[str] = None
    created_at: datetime
    read: bool = False


class MessageCreate(BaseModel):
    receiver_id: str
    content: str
    image_base64: Optional[str] = None


class Activity(BaseModel):
    activity_id: str
    user_id: str
    user_name: str
    user_picture: Optional[str] = None
    activity_type: str
    landmark_id: Optional[str] = None
    landmark_name: Optional[str] = None
    landmark_image: Optional[str] = None
    country_id: Optional[str] = None
    country_name: Optional[str] = None
    continent: Optional[str] = None
    countries_count: Optional[int] = None
    landmarks_count: Optional[int] = None
    points_earned: Optional[int] = None
    milestone_count: Optional[int] = None
    visit_id: Optional[str] = None
    has_diary: Optional[bool] = False
    has_photos: Optional[bool] = False
    photo_count: Optional[int] = 0
    photo_url: Optional[str] = None
    visibility: Optional[str] = "public"
    created_at: datetime
    likes_count: int = 0
    comments_count: int = 0
    is_liked: bool = False


class Like(BaseModel):
    like_id: str
    user_id: str
    activity_id: str
    created_at: datetime


class Comment(BaseModel):
    comment_id: str
    activity_id: str
    user_id: str
    user_name: str
    user_picture: Optional[str] = None
    content: str
    parent_comment_id: Optional[str] = None
    reply_to_user: Optional[str] = None
    created_at: datetime
    likes_count: int = 0
    is_liked: bool = False


class CommentCreate(BaseModel):
    content: str
    parent_comment_id: Optional[str] = None


class Report(BaseModel):
    report_id: str
    reporter_id: str
    report_type: str
    target_id: str
    target_name: Optional[str] = None
    reason: str
    status: str = "pending"
    admin_notes: Optional[str] = None
    created_at: datetime
    reviewed_at: Optional[datetime] = None


class ReportCreate(BaseModel):
    report_type: str
    target_id: str
    reason: str
    target_name: Optional[str] = None


class BucketListItem(BaseModel):
    bucket_list_id: str
    user_id: str
    landmark_id: str
    added_at: datetime
    notes: Optional[str] = None


class BucketListCreate(BaseModel):
    landmark_id: str
    notes: Optional[str] = None


class LandmarkEntry(BaseModel):
    name: str
    photo: Optional[str] = None


class UserCreatedVisit(BaseModel):
    user_created_visit_id: str
    user_id: str
    user_name: str
    user_picture: Optional[str] = None
    country_name: str
    landmarks: List[dict] = []
    photos: List[str] = []
    diary: Optional[str] = None
    visibility: str = "public"
    visited_at: datetime
    created_at: datetime


class UserCreatedVisitCreate(BaseModel):
    country_name: str
    landmarks: List[dict] = []
    photos: List[str] = []
    diary_notes: Optional[str] = None
    visibility: Optional[str] = "public"
    visited_at: Optional[str] = None


class CountryVisit(BaseModel):
    country_visit_id: str
    user_id: str
    user_name: str
    user_picture: Optional[str] = None
    country_name: str
    continent: str
    photos: List[str] = []
    diary: Optional[str] = None
    visited_at: datetime
    points_earned: int = 15
    created_at: datetime


class CountryVisitCreate(BaseModel):
    country_id: str
    photos: List[str] = []
    diary_notes: Optional[str] = None
    visibility: Optional[str] = "public"
    visited_at: Optional[str] = None


class Notification(BaseModel):
    notification_id: str
    user_id: str
    type: str
    title: str
    message: str
    related_id: Optional[str] = None
    related_user_id: Optional[str] = None
    related_user_name: Optional[str] = None
    is_read: bool = False
    created_at: datetime


class NotificationCreate(BaseModel):
    user_id: str
    type: str
    title: str
    message: str
    related_id: Optional[str] = None
    related_user_id: Optional[str] = None
    related_user_name: Optional[str] = None


class PushTokenCreate(BaseModel):
    push_token: str


class PushNotificationSend(BaseModel):
    user_id: str
    title: str
    body: str
    data: Optional[dict] = None


class LeaderboardEntry(BaseModel):
    user_id: str
    name: str
    picture: Optional[str] = None
    total_points: int
    rank: int


class Achievement(BaseModel):
    achievement_id: str
    user_id: str
    badge_type: str
    badge_name: str
    badge_description: str
    badge_icon: str
    earned_at: datetime
    is_featured: bool = False


class Badge(BaseModel):
    badge_id: str
    name: str
    description: str
    icon: str
    tier_required: str
    created_at: datetime


class UserBadge(BaseModel):
    user_badge_id: str
    user_id: str
    badge_id: str
    earned_at: datetime
    progress: str


class UserStreak(BaseModel):
    user_id: str
    current_streak: int = 0
    longest_streak: int = 0
    last_visit_date: Optional[datetime] = None


class UserLevel(BaseModel):
    user_id: str
    level: int = 1
    level_name: str = "Bronze Traveler"
    total_points: int = 0
    visits_count: int = 0
    countries_count: int = 0
    continents_count: int = 0


class Challenge(BaseModel):
    challenge_id: str
    title: str
    description: str
    challenge_type: str
    target_count: int
    target_landmarks: List[str]
    reward_points: int
    start_date: datetime
    end_date: datetime
    is_active: bool = True


class UserChallenge(BaseModel):
    user_id: str
    challenge_id: str
    progress: int = 0
    completed: bool = False
    completed_at: Optional[datetime] = None


class ActivityFeed(BaseModel):
    activity_id: str
    user_id: str
    username: str
    user_name: str
    user_picture: Optional[str] = None
    activity_type: str
    landmark_id: Optional[str] = None
    landmark_name: Optional[str] = None
    landmark_image: Optional[str] = None
    achievement_badge: Optional[str] = None
    content: str
    likes_count: int = 0
    comments_count: int = 0
    created_at: datetime


class ActivityLike(BaseModel):
    activity_id: str
    user_id: str
    created_at: datetime


class ActivityComment(BaseModel):
    comment_id: str
    activity_id: str
    user_id: str
    username: str
    user_name: str
    user_picture: Optional[str] = None
    comment_text: str
    created_at: datetime


class AppleAuthRequest(BaseModel):
    identity_token: str
    user_id: str
    email: Optional[str] = None
    full_name: Optional[str] = None


class AdminUserUpdate(BaseModel):
    subscription_tier: Optional[str] = None
    role: Optional[str] = None
    is_banned: Optional[bool] = None
    ban_reason: Optional[str] = None


class AdminReportUpdate(BaseModel):
    status: str
    admin_notes: Optional[str] = None


class AdminNotificationRequest(BaseModel):
    title: str
    body: str
    target: str = "all"
    segment_user_ids: Optional[List[str]] = None


class Collection(BaseModel):
    collection_id: str
    user_id: str
    name: str
    description: Optional[str] = None
    icon: str = "star"
    color: str = "#20B2AA"
    landmark_count: int = 0
    created_at: datetime
    updated_at: datetime


class CollectionCreate(BaseModel):
    name: str
    description: Optional[str] = None
    icon: Optional[str] = "star"
    color: Optional[str] = "#20B2AA"



class PromoCode(BaseModel):
    code_id: str
    code: str
    description: Optional[str] = None
    type: str = "lifetime_premium"  # "lifetime_premium" or "timed_premium"
    duration_days: Optional[int] = None  # None = lifetime, else number of days
    max_uses: int = 1
    current_uses: int = 0
    is_active: bool = True
    created_by: str
    created_at: datetime
    expires_at: Optional[datetime] = None


class PromoCodeCreate(BaseModel):
    code: str
    description: Optional[str] = None
    type: str = "lifetime_premium"
    duration_days: Optional[int] = None
    max_uses: int = 1
    expires_at: Optional[str] = None


class PromoCodeUpdate(BaseModel):
    is_active: Optional[bool] = None
    description: Optional[str] = None
    max_uses: Optional[int] = None


class PromoRedeemRequest(BaseModel):
    code: str



class PromoBatchCreate(BaseModel):
    prefix: str
    count: int
    description: Optional[str] = None
    type: str = "lifetime_premium"
    duration_days: Optional[int] = None
    max_uses: int = 1


class PromoEmailSend(BaseModel):
    code_ids: List[str]
    emails: List[str]
    subject: Optional[str] = None
    personal_message: Optional[str] = None


class EmailTemplateUpdate(BaseModel):
    subject: Optional[str] = None
    heading: Optional[str] = None
    subheading: Optional[str] = None
    body_text: Optional[str] = None
    code_label: Optional[str] = None
    steps_title: Optional[str] = None
    steps: Optional[List[str]] = None
    footer_text: Optional[str] = None
    support_text: Optional[str] = None
