from functools import lru_cache
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_env: str = "development"
    app_name: str = "G-Midia"
    app_version: str = "1.0.0"
    app_secret_key: str = "unsafe-dev-only-change-me-immediately"
    app_debug: bool = True

    database_url: str = "postgresql+psycopg://gmidia:gmidia_dev@localhost:5432/gmidia"
    redis_url: str = "redis://localhost:6379/0"

    backend_cors_origins: str = "http://localhost:3000,http://127.0.0.1:3000"

    jwt_secret_key: str = "unsafe-jwt-secret-change-me"
    jwt_algorithm: str = "HS256"
    jwt_access_token_expire_minutes: int = 60
    jwt_refresh_token_expire_days: int = 7

    meta_app_id: str = ""
    meta_app_secret: str = ""
    meta_api_version: str = "v21.0"
    meta_redirect_uri: str = "http://localhost:8000/api/v1/integrations/meta/callback"
    meta_scopes: str = "pages_show_list,pages_read_engagement,pages_manage_posts,pages_read_user_content,read_insights"

    ai_provider: str = "openai"
    ai_api_key: str = ""
    ai_model: str = "gpt-4o-mini"
    ai_base_url: str = "https://api.openai.com/v1"

    media_storage_path: str = "/app/media"
    max_upload_size_mb: int = 25

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    @property
    def cors_origins_list(self) -> list[str]:
        return [o.strip() for o in self.backend_cors_origins.split(",") if o.strip()]

    @property
    def meta_configured(self) -> bool:
        return bool(self.meta_app_id and self.meta_app_secret)

    @property
    def ai_configured(self) -> bool:
        return bool(self.ai_api_key)


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
