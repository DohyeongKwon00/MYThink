from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
    )

    supabase_url: str
    supabase_service_key: str
    frontend_url: str = "http://localhost:3000"
    openai_api_key: str
    openai_model: str = "gpt-4.1-mini"


settings = Settings()
