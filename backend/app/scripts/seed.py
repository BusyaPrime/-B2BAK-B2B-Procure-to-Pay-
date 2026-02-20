from __future__ import annotations

import argparse
from datetime import date, timedelta

from sqlalchemy import delete, select
from sqlalchemy.orm import Session

from app.audit import write_audit
from app.db import SessionLocal
from app.models import (
    AuditLog,
    BuyerProfile,
    Deal,
    DealStatus,
    IdempotencyKey,
    Invoice,
    InvoiceStatus,
    Message,
    Notification,
    Organization,
    Quote,
    QuoteStatus,
    Request,
    RequestStatus,
    Role,
    User,
    VendorProfile,
    Invite,
)
from app.security import hash_password


def reset_data(db: Session) -> None:
    for model in [Notification, Invite, Message, Invoice, Deal, Quote, Request, AuditLog, IdempotencyKey, VendorProfile, BuyerProfile, User, Organization]:
        db.execute(delete(model))
    db.commit()


def seed_data(db: Session) -> None:
    existing_org = db.scalar(select(Organization).where(Organization.name == "Demo Inc"))
    if existing_org:
        org = existing_org
    else:
        org = Organization(name="Demo Inc")
        db.add(org)
        db.flush()

    demo_users = [
        ("buyer@demo.local", Role.BUYER),
        ("vendor@demo.local", Role.VENDOR),
        ("admin@demo.local", Role.ADMIN),
        ("owner@demo.local", Role.ORG_OWNER),
        ("viewer@demo.local", Role.VIEWER),
    ]
    created_users: dict[Role, User] = {}
    for email, role in demo_users:
        user = db.scalar(select(User).where(User.email == email))
        if user is None:
            user = User(org_id=org.id, email=email, password_hash=hash_password("Demo12345!"), role=role)
            db.add(user)
            db.flush()
        created_users[role] = user

    buyer = created_users[Role.BUYER]
    vendor = created_users[Role.VENDOR]
    admin = created_users[Role.ADMIN]

    if existing_org:
        db.commit()
        return

    db.add(BuyerProfile(org_id=org.id, departments=["Operations", "Procurement"]))
    db.add(VendorProfile(org_id=org.id, company_name="Demo Vendor Co", industries=["SaaS"], regions=["NA"], sla_level="PREMIUM"))

    req_draft = Request(
        buyer_org_id=org.id,
        title="Draft Security Audit",
        description="Quarterly SOC2 gap audit project draft.",
        budget_cents=1500000,
        currency="USD",
        deadline_date=date.today() + timedelta(days=20),
        tags=["security", "audit"],
        status=RequestStatus.DRAFT,
    )
    req_published = Request(
        buyer_org_id=org.id,
        title="Cloud Cost Optimization",
        description="Need vendor support for cloud cost optimization.",
        budget_cents=2500000,
        currency="USD",
        deadline_date=date.today() + timedelta(days=30),
        tags=["cloud", "finops"],
        status=RequestStatus.QUOTING,
    )
    req_shortlist = Request(
        buyer_org_id=org.id,
        title="B2B UX Redesign",
        description="Need premium UX redesign support.",
        budget_cents=4000000,
        currency="USD",
        deadline_date=date.today() + timedelta(days=45),
        tags=["design", "frontend"],
        status=RequestStatus.SHORTLIST,
    )
    db.add_all([req_draft, req_published, req_shortlist])
    db.flush()

    q1 = Quote(
        request_id=req_shortlist.id,
        vendor_org_id=org.id,
        amount_cents=3800000,
        timeline_days=35,
        terms="Fixed scope with two revisions.",
        status=QuoteStatus.SUBMITTED,
    )
    q2 = Quote(
        request_id=req_shortlist.id,
        vendor_org_id=org.id,
        amount_cents=3600000,
        timeline_days=40,
        terms="Milestone billing and QA support included.",
        status=QuoteStatus.UPDATED,
    )
    db.add_all([q1, q2])
    db.flush()

    deal = Deal(
        buyer_org_id=org.id,
        vendor_org_id=org.id,
        request_id=req_shortlist.id,
        winning_quote_id=q2.id,
        status=DealStatus.INVOICED,
    )
    db.add(deal)
    db.flush()

    invoice = Invoice(
        deal_id=deal.id,
        amount_cents=q2.amount_cents,
        currency="USD",
        status=InvoiceStatus.DRAFT,
    )
    db.add(invoice)
    db.flush()

    db.add(Message(deal_id=deal.id, sender_user_id=buyer.id, body="Kickoff call tomorrow at 10 AM."))
    db.add(Message(deal_id=deal.id, sender_user_id=vendor.id, body="Confirmed. We'll share the agenda."))
    db.add(
        Notification(
            org_id=org.id,
            user_id=buyer.id,
            type="team-invitation",
            payload={"message": "Owner invited admin@demo.local to the project workspace.", "href": "/marketplace/requests"},
        )
    )
    db.add(
        Invite(
            org_id=org.id,
            email="new.member@demo.local",
            role=Role.VIEWER,
            status="PENDING",
            created_by_user_id=admin.id,
        )
    )

    write_audit(db, org_id=org.id, actor_user_id=admin.id, action="seed.create", entity="system", entity_id="bootstrap", payload={"source": "seed.py"})
    write_audit(db, org_id=org.id, actor_user_id=buyer.id, action="request.create", entity="request", entity_id=str(req_draft.id))
    write_audit(db, org_id=org.id, actor_user_id=buyer.id, action="request.shortlist", entity="request", entity_id=str(req_shortlist.id))
    db.commit()


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--reset", action="store_true")
    args = parser.parse_args()
    with SessionLocal() as db:
        if args.reset:
            reset_data(db)
        seed_data(db)


if __name__ == "__main__":
    main()
