from datetime import datetime, timedelta, timezone
from types import SimpleNamespace
from uuid import uuid4

import jwt
from cryptography.hazmat.primitives.asymmetric import rsa
from fastapi import HTTPException

from app import auth


_PRIVATE_KEY = rsa.generate_private_key(public_exponent=65537, key_size=2048)
_PUBLIC_KEY = _PRIVATE_KEY.public_key()
_ISSUER = "https://identity.example.test/"
_AUDIENCE = "worktrack360-api"


class FakeJwksClient:
    def get_signing_key_from_jwt(self, token: str):
        return SimpleNamespace(key=_PUBLIC_KEY)


def _token(**overrides: object) -> str:
    now = datetime.now(timezone.utc)
    claims: dict[str, object] = {
        "sub": "enterprise-user-123",
        "iss": _ISSUER,
        "aud": _AUDIENCE,
        "iat": now,
        "exp": now + timedelta(minutes=5),
        "workspace_id": str(uuid4()),
        "roles": ["member"],
    }
    claims.update(overrides)
    return jwt.encode(claims, _PRIVATE_KEY, algorithm="RS256")


def _configure(monkeypatch) -> None:
    monkeypatch.setattr(auth.settings, "oidc_issuer", _ISSUER)
    monkeypatch.setattr(auth.settings, "oidc_audience", _AUDIENCE)
    monkeypatch.setattr(auth.settings, "oidc_jwks_url", "https://identity.example.test/jwks")
    monkeypatch.setattr(auth, "_jwks_client", lambda: FakeJwksClient())


def test_valid_signed_token_resolves_principal(monkeypatch) -> None:
    _configure(monkeypatch)
    token = _token(workspace_id=str(uuid4()), roles=["member", "viewer"])
    principal = auth.current_principal(
        credentials=SimpleNamespace(scheme="Bearer", credentials=token)
    )
    assert principal.subject == "enterprise-user-123"
    assert principal.roles == frozenset({"member", "viewer"})


def test_wrong_issuer_is_rejected(monkeypatch) -> None:
    _configure(monkeypatch)
    token = _token(iss="https://attacker.example.test/")
    try:
        auth.current_principal(credentials=SimpleNamespace(scheme="Bearer", credentials=token))
    except HTTPException as exc:
        assert exc.status_code == 401
        assert exc.detail == "Invalid or expired access token"
    else:
        raise AssertionError("Token with wrong issuer must be rejected")


def test_malformed_workspace_claim_is_rejected(monkeypatch) -> None:
    _configure(monkeypatch)
    token = _token(workspace_id="not-a-uuid")
    try:
        auth.current_principal(credentials=SimpleNamespace(scheme="Bearer", credentials=token))
    except HTTPException as exc:
        assert exc.status_code == 401
        assert exc.detail == "Invalid or expired access token"
    else:
        raise AssertionError("Malformed workspace claim must be rejected")


def test_non_list_roles_claim_is_rejected(monkeypatch) -> None:
    _configure(monkeypatch)
    token = _token(roles="workspace_admin")
    try:
        auth.current_principal(credentials=SimpleNamespace(scheme="Bearer", credentials=token))
    except HTTPException as exc:
        assert exc.status_code == 401
        assert exc.detail == "Invalid or expired access token"
    else:
        raise AssertionError("Malformed roles claim must be rejected")
