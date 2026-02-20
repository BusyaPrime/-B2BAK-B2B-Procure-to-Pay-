from functools import lru_cache
from typing import Literal

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    app_name: str = "B2BAK API"
    env: Literal["dev", "test", "prod"] = "dev"
    database_url: str = "postgresql+psycopg://b2bak:b2bak@localhost:5432/b2bak"
    redis_url: str = "redis://localhost:6379/0"
    jwt_secret: str = "change_me_please"
    jwt_algorithm: str = "HS256"
    jwt_access_expires_minutes: int = 30
    jwt_refresh_expires_days: int = 14
    frontend_origin: str = "http://localhost:3000"
    backend_cors_origins: str = "http://localhost:3000"
    cookie_secure: bool = False
    google_client_id: str = ""
    google_client_secret: str = ""
    github_client_id: str = ""
    github_client_secret: str = ""
    oauth_state_ttl_seconds: int = 600
    oauth_register_expires_minutes: int = 15


@lru_cache
def get_settings() -> Settings:
    return Settings()
