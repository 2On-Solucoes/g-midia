import json
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.models.post import Post, PostStatus
from app.schemas.post import PostCreate, PostUpdate, PostOut

router = APIRouter(prefix="/posts", tags=["Publicações"])


def _serialize_media(media_urls: list[str] | None) -> str | None:
    if not media_urls:
        return None
    return json.dumps(media_urls)


def _deserialize_media(raw: str | None) -> list[str] | None:
    if not raw:
        return None
    try:
        return json.loads(raw)
    except Exception:
        return None


def _to_out(post: Post) -> PostOut:
    return PostOut(
        id=post.id,
        content=post.content,
        status=post.status,
        page_id=post.page_id,
        scheduled_at=post.scheduled_at,
        published_at=post.published_at,
        external_post_id=post.external_post_id,
        media_urls=_deserialize_media(post.media_urls),
        ai_generated=post.ai_generated,
        error_message=post.error_message,
        created_at=post.created_at,
        updated_at=post.updated_at,
    )


@router.get("", response_model=list[PostOut])
def list_posts(
    status_filter: PostStatus | None = Query(None, alias="status"),
    limit: int = Query(50, ge=1, le=200),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    q = db.query(Post).filter(Post.author_id == current_user.id)
    if status_filter:
        q = q.filter(Post.status == status_filter)
    posts = q.order_by(Post.created_at.desc()).limit(limit).all()
    return [_to_out(p) for p in posts]


@router.post("", response_model=PostOut, status_code=status.HTTP_201_CREATED)
def create_post(
    data: PostCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    status_val = PostStatus.draft
    if data.scheduled_at and data.scheduled_at > datetime.now(timezone.utc):
        status_val = PostStatus.scheduled

    post = Post(
        author_id=current_user.id,
        page_id=data.page_id,
        content=data.content.strip(),
        status=status_val,
        scheduled_at=data.scheduled_at,
        media_urls=_serialize_media(data.media_urls),
        ai_generated=data.ai_generated,
    )
    db.add(post)
    db.commit()
    db.refresh(post)
    return _to_out(post)


@router.get("/{post_id}", response_model=PostOut)
def get_post(
    post_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    post = db.query(Post).filter(Post.id == post_id, Post.author_id == current_user.id).first()
    if not post:
        raise HTTPException(status_code=404, detail="Publicação não encontrada")
    return _to_out(post)


@router.patch("/{post_id}", response_model=PostOut)
def update_post(
    post_id: int,
    data: PostUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    post = db.query(Post).filter(Post.id == post_id, Post.author_id == current_user.id).first()
    if not post:
        raise HTTPException(status_code=404, detail="Publicação não encontrada")
    if post.status == PostStatus.published:
        raise HTTPException(status_code=400, detail="Não é possível editar uma publicação já publicada")

    if data.content is not None:
        post.content = data.content.strip()
    if data.page_id is not None:
        post.page_id = data.page_id
    if data.scheduled_at is not None:
        post.scheduled_at = data.scheduled_at
        if data.scheduled_at > datetime.now(timezone.utc):
            post.status = PostStatus.scheduled
    if data.status is not None:
        post.status = data.status
    if data.media_urls is not None:
        post.media_urls = _serialize_media(data.media_urls)

    db.commit()
    db.refresh(post)
    return _to_out(post)


@router.post("/{post_id}/publish", response_model=PostOut)
def publish_post(
    post_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Simulate publishing (real Meta call when credentials are configured)."""
    post = db.query(Post).filter(Post.id == post_id, Post.author_id == current_user.id).first()
    if not post:
        raise HTTPException(status_code=404, detail="Publicação não encontrada")
    if post.status == PostStatus.published:
        raise HTTPException(status_code=400, detail="Já publicada")

    # In a real scenario we would call Meta Graph API here.
    # For now we mark as published with a simulated external ID.
    post.status = PostStatus.published
    post.published_at = datetime.now(timezone.utc)
    post.external_post_id = f"sim_{post.id}_{int(post.published_at.timestamp())}"
    post.error_message = None
    db.commit()
    db.refresh(post)
    return _to_out(post)


@router.delete("/{post_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_post(
    post_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    post = db.query(Post).filter(Post.id == post_id, Post.author_id == current_user.id).first()
    if not post:
        raise HTTPException(status_code=404, detail="Publicação não encontrada")
    db.delete(post)
    db.commit()
    return None
