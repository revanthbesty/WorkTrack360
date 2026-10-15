# WorkTrack360 architecture

## Application boundaries
- `frontend/`: React + TypeScript browser UI. Treat it as an untrusted client; authorization belongs on the server.
- `backend/`: FastAPI API boundary for request validation, OIDC/JWT verification, workspace scoping, business rules and audit events.
- PostgreSQL: intended authoritative datastore. SQLAlchemy models and an initial Alembic migration exist; production migration execution and parity checks remain pending.

## Implemented API
- `GET /health`: process liveness only.
- `GET /api/v1/meta`: non-sensitive API metadata.
- `GET /api/v1/me`: protected identity context, requires a verified bearer token and configured OIDC issuer/audience/JWKS URL.
- `GET /api/v1/work-items`: authenticated, workspace-scoped list with bounded pagination.
- `POST /api/v1/work-items`: authenticated work-item creation; verifies a selected team belongs to the caller's workspace and writes a minimal audit event.
- `GET /api/v1/work-items/{item_id}`: returns an item only when it belongs to the authenticated workspace; cross-workspace IDs return 404.
- `PATCH /api/v1/work-items/{item_id}`: validates partial updates, checks workspace ownership and team scope, and records an audit event.

## Identity contract
The API verifies RS256 access tokens using the configured JWKS endpoint. Required claims include `iss`, `aud`, `exp`, `iat`, `sub`, and a UUID `workspace_id`. An optional `roles` array is parsed from the signed token. These claim names and semantics must be explicitly configured with the chosen identity provider. The API intentionally fails closed when the provider configuration is absent.

## Planned domain areas
1. Work items and activity history
2. Customer escalations and hand-offs
3. Product demos and enablement
4. Compliance deadlines and reminders
5. Reporting and analytics
6. Workspace settings, teams, roles and configurable workflow values

## Deployment boundary
This is still a development foundation, not a production release. The frontend sign-in flow, real OIDC configuration, operation-level authorization, PostgreSQL row-level security, migration validation, rate limits, observability, backup/restore, dependency scanning and security tests must be completed before using real company data or exposing the API publicly.
