from __future__ import annotations

import json
import time
from datetime import UTC, datetime
from uuid import UUID

from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.audit import write_audit
from app.deps import get_current_user, get_db
from app.exceptions import AppError
from app.models import Notification, User
from app.schemas import NotificationOut, Paginated

router = APIRouter(prefix="/notifications", tags=["notifications"])


@router.get("", response_model=Paginated)
def list_notifications(
    page: int = 1,
    page_size: int = 20,
    unread_only: bool = False,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> Paginated:
    query = select(Notification).where(Notification.user_id == user.id)
    if unread_only:
        query = query.where(Notification.read_at.is_(None))
    total = db.scalar(select(func.count()).select_from(query.subquery())) or 0
    items = db.scalars(query.order_by(Notification.created_at.desc()).offset((page - 1) * page_size).limit(page_size)).all()
    return Paginated(items=[NotificationOut.model_validate(item) for item in items], page=page, page_size=page_size, total=total)


@router.post("/{notification_id}/read", response_model=NotificationOut)
def mark_read(
    notification_id: UUID,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> Notification:
    note = db.get(Notification, notification_id)
    if not note or note.user_id != user.id:
        raise AppError(404, "Not Found", "Notification not found")
    note.read_at = datetime.now(UTC)
    db.commit()
    db.refresh(note)
    return note


@router.post("/emit-job")
def emit_job_notification(
    kind: str = "lint",
    success: bool = True,
    request_id: str | None = None,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict[str, str]:
    payload = {
        "kind": kind,
        "success": success,
        "request_id": request_id,
        "message": f"{kind.upper()} job {'completed' if success else 'failed'}",
        "href": f"/marketplace/requests/{request_id}" if request_id else "/marketplace/requests",
    }
    note = Notification(org_id=user.org_id, user_id=user.id, type="job", payload=payload)
    db.add(note)
    db.flush()
    write_audit(
        db,
        org_id=user.org_id,
        actor_user_id=user.id,
        action="notification.emit_job",
        entity="notification",
        entity_id=str(note.id),
        payload=payload,
    )
    db.commit()
    return {"status": "ok", "notification_id": str(note.id)}


@router.get("/stream")
def notification_stream(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> StreamingResponse:
    def event_iter():
        last_seen = datetime.now(UTC)
        while True:
            rows = db.scalars(
                select(Notification)
                .where(Notification.user_id == user.id, Notification.created_at > last_seen)
                .order_by(Notification.created_at.asc())
            ).all()
            for row in rows:
                payload = NotificationOut.model_validate(row).model_dump(mode="json")
                yield f"event: notification\ndata: {json.dumps(payload)}\n\n"
                if row.created_at > last_seen:
                    last_seen = row.created_at
            # keep-alive ping
            yield "event: ping\ndata: {}\n\n"
            time.sleep(2)

    return StreamingResponse(event_iter(), media_type="text/event-stream")
