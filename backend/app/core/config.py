from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    APP_ENV: str = "development"
    DATABASE_URL: str = "mysql+pymysql://root:password@localhost:3306/myfinanzas"
    SECRET_KEY: str = "change-me-generate-a-strong-secret"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440
    JWT_RESET_TOKEN_EXPIRE_MINUTES: int = 60
    CORS_ORIGINS: list[str] = ["http://localhost:3000"]


settings = Settings()