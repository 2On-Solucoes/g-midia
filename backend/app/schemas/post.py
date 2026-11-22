from datetime import datetime
from pydantic import BaseModel, Field
from app.models.post import PostStatus


class PostCreate(BaseModel):
    content: str = Field(..., min_length=1, max_length=5000)
    page_id: int | None = None
    scheduled_at: datetime | None = None
    media_urls: list[str] | None = None
    ai_generated: bool = False


class PostUpdate(BaseModel):
    content: str | None = Field(None, min_length=1, max_length=5000)
    page_id: int | None = None
    scheduled_at: datetime | None = None
    status: PostStatus | None = None
    media_urls: list[str] | None = None


class PostOut(BaseModel):
    id: int
    content: str
    status: PostStatus
    page_id: int | None
    scheduled_at: datetime | None
    published_at: datetime | None
    external_post_id: str | None
    media_urls: list[str] | None
    ai_generated: bool
    error_message: str | None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
