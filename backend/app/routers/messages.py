from uuid import UUID

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.audit import write_audit
from app.deps import get_current_user, get_db
from app.exceptions import AppError
from app.models import Deal, Message, User
from app.schemas import MessageCreate, MessageOut

router = APIRouter(prefix="/deals", tags=["messages"])


@router.get("/{deal_id}/messages", response_model=list[MessageOut])
def list_messages(
    deal_id: UUID,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> list[Message]:
    deal = db.get(Deal, deal_id)
    if not deal or (deal.buyer_org_id != user.org_id and deal.vendor_org_id != user.org_id):
        raise AppError(404, "Not Found", "Deal not found")
    return db.scalars(select(Message).where(Message.deal_id == deal.id).order_by(Message.created_at.asc())).all()


@router.post("/{deal_id}/messages", response_model=MessageOut)
def create_message(
    deal_id: UUID,
    payload: MessageCreate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> Message:
    deal = db.get(Deal, deal_id)
    if not deal or (deal.buyer_org_id != user.org_id and deal.vendor_org_id != user.org_id):
        raise AppError(404, "Not Found", "Deal not found")
    msg = Message(deal_id=deal.id, sender_user_id=user.id, body=payload.body)
    db.add(msg)
    db.flush()
    write_audit(
        db,
        org_id=user.org_id,
        actor_user_id=user.id,
        action="message.create",
        entity="message",
        entity_id=str(msg.id),
    )
    db.commit()
    db.refresh(msg)
    return msg
