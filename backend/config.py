import os
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    host: str = "0.0.0.0"
    port: int = 8000
    database_url: str = "sqlite:///database/smriti.db"
    pragma_journal_mode: str = "WAL"
    
    # LLM Settings
    llm_provider: str = "gemini"
    gemini_api_key: str | None = None
    anthropic_api_key: str | None = None
    openrouter_api_key: str | None = None
    
    # Telegram Settings
    telegram_bot_token: str | None = None
    telegram_chat_id: str | None = None
    alert_confidence_threshold: float = 0.5
    telemetry_poll_interval_seconds: int = 5

    # Public Next.js API URL
    next_public_api_url: str = "http://localhost:8000"

    # JWT Authentication Settings
    jwt_secret_key: str = "smriti-industrial-memory-secret-key-change-me-in-production"
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 1440  # 24 hours

    model_config = SettingsConfigDict(
        # Load from .env at root first, then look for .env in current folder
        env_file=os.path.join(os.path.dirname(os.path.dirname(__file__)), ".env"),
        env_file_encoding="utf-8",
        extra="ignore"
    )

settings = Settings()

# Resolve relative SQLite URL to absolute path relative to workspace root
if settings.database_url.startswith("sqlite:///"):
    db_path = settings.database_url.replace("sqlite:///", "")
    if not os.path.isabs(db_path):
        # backend/ is one level deep, so project root is its parent
        project_root = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
        abs_db_path = os.path.abspath(os.path.join(project_root, db_path))
        # Ensure parent directory of the DB exists
        os.makedirs(os.path.dirname(abs_db_path), exist_ok=True)
        # Use forward slashes for SQLAlchemy URLs on Windows
        settings.database_url = f"sqlite:///{abs_db_path.replace(os.sep, '/')}"
