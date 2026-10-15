# WorkTrack360

A secure, configurable work-management platform. This repository starts the migration from the standalone HTML prototype to a typed web frontend and API-backed application.

## Stack

- Frontend: React, TypeScript, Vite
- API: Python, FastAPI, Pydantic
- Database: PostgreSQL via SQLAlchemy
- Tests: Vitest (frontend), pytest (backend)
- CI: GitHub Actions

## Current status

This is the initial development foundation, not a production-ready release. Authentication, tenant isolation, database migrations, and deployment configuration must be completed and tested before real or sensitive company data is used. Do not commit secrets or production data.

## Repository layout

- `frontend/` React application
- `backend/` FastAPI application
- `docs/` architecture and security notes
- `.github/workflows/` automated checks

## Local development

### Frontend

```bash
cd frontend
npm install
npm run dev
```

### Backend

Use Python 3.12 or newer in a virtual environment:

```bash
cd backend
python -m venv .venv
# Windows: .venv\\Scripts\\activate
# macOS/Linux: source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

The API health endpoint is `GET /health`. API docs are available at `/docs` in local development.

## Security principles

- Secrets are supplied through environment variables; never commit `.env` files.
- All user input is validated at the API boundary.
- Browser UI checks are not authorization; authorization must be enforced by the server.
- Tenant scoping and identity provider integration are required before multi-user deployment.
- Use least-privilege database credentials, TLS, backups, dependency scanning, and tested restore procedures for deployment.
