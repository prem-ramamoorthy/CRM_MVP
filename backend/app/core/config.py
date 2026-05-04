from functools import lru_cache
from typing import List
from pydantic_settings import BaseSettings
from pydantic import AnyHttpUrl


class Settings(BaseSettings):
    # App
    APP_NAME: str = "PG Lead CRM API"
    APP_VERSION: str = "1.0.0"
    ENVIRONMENT: str = "development"

    # Database
    DATABASE_URL: str = "postgresql+asyncpg://postgres.iclbvtwyfboirfuvsipr:premvit%40200@aws-1-ap-southeast-2.pooler.supabase.com:6543/postgres"

    # Auth
    SECRET_KEY: str = "change-me-in-production-at-least-32-characters"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440  # 24 hours

    # CORS
    CORS_ORIGINS: List[str] = ["http://localhost:5173", "http://localhost:3000"]

    # SLA thresholds (hours)
    SLA_NEW_HOURS: int = 24        # New lead must be contacted within 24h
    SLA_CONTACTED_HOURS: int = 48  # Contacted lead must be moved within 48h
    SLA_INTERESTED_HOURS: int = 72 # Interested lead must be visited within 72h

    # Redis (optional)
    REDIS_URL: str = "redis://localhost:6379/0"

    class Config:
        env_file = ".env"
        case_sensitive = True


@lru_cache()
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
