from typing import Any
from uuid import UUID

from sqlalchemy.orm import Session

from app.models import AuditLog


def write_audit(
    db: Session,
    *,
    org_id: UUID,
    actor_user_id: UUID | None,
    action: str,
    entity: str,
    entity_id: str,
    payload: dict[str, Any] | None = None,
) -> None:
    entry = AuditLog(
        org_id=org_id,
        actor_user_id=actor_user_id,
        action=action,
        entity=entity,
        entity_id=entity_id,
        payload=payload or {},
    )
    db.add(entry)
