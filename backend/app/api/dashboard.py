from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.core.database import get_db
from app.core.security import get_current_user
from app.core.config import settings
from app.models.user import User
from app.models.post import Post, PostStatus
from app.models.page import SocialPage
from app.schemas.dashboard import DashboardSummary

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])


@router.get("/summary", response_model=DashboardSummary)
def get_summary(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    pages = db.query(SocialPage).filter(SocialPage.owner_id == current_user.id).all()
    posts = db.query(Post).filter(Post.author_id == current_user.id).all()

    scheduled = sum(1 for p in posts if p.status == PostStatus.scheduled)
    published = sum(1 for p in posts if p.status == PostStatus.published)
    drafts = sum(1 for p in posts if p.status == PostStatus.draft)
    total_followers = sum(p.followers_count or 0 for p in pages)

    recent = (
        db.query(Post)
        .filter(Post.author_id == current_user.id)
        .order_by(Post.created_at.desc())
        .limit(5)
        .all()
    )

    # Simulated performance data (will be replaced by Meta Insights)
    performance = [
        {"day": "Seg", "reach": 1200, "engagement": 84},
        {"day": "Ter", "reach": 1450, "engagement": 102},
        {"day": "Qua", "reach": 980, "engagement": 67},
        {"day": "Qui", "reach": 1680, "engagement": 121},
        {"day": "Sex", "reach": 2100, "engagement": 156},
        {"day": "Sáb", "reach": 1890, "engagement": 134},
        {"day": "Dom", "reach": 1320, "engagement": 91},
    ]

    message = "Bem-vindo ao G-Midia!"
    if not pages:
        message = "Ligue a sua conta Facebook/Meta para carregar métricas reais."
    elif not settings.meta_configured:
        message = "Credenciais Meta ainda não configuradas no servidor."

    return DashboardSummary(
        demo=not bool(pages),
        followers=total_followers or 0,
        reach=sum(x["reach"] for x in performance) if pages else 0,
        engagement_rate=round(
            (sum(x["engagement"] for x in performance) / max(sum(x["reach"] for x in performance), 1)) * 100, 2
        ) if pages else 0.0,
        scheduled_posts=scheduled,
        published_posts=published,
        draft_posts=drafts,
        connected_pages=len(pages),
        message=message,
        recent_posts=[
            {
                "id": p.id,
                "content": p.content[:120] + ("..." if len(p.content) > 120 else ""),
                "status": p.status.value,
                "created_at": p.created_at.isoformat(),
            }
            for p in recent
        ],
        performance=performance if pages else [],
    )
