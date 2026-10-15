"""Workspace-scoped read-only team directory for assignment controls."""
from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.auth import Principal, require_roles
from app.database import get_session
from app.models import Team

router = APIRouter(prefix="/teams", tags=["teams"])


@router.get("")
def list_teams(
    principal: Principal = Depends(require_roles("workspace_admin", "manager", "member", "viewer")),
    session: Session = Depends(get_session),
) -> list[dict[str, str]]:
    """Return only active teams belonging to the caller's workspace."""
    teams = session.scalars(
        select(Team).where(
            Team.workspace_id == principal.workspace_id,
            Team.is_active.is_(True),
        ).order_by(Team.name.asc())
    ).all()
    return [{"id": str(team.id), "name": team.name} for team in teams]
