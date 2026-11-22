from pydantic import BaseModel


class DashboardSummary(BaseModel):
    demo: bool = False
    followers: int = 0
    reach: int = 0
    engagement_rate: float = 0.0
    scheduled_posts: int = 0
    published_posts: int = 0
    draft_posts: int = 0
    connected_pages: int = 0
    message: str = ""
    recent_posts: list[dict] = []
    performance: list[dict] = []


class AIGenerateRequest(BaseModel):
    prompt: str
    tone: str = "profissional"
    language: str = "pt"
    max_length: int = 300


class AIGenerateResponse(BaseModel):
    content: str
    provider: str
    model: str
    demo: bool = False
