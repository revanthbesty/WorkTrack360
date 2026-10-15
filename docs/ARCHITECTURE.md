# WorkTrack360 architecture (initial)

## Application boundaries

- `frontend/`: React + TypeScript browser UI. It is an untrusted client; no authorization decisions are made solely in the browser.
- `backend/`: FastAPI API boundary for validation, identity integration, business rules and audit events.
- PostgreSQL: intended authoritative datastore. Database migrations and tenant-aware data models are not yet implemented.

## Planned domain areas

1. Work items and activity history
2. Customer escalations and hand-offs
3. Product demos and enablement
4. Compliance deadlines and reminders
5. Reporting and analytics
6. Workspace settings, teams, roles and configurable workflow values

## Initial API

- `GET /health`: liveness status
- `GET /api/v1/meta`: non-sensitive API metadata

## Deployment boundary

This initial commit is a development scaffold only. Do not connect production data or expose it publicly until identity, server-side authorization, tenant isolation, database migrations, secure session policy, rate limits, logging controls, backup/restore, and security tests are implemented.
