# Initial data model

The initial persistence layer defines workspace-scoped entities:

- `Workspace`: tenant/workspace boundary.
- `Team`: team names unique within a workspace.
- `WorkItem`: status, priority, due date and optional responsible team.
- `WorkflowOption`: workspace-specific configurable dropdown values.
- `AuditEvent`: minimal metadata for significant actions.

All tenant-owned records carry `workspace_id`. This is a schema convention, not an access-control guarantee. Every future query and mutation must scope records to a workspace resolved from a verified authenticated identity. Add database row-level security and negative cross-tenant tests before enabling multi-tenant API routes. Do not store sensitive record payloads or secrets in audit events.
