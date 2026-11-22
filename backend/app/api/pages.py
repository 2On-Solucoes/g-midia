from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from datetime import datetime, timezone

from app.core.database import get_db
from app.core.security import get_current_user
from app.core.config import settings
from app.models.user import User
from app.models.page import SocialPage

router = APIRouter(prefix="/pages", tags=["Páginas"])


class PageOut(BaseModel):
    id: int
    provider: str
    external_id: str
    name: str
    category: str | None
    picture_url: str | None
    followers_count: int
    is_connected: bool
    last_synced_at: datetime | None

    model_config = {"from_attributes": True}


class PageConnectDemo(BaseModel):
    name: str
    category: str | None = "Business"
    followers_count: int = 0


@router.get("", response_model=list[PageOut])
def list_pages(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    pages = db.query(SocialPage).filter(SocialPage.owner_id == current_user.id).all()
    return pages


@router.post("/connect-demo", response_model=PageOut)
def connect_demo_page(
    data: PageConnectDemo,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Allows connecting a simulated Facebook page for testing without real Meta credentials."""
    page = SocialPage(
        owner_id=current_user.id,
        provider="facebook",
        external_id=f"demo_{current_user.id}_{int(datetime.now(timezone.utc).timestamp())}",
        name=data.name,
        category=data.category,
        followers_count=data.followers_count,
        is_connected=True,
        last_synced_at=datetime.now(timezone.utc),
    )
    db.add(page)
    db.commit()
    db.refresh(page)
    return page


@router.delete("/{page_id}", status_code=204)
def disconnect_page(
    page_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    page = db.query(SocialPage).filter(
        SocialPage.id == page_id, SocialPage.owner_id == current_user.id
    ).first()
    if not page:
        raise HTTPException(status_code=404, detail="Página não encontrada")
    db.delete(page)
    db.commit()
    return None


@router.get("/meta/status")
def meta_status(current_user: User = Depends(get_current_user)):
    return {
        "configured": settings.meta_configured,
        "app_id_set": bool(settings.meta_app_id),
        "redirect_uri": settings.meta_redirect_uri,
        "scopes": settings.meta_scopes.split(","),
        "message": (
            "Credenciais Meta configuradas. Pronto para OAuth."
            if settings.meta_configured
            else "Configure META_APP_ID e META_APP_SECRET no .env para ativar a integração real."
        ),
    }
