from datetime import UTC, datetime
from uuid import UUID

from fastapi import APIRouter, Depends
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from app.audit import write_audit
from app.deps import get_current_user, get_db, require_roles
from app.exceptions import AppError
from app.models import Deal, DealStatus, Invoice, InvoiceStatus, Quote, Role, User
from app.schemas import DealOut, InvoiceOut, Paginated

router = APIRouter(prefix="/deals", tags=["deals"])


@router.get("", response_model=Paginated)
def list_deals(
    status: DealStatus | None = None,
    page: int = 1,
    page_size: int = 20,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> Paginated:
    query = select(Deal).where(or_(Deal.buyer_org_id == user.org_id, Deal.vendor_org_id == user.org_id))
    if status:
        query = query.where(Deal.status == status)
    total = db.scalar(select(func.count()).select_from(query.subquery())) or 0
    items = db.scalars(query.order_by(Deal.created_at.desc()).offset((page - 1) * page_size).limit(page_size)).all()
    return Paginated(items=[DealOut.model_validate(item) for item in items], page=page, page_size=page_size, total=total)


@router.get("/{deal_id}", response_model=DealOut)
def get_deal(
    deal_id: UUID,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> Deal:
    deal = db.get(Deal, deal_id)
    if not deal or (deal.buyer_org_id != user.org_id and deal.vendor_org_id != user.org_id):
        raise AppError(404, "Not Found", "Deal not found")
    return deal


@router.post("/{deal_id}/create-invoice", response_model=InvoiceOut)
def create_invoice(
    deal_id: UUID,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles([Role.ORG_OWNER, Role.ADMIN, Role.BUYER])),
) -> Invoice:
    deal = db.get(Deal, deal_id)
    if not deal or deal.buyer_org_id != user.org_id:
        raise AppError(404, "Not Found", "Deal not found")
    existing = db.scalar(select(Invoice).where(Invoice.deal_id == deal.id))
    if existing:
        return existing
    winning = db.get(Quote, deal.winning_quote_id) if deal.winning_quote_id else None
    amount = winning.amount_cents if winning else 0
    invoice = Invoice(
        deal_id=deal.id,
        amount_cents=amount,
        currency="USD",
        status=InvoiceStatus.DRAFT,
        issued_at=datetime.now(UTC),
    )
    deal.status = DealStatus.INVOICED
    db.add(invoice)
    write_audit(
        db,
        org_id=user.org_id,
        actor_user_id=user.id,
        action="deal.create_invoice",
        entity="deal",
        entity_id=str(deal.id),
    )
    db.commit()
    db.refresh(invoice)
    return invoice


@router.post("/{deal_id}/mark-paid", response_model=DealOut)
def mark_paid(
    deal_id: UUID,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles([Role.ORG_OWNER, Role.ADMIN, Role.BUYER])),
) -> Deal:
    deal = db.get(Deal, deal_id)
    if not deal or deal.buyer_org_id != user.org_id:
        raise AppError(404, "Not Found", "Deal not found")
    invoice = db.scalar(select(Invoice).where(Invoice.deal_id == deal.id))
    if not invoice:
        raise AppError(400, "Invalid State", "Invoice does not exist")
    invoice.status = InvoiceStatus.PAID
    invoice.paid_at = datetime.now(UTC)
    deal.status = DealStatus.PAID
    write_audit(
        db,
        org_id=user.org_id,
        actor_user_id=user.id,
        action="deal.mark_paid",
        entity="deal",
        entity_id=str(deal.id),
        payload={"invoice_id": str(invoice.id)},
    )
    db.commit()
    db.refresh(deal)
    return deal
