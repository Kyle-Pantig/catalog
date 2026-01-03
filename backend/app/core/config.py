from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import Optional
from dotenv import load_dotenv
import os

# Load .env file manually
load_dotenv()


class Settings(BaseSettings):
    # Supabase
    supabase_url: str = os.getenv("NEXT_PUBLIC_SUPABASE_URL", "")
    supabase_service_role_key: str = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")
    
    # Database
    database_url: str = os.getenv("DATABASE_URL", "")
    direct_url: Optional[str] = os.getenv("DIRECT_URL")
    
    # App
    app_name: str = "Catalog API"
    debug: bool = False
    
    model_config = SettingsConfigDict(
        env_file=None,  # Don't auto-load .env, we're using dotenv manually
        case_sensitive=False,
        extra="ignore",
    )


settings = Settings()

