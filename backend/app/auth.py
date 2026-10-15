"""OIDC/JWT verification boundary.

Configure issuer, audience and JWKS URL from a trusted identity provider. This module
fails closed when configuration is absent. It never trusts workspace IDs supplied by
request bodies or query strings.
"""
from functools import lru_cache
from uuid import UUID

import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pydantic import BaseModel, ValidationError
from pydantic_settings import BaseSettings, SettingsConfigDict
from jwt import PyJWKClient, PyJWTError


class AuthSettings(BaseSettings):
    oidc_issuer: str = ""
    oidc_audience: str = ""
    oidc_jwks_url: str = ""
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")


class Principal(BaseModel):
    subject: str
    workspace_id: UUID
    roles: frozenset[str] = frozenset()


settings = AuthSettings()
bearer = HTTPBearer(auto_error=False)


@lru_cache(maxsize=1)
def _jwks_client() -> PyJWKClient:
    if not settings.oidc_jwks_url:
        raise RuntimeError("OIDC_JWKS_URL is not configured")
    return PyJWKClient(settings.oidc_jwks_url, cache_jwk_set=True, lifespan=300)


def current_principal(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer),
) -> Principal:
    if credentials is None or credentials.scheme.lower() != "bearer":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required",
            headers={"WWW-Authenticate": "Bearer"},
        )
    if not (settings.oidc_issuer and settings.oidc_audience and settings.oidc_jwks_url):
        raise HTTPException(status_code=503, detail="Identity provider is not configured")

    try:
        signing_key = _jwks_client().get_signing_key_from_jwt(credentials.credentials).key
        claims = jwt.decode(
            credentials.credentials,
            signing_key,
            algorithms=["RS256"],
            issuer=settings.oidc_issuer,
            audience=settings.oidc_audience,
            options={"require": ["exp", "iat", "sub", "iss", "aud"]},
        )
        subject = claims.get("sub")
        workspace = claims.get("workspace_id")
        roles = claims.get("roles", [])
        if not isinstance(subject, str) or not subject.strip():
            raise ValueError("Missing subject")
        if not isinstance(workspace, str):
            raise ValueError("Missing workspace claim")
        if not isinstance(roles, list) or not all(isinstance(role, str) for role in roles):
            raise ValueError("Invalid roles claim")
        return Principal(subject=subject, workspace_id=UUID(workspace), roles=frozenset(roles))
    except (PyJWTError, ValueError, ValidationError, RuntimeError) as exc:
        # Do not expose token contents, signing details, or claim values to the caller.
        if isinstance(exc, RuntimeError) and "not configured" in str(exc):
            raise HTTPException(status_code=503, detail="Identity provider is not configured") from exc
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired access token",
            headers={"WWW-Authenticate": "Bearer"},
        ) from exc


def require_roles(*allowed_roles: str):
    def dependency(principal: Principal = Depends(current_principal)) -> Principal:
        if not principal.roles.intersection(allowed_roles):
            raise HTTPException(status_code=403, detail="Insufficient permissions")
        return principal
    return dependency
