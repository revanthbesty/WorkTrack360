# Next implementation milestone

1. Configure the trusted OIDC identity provider and verify issuer, audience, signature, expiry, and workspace claims.
2. Add server-side role authorization to protected routes.
3. Add database migrations and tenant-isolation tests.
4. Connect work-item routes to the database only after workspace identity is verified.
5. Run CI and review results before deployment.

The identity provider is not configured yet. Do not treat the API as production-ready or use it with real customer data until these steps and the security checklist are complete.
