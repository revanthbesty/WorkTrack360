# Database migrations

Install dependencies from `requirements.txt`, configure `DATABASE_URL` in the environment, then run:

```bash
alembic upgrade head
```

To create a future migration after reviewing model changes:

```bash
alembic revision --autogenerate -m "describe change"
```

Review generated migrations before committing. Never run schema migrations against production without a backup, review, and rollback plan. `0001_initial.py` creates the initial workspace, team, work-item, workflow-option and audit-event tables.
