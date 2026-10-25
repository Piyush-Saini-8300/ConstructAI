from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    gemini_api_key: str = ""
    # Set this to a model ID returned by `python check_models.py`.
    gemini_model: str = "gemini-2.5-flash"
    cors_origins: str = "http://127.0.0.1:5173,http://localhost:5173"
    max_upload_mb: int = 10

    model_config = SettingsConfigDict(
        env_file=".env",
        extra="ignore",
        case_sensitive=False,
    )


settings = Settings()
