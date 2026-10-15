# Security checklist

This is an implementation checklist, not a claim that these controls are complete.

## Required before multi-user or production use

- [ ] Integrate a trusted identity provider; do not invent a custom password system.
- [ ] Enforce server-side authentication and role-based authorization on every protected route.
- [ ] Establish tenant identity from the authenticated server-side principal, never from a trusted client-supplied tenant ID.
- [ ] Add tenant isolation tests and PostgreSQL row-level security where appropriate.
- [ ] Add schema migrations and least-privilege database roles.
- [ ] Validate inputs and constrain pagination, upload sizes and request rates.
- [ ] Use secure, HttpOnly, SameSite cookies or a documented token strategy; protect against CSRF where applicable.
- [ ] Restrict CORS to explicit deployed origins.
- [ ] Add audit events for access and material changes without logging secrets or sensitive payloads.
- [ ] Store secrets in deployment secret managers; rotate any exposed credentials.
- [ ] Add dependency scanning, static analysis, and automated API/UI tests.
- [ ] Configure TLS, backups, tested restore procedures, retention and incident response.
- [ ] Run accessibility, threat-model and penetration testing before production.

## Current known limitations

- No authentication or authorization is implemented yet.
- No tenant-aware schema or database migration exists yet.
- The health endpoint only verifies process liveness; it does not prove database readiness.
- Development API docs are enabled by default in development mode only.
