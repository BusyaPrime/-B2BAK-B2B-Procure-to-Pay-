from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.deps import get_current_user, get_db
from app.models import AuditLog, User
from app.schemas import AuditOut, Paginated

router = APIRouter(prefix="/audit", tags=["audit"])


@router.get("", response_model=Paginated)
def list_audit(
    page: int = 1,
    page_size: int = 20,
    entity: str | None = None,
    action: str | None = None,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> Paginated:
    query = select(AuditLog).where(AuditLog.org_id == user.org_id)
    if entity:
        query = query.where(AuditLog.entity == entity)
    if action:
        query = query.where(AuditLog.action == action)
    total = db.scalar(select(func.count()).select_from(query.subquery())) or 0
    items = db.scalars(query.order_by(AuditLog.created_at.desc()).offset((page - 1) * page_size).limit(page_size)).all()
    return Paginated(items=[AuditOut.model_validate(item) for item in items], page=page, page_size=page_size, total=total)
