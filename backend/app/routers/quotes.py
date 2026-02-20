from uuid import UUID

from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.audit import write_audit
from app.deps import get_current_user, get_db, require_roles
from app.exceptions import AppError
from app.models import Quote, QuoteStatus, Request, RequestStatus, Role, User
from app.schemas import Paginated, QuoteCreate, QuoteOut, QuotePatch

router = APIRouter(prefix="/quotes", tags=["quotes"])


@router.get("", response_model=Paginated)
def list_quotes(
    request_id: UUID | None = None,
    page: int = 1,
    page_size: int = 20,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> Paginated:
    if request_id and user.role in [Role.BUYER, Role.ADMIN, Role.ORG_OWNER]:
        req = db.get(Request, request_id)
        if not req or req.buyer_org_id != user.org_id:
            raise AppError(404, "Not Found", "Request not found")
        query = select(Quote).where(Quote.request_id == request_id)
    else:
        query = select(Quote).where(Quote.vendor_org_id == user.org_id)
        if request_id:
            query = query.where(Quote.request_id == request_id)
    total = db.scalar(select(func.count()).select_from(query.subquery())) or 0
    items = db.scalars(query.order_by(Quote.created_at.desc()).offset((page - 1) * page_size).limit(page_size)).all()
    return Paginated(items=[QuoteOut.model_validate(item) for item in items], page=page, page_size=page_size, total=total)


@router.post("", response_model=QuoteOut)
def create_quote(
    payload: QuoteCreate,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles([Role.ORG_OWNER, Role.ADMIN, Role.VENDOR])),
) -> Quote:
    req = db.get(Request, payload.request_id)
    if not req:
        raise AppError(404, "Not Found", "Request not found")
    if req.status not in [RequestStatus.PUBLISHED, RequestStatus.QUOTING, RequestStatus.SHORTLIST]:
        raise AppError(400, "Invalid State", "Request not open for quoting")
    quote = Quote(
        request_id=payload.request_id,
        vendor_org_id=user.org_id,
        amount_cents=payload.amount_cents,
        timeline_days=payload.timeline_days,
        terms=payload.terms,
        status=QuoteStatus.SUBMITTED,
    )
    db.add(quote)
    db.flush()
    write_audit(
        db,
        org_id=user.org_id,
        actor_user_id=user.id,
        action="quote.create",
        entity="quote",
        entity_id=str(quote.id),
        payload={"request_id": str(payload.request_id)},
    )
    db.commit()
    db.refresh(quote)
    return quote


@router.patch("/{quote_id}", response_model=QuoteOut)
def patch_quote(
    quote_id: UUID,
    payload: QuotePatch,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles([Role.ORG_OWNER, Role.ADMIN, Role.VENDOR])),
) -> Quote:
    quote = db.get(Quote, quote_id)
    if not quote or quote.vendor_org_id != user.org_id:
        raise AppError(404, "Not Found", "Quote not found")
    if quote.status in [QuoteStatus.WITHDRAWN, QuoteStatus.ACCEPTED, QuoteStatus.REJECTED]:
        raise AppError(400, "Invalid State", "Quote cannot be updated")
    for field, value in payload.model_dump(exclude_none=True).items():
        setattr(quote, field, value)
    quote.status = QuoteStatus.UPDATED
    write_audit(
        db,
        org_id=user.org_id,
        actor_user_id=user.id,
        action="quote.update",
        entity="quote",
        entity_id=str(quote.id),
        payload=payload.model_dump(exclude_none=True),
    )
    db.commit()
    db.refresh(quote)
    return quote


@router.post("/{quote_id}/withdraw", response_model=QuoteOut)
def withdraw_quote(
    quote_id: UUID,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles([Role.ORG_OWNER, Role.ADMIN, Role.VENDOR])),
) -> Quote:
    quote = db.get(Quote, quote_id)
    if not quote or quote.vendor_org_id != user.org_id:
        raise AppError(404, "Not Found", "Quote not found")
    if quote.status in [QuoteStatus.ACCEPTED, QuoteStatus.REJECTED]:
        raise AppError(400, "Invalid State", "Awarded/rejected quote cannot be withdrawn")
    quote.status = QuoteStatus.WITHDRAWN
    write_audit(
        db,
        org_id=user.org_id,
        actor_user_id=user.id,
        action="quote.withdraw",
        entity="quote",
        entity_id=str(quote.id),
    )
    db.commit()
    db.refresh(quote)
    return quote
