import os
from datetime import timedelta, timezone

class Settings:
    # Zona horaria de la aplicación (Argentina UTC-3)
    TZ_LOCAL = timezone(timedelta(hours=-3))
    SECRET_KEY = os.getenv("SECRET_KEY", "tp_gdsi_grupo_01_secret_key_2024")
    ALGORITHM = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7  # 7 días para pruebas
    DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./app.db")

settings = Settings()
