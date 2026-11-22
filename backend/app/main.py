from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.core.database import init_db
from app.api import auth, dashboard, posts, ai, pages


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    yield


app = FastAPI(
    title=f"{settings.app_name} API",
    version=settings.app_version,
    description="API completa do G-Midia — Gestor inteligente de redes sociais.",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/api/v1")
app.include_router(dashboard.router, prefix="/api/v1")
app.include_router(posts.router, prefix="/api/v1")
app.include_router(ai.router, prefix="/api/v1")
app.include_router(pages.router, prefix="/api/v1")


@app.get("/health")
def health():
    return {
        "status": "ok",
        "service": "g-midia-api",
        "version": settings.app_version,
        "env": settings.app_env,
        "meta_configured": settings.meta_configured,
        "ai_configured": settings.ai_configured,
    }


@app.get("/api/v1")
def api_root():
    return {
        "name": settings.app_name,
        "version": settings.app_version,
        "modules": ["auth", "dashboard", "pages", "posts", "ai", "integrations"],
        "meta_configured": settings.meta_configured,
        "ai_configured": settings.ai_configured,
        "docs": "/docs",
    }
