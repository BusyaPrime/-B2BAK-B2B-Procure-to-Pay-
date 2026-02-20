from uuid import UUID

from fastapi import APIRouter, Depends, Header
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from app.audit import write_audit
from app.deps import get_current_user, get_db, require_roles
from app.exceptions import AppError
from app.models import Deal, IdempotencyKey, Quote, QuoteStatus, Request, RequestStatus, Role, User
from app.queue import get_queue, publish_notification_job
from app.schemas import AwardPayload, Paginated, RequestCreate, RequestOut, RequestPatch

router = APIRouter(prefix="/requests", tags=["requests"])


@router.get("", response_model=Paginated)
def list_requests(
    status: RequestStatus | None = None,
    search: str | None = None,
    page: int = 1,
    page_size: int = 20,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> Paginated:
    if user.role in [Role.VENDOR, Role.VIEWER]:
        # Vendors/viewers can browse open marketplace requests.
        query = select(Request).where(Request.status.in_([RequestStatus.PUBLISHED, RequestStatus.QUOTING, RequestStatus.SHORTLIST]))
    else:
        query = select(Request).where(Request.buyer_org_id == user.org_id)
    if status:
        query = query.where(Request.status == status)
    if search:
        query = query.where(or_(Request.title.ilike(f"%{search}%"), Request.description.ilike(f"%{search}%")))
    total = db.scalar(select(func.count()).select_from(query.subquery())) or 0
    items = db.scalars(query.order_by(Request.created_at.desc()).offset((page - 1) * page_size).limit(page_size)).all()
    return Paginated(items=[RequestOut.model_validate(item) for item in items], page=page, page_size=page_size, total=total)


@router.post("", response_model=RequestOut)
def create_request(
    payload: RequestCreate,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles([Role.ORG_OWNER, Role.ADMIN, Role.BUYER])),
) -> Request:
    req = Request(
        buyer_org_id=user.org_id,
        title=payload.title,
        description=payload.description,
        budget_cents=payload.budget_cents,
        currency=payload.currency,
        deadline_date=payload.deadline_date,
        tags=payload.tags,
        status=RequestStatus.DRAFT,
    )
    db.add(req)
    db.flush()
    write_audit(
        db,
        org_id=user.org_id,
        actor_user_id=user.id,
        action="request.create",
        entity="request",
        entity_id=str(req.id),
        payload={"title": payload.title},
    )
    db.commit()
    db.refresh(req)
    return req


@router.get("/{request_id}", response_model=RequestOut)
def get_request(
    request_id: UUID,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> Request:
    req = db.get(Request, request_id)
    if not req:
        raise AppError(404, "Not Found", "Request not found")
    if req.buyer_org_id == user.org_id:
        return req
    if user.role in [Role.VENDOR, Role.VIEWER] and req.status in [RequestStatus.PUBLISHED, RequestStatus.QUOTING, RequestStatus.SHORTLIST]:
        return req
    raise AppError(404, "Not Found", "Request not found")


@router.patch("/{request_id}", response_model=RequestOut)
def patch_request(
    request_id: UUID,
    payload: RequestPatch,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles([Role.ORG_OWNER, Role.ADMIN, Role.BUYER])),
) -> Request:
    req = db.get(Request, request_id)
    if not req or req.buyer_org_id != user.org_id:
        raise AppError(404, "Not Found", "Request not found")
    if req.status != RequestStatus.DRAFT:
        raise AppError(400, "Invalid State", "Only draft requests are editable")
    for field, value in payload.model_dump(exclude_none=True).items():
        setattr(req, field, value)
    write_audit(
        db,
        org_id=user.org_id,
        actor_user_id=user.id,
        action="request.update",
        entity="request",
        entity_id=str(req.id),
        payload=payload.model_dump(exclude_none=True),
    )
    db.commit()
    db.refresh(req)
    return req


@router.post("/{request_id}/publish", response_model=RequestOut)
def publish_request(
    request_id: UUID,
    idempotency_key: str | None = Header(default=None, alias="Idempotency-Key"),
    db: Session = Depends(get_db),
    user: User = Depends(require_roles([Role.ORG_OWNER, Role.ADMIN, Role.BUYER])),
) -> Request:
    req = db.get(Request, request_id)
    if not req or req.buyer_org_id != user.org_id:
        raise AppError(404, "Not Found", "Request not found")
    if idempotency_key:
        existing = db.scalar(
            select(IdempotencyKey).where(
                IdempotencyKey.org_id == user.org_id,
                IdempotencyKey.key == idempotency_key,
                IdempotencyKey.endpoint == f"requests/{request_id}/publish",
            )
        )
        if existing:
            return req
        db.add(
            IdempotencyKey(
                org_id=user.org_id,
                key=idempotency_key,
                endpoint=f"requests/{request_id}/publish",
            )
        )
    if req.status == RequestStatus.QUOTING:
        return req
    if req.status != RequestStatus.DRAFT:
        raise AppError(400, "Invalid State", "Request cannot be published")
    req.status = RequestStatus.QUOTING
    get_queue().enqueue(publish_notification_job, str(req.id))
    write_audit(
        db,
        org_id=user.org_id,
        actor_user_id=user.id,
        action="request.publish",
        entity="request",
        entity_id=str(req.id),
    )
    db.commit()
    db.refresh(req)
    return req


@router.post("/{request_id}/shortlist", response_model=RequestOut)
def shortlist_request(
    request_id: UUID,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles([Role.ORG_OWNER, Role.ADMIN, Role.BUYER])),
) -> Request:
    req = db.get(Request, request_id)
    if not req or req.buyer_org_id != user.org_id:
        raise AppError(404, "Not Found", "Request not found")
    if req.status != RequestStatus.QUOTING:
        raise AppError(400, "Invalid State", "Only quoting requests can be shortlisted")
    req.status = RequestStatus.SHORTLIST
    write_audit(
        db,
        org_id=user.org_id,
        actor_user_id=user.id,
        action="request.shortlist",
        entity="request",
        entity_id=str(req.id),
    )
    db.commit()
    db.refresh(req)
    return req


@router.post("/{request_id}/award")
def award_request(
    request_id: UUID,
    payload: AwardPayload,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles([Role.ORG_OWNER, Role.ADMIN, Role.BUYER])),
) -> dict[str, str]:
    req = db.get(Request, request_id)
    if not req or req.buyer_org_id != user.org_id:
        raise AppError(404, "Not Found", "Request not found")
    if req.status != RequestStatus.SHORTLIST:
        raise AppError(400, "Invalid State", "Only shortlisted requests can be awarded")
    winner = db.get(Quote, payload.winning_quote_id)
    if not winner or winner.request_id != req.id:
        raise AppError(404, "Not Found", "Winning quote not found")
    quotes = db.scalars(select(Quote).where(Quote.request_id == req.id)).all()
    for quote in quotes:
        quote.status = QuoteStatus.ACCEPTED if quote.id == winner.id else QuoteStatus.REJECTED
    req.status = RequestStatus.AWARDED
    deal = Deal(
        buyer_org_id=req.buyer_org_id,
        vendor_org_id=winner.vendor_org_id,
        request_id=req.id,
        winning_quote_id=winner.id,
    )
    db.add(deal)
    db.flush()
    write_audit(
        db,
        org_id=user.org_id,
        actor_user_id=user.id,
        action="request.award",
        entity="request",
        entity_id=str(req.id),
        payload={"winning_quote_id": str(winner.id)},
    )
    db.commit()
    return {"deal_id": str(deal.id)}
