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
    
    # Telegram Settings
    telegram_bot_token: str | None = None
    telegram_chat_id: str | None = None
    alert_confidence_threshold: float = 0.5
    telemetry_poll_interval_seconds: int = 5

    # Public Next.js API URL
    next_public_api_url: str = "http://localhost:8000"

    model_config = SettingsConfigDict(
        # Load from .env at root first, then look for .env in current folder
        env_file=os.path.join(os.path.dirname(os.path.dirname(__file__)), ".env"),
        env_file_encoding="utf-8",
        extra="ignore"
    )

settings = Settings()
