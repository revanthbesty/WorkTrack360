from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.auth import Principal, current_principal
from app.database import get_session
from app.models import AuditEvent, Team, WorkItem
from app.work_item_schemas import WorkItemCreate, WorkItemRead

router = APIRouter(prefix="/work-items", tags=["work-items"])

@router.get("", response_model=list[WorkItemRead])
def list_work_items(limit: int = Query(default=50, ge=1, le=100), offset: int = Query(default=0, ge=0), principal: Principal = Depends(current_principal), session: Session = Depends(get_session)) -> list[WorkItem]:
    statement = select(WorkItem).where(WorkItem.workspace_id == principal.workspace_id).order_by(WorkItem.created_at.desc()).offset(offset).limit(limit)
    return list(session.scalars(statement).all())

@router.post("", response_model=WorkItemRead, status_code=status.HTTP_201_CREATED)
def create_work_item(payload: WorkItemCreate, principal: Principal = Depends(current_principal), session: Session = Depends(get_session)) -> WorkItem:
    if payload.team_id is not None:
        team = session.scalar(select(Team).where(Team.id == payload.team_id, Team.workspace_id == principal.workspace_id, Team.is_active.is_(True)))
        if team is None:
            raise HTTPException(status_code=404, detail="Team not found")
    item = WorkItem(workspace_id=principal.workspace_id, team_id=payload.team_id, key=f"WT-{uuid4().hex[:10].upper()}", title=payload.title, description=payload.description, status=payload.status, priority=payload.priority, due_at=payload.due_at, created_by_subject=principal.subject)
    session.add(item)
    session.flush()
    session.add(AuditEvent(workspace_id=principal.workspace_id, actor_subject=principal.subject, action="work_item.created", entity_type="work_item", entity_id=item.key))
    session.commit()
    session.refresh(item)
    return item
