from fastapi import Depends, FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic_settings import BaseSettings, SettingsConfigDict

from app.auth import Principal, current_principal
from app.work_items import router as work_items_router


class Settings(BaseSettings):
    app_name: str = "WorkTrack360 API"
    app_env: str = "development"
    api_prefix: str = "/api/v1"
    cors_origins: str = "http://localhost:5173,http://127.0.0.1:5173"
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")


settings = Settings()
app = FastAPI(
    title=settings.app_name,
    version="0.2.0",
    description="WorkTrack360 API. Protected routes require a configured trusted OIDC provider.",
    docs_url="/docs" if settings.app_env == "development" else None,
    redoc_url=None,
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[origin.strip() for origin in settings.cors_origins.split(",") if origin.strip()],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PATCH", "DELETE"],
    allow_headers=["Authorization", "Content-Type", "X-Request-ID"],
)


@app.get("/health", tags=["operations"])
def health() -> dict[str, str]:
    """Liveness endpoint; does not expose secrets or database details."""
    return {"status": "ok", "service": "worktrack360-api", "version": "0.2.0"}


@app.get(f"{settings.api_prefix}/meta", tags=["operations"])
def api_meta() -> dict[str, str]:
    """Non-sensitive API metadata for the development frontend."""
    return {"name": settings.app_name, "environment": settings.app_env, "version": "0.2.0"}


@app.get(f"{settings.api_prefix}/me", tags=["identity"])
def get_me(principal: Principal = Depends(current_principal)) -> dict[str, object]:
    """Return minimal identity context after verifying the signed OIDC access token."""
    return {
        "subject": principal.subject,
        "workspace_id": str(principal.workspace_id),
        "roles": sorted(principal.roles),
    }

app.include_router(work_items_router, prefix=settings.api_prefix)
