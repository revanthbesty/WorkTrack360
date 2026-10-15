# Security checklist

This checklist records implementation status; it is not a certification or production-readiness claim.

## Implemented foundation
- [x] OIDC/JWT verification module validates RS256 signature, issuer, audience, expiry and required claims using a configured JWKS endpoint.
- [x] Protected identity endpoint requires a verified principal.
- [x] Workspace identity is taken from the signed token's `workspace_id` claim, not a request parameter.
- [x] Work-item list queries filter by the authenticated workspace.
- [x] Work-item detail and update queries filter by both item ID and authenticated workspace.
- [x] Work-item creation and updates check that a selected team belongs to the authenticated workspace.
- [x] Work-item creation and updates record minimal audit events.
- [x] Work-item keys are unique within each workspace in the ORM model and initial migration.
- [x] Basic API tests cover anonymous access and workspace scoping.

## Required before multi-user or production use
- [ ] Configure and test a trusted identity provider; validate the exact issuer, audience, JWKS rotation, and workspace/role claim contract.
- [ ] Define and test the final workspace role contract and membership lifecycle. Work-item read routes require one of `workspace_admin`, `manager`, `member`, or `viewer`; create/update routes require one of `workspace_admin`, `manager`, or `member`. Finer-grained permissions (for example, who may close or reassign items) remain to be defined.
- [ ] Add PostgreSQL row-level security or equivalent defense-in-depth tenant controls.
- [ ] Run all tests and CI successfully; add negative tests for invalid, expired, wrong-audience and wrong-issuer tokens. Tests have been added but have not yet been confirmed passing.
- [ ] Add schema migrations to CI and verify migration parity against SQLAlchemy models.
- [ ] Use least-privilege database roles and production PostgreSQL.
- [ ] Use secure session/token storage and document the browser token flow; protect against CSRF where applicable.
- [ ] Restrict CORS to explicit deployed origins and configure TLS.
- [ ] Add rate limiting, request-size limits, security headers and safe error handling.
- [ ] Store secrets in deployment secret managers; rotate exposed credentials.
- [ ] Add dependency scanning, static analysis, accessibility and threat-model reviews.
- [ ] Configure backups, tested restores, retention, incident response and monitoring.
- [ ] Complete independent security testing before production.

## Current limitations
- Identity-provider settings are empty by default; protected endpoints fail closed until configured.
- The frontend is not yet connected to the API or a real sign-in flow.
- The initial migration has not been verified by running Alembic against PostgreSQL in CI.
- The API implements basic work-item list, create, detail and partial-update operations. Delete, comments, assignments, SLA logic and configuration APIs are not complete.
- Role-based authorization is not yet applied to work-item write operations.
- Health checks process liveness only and do not verify database readiness.
- Do not use real or sensitive company data or expose the service publicly yet.
