# WorkTrack360

A secure, configurable work-management platform. This repository starts the migration from the standalone HTML prototype to a typed web frontend and API-backed application.

## Stack

- Frontend: React, TypeScript, Vite
- API: Python, FastAPI, Pydantic
- Database: PostgreSQL via SQLAlchemy
- Tests: Vitest (frontend), pytest (backend)
- CI: GitHub Actions

## Current status

This is an active development foundation, not a production-ready release. The API has an OIDC/JWT verification boundary, a protected identity endpoint, workspace-scoped work-item list/create/read/update routes, and audit events for work-item mutations. A typed frontend API client now defines list, read, create, and update calls, bearer-header handling, bounded pagination, and safe API error messages. Client tests have been added, but execution results have not been verified here.

The dashboard still uses fictional sample records and the frontend is not yet connected to a configured identity provider or live API session. The API client does not persist access tokens; a trusted sign-in integration must supply short-lived access tokens. Configure and test a trusted identity provider, enforce operation-level authorization, validate tenant isolation and migrations, and pass CI/security checks before real or sensitive company data is used. Do not commit secrets or production data.

## Repository layout

- `frontend/` React application
- `backend/` FastAPI application
- `docs/` architecture and security notes
- `.github/workflows/` automated checks

## Local development

### Frontend

From the repository root:

    cd frontend
    npm install
    npm run dev

Optionally set `VITE_API_BASE_URL` to the API origin when running the frontend locally. This value is public configuration, not a secret. The current dashboard does not yet call the API automatically.

### Backend

Use Python 3.12 or newer in a virtual environment:

    cd backend
    python -m venv .venv
    # Windows: .venv\Scripts\activate
    # macOS/Linux: source .venv/bin/activate
    pip install -r requirements.txt
    uvicorn app.main:app --reload

The API health endpoint is `GET /health`. In local development, API docs are available at `/docs`. Work-item endpoints require a bearer token from a trusted identity provider configured with `OIDC_ISSUER`, `OIDC_AUDIENCE`, and `OIDC_JWKS_URL` (see `backend/.env.example`). The verified token must include a UUID `workspace_id` claim. Until that identity-provider contract is configured and tested, protected routes intentionally fail closed.

## Security principles

- Secrets are supplied through environment variables; never commit `.env` files.
- All user input is validated at the API boundary.
- Browser UI checks are not authorization; authorization must be enforced by the server.
- Tenant scoping and identity provider integration are required before multi-user deployment.
- The frontend API client requires a token supplied by its caller and does not save it to local storage or cookies.
- Use least-privilege database credentials, TLS, backups, dependency scanning, and tested restore procedures for deployment.
