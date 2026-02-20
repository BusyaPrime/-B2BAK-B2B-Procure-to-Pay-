from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.audit import write_audit
from app.deps import get_current_user, get_db, require_roles
from app.exceptions import AppError
from app.models import Invite, Notification, Role, User
from app.schemas import InviteCreate, InviteOut

router = APIRouter(prefix="/invites", tags=["invites"])


@router.get("", response_model=list[InviteOut])
def list_invites(
    status: str | None = None,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> list[Invite]:
    query = select(Invite).where(Invite.org_id == user.org_id)
    if status:
        query = query.where(Invite.status == status.upper())
    return db.scalars(query.order_by(Invite.created_at.desc())).all()


@router.post("", response_model=InviteOut)
def create_invite(
    payload: InviteCreate,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles([Role.ORG_OWNER, Role.ADMIN])),
) -> Invite:
    invite = Invite(
        org_id=user.org_id,
        email=payload.email.lower().strip(),
        role=payload.role,
        status="PENDING",
        created_by_user_id=user.id,
    )
    db.add(invite)
    db.flush()
    note = Notification(
        org_id=user.org_id,
        user_id=user.id,
        type="invite",
        payload={"invite_id": str(invite.id), "email": invite.email, "href": "/marketplace/requests", "message": f"Invite sent to {invite.email}"},
    )
    db.add(note)
    write_audit(
        db,
        org_id=user.org_id,
        actor_user_id=user.id,
        action="invite.create",
        entity="invite",
        entity_id=str(invite.id),
        payload={"email": invite.email, "role": invite.role.value},
    )
    db.commit()
    db.refresh(invite)
    return invite


@router.post("/{invite_id}/accept", response_model=InviteOut)
def accept_invite(
    invite_id: UUID,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> Invite:
    invite = db.get(Invite, invite_id)
    if not invite or invite.org_id != user.org_id:
        raise AppError(404, "Not Found", "Invite not found")
    invite.status = "ACCEPTED"
    db.commit()
    db.refresh(invite)
    return invite
