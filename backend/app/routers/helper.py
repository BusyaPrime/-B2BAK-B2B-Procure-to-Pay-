from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.deps import get_current_user, get_db
from app.models import User
from app.schemas import SuggestionOut, SuggestionPrompt

router = APIRouter(prefix="/helper", tags=["helper"])


@router.post("/suggest", response_model=SuggestionOut)
def suggest(
    payload: SuggestionPrompt,
    db: Session = Depends(get_db),
    _user: User = Depends(get_current_user),
) -> SuggestionOut:
    _ = db
    base = payload.prompt.strip()
    return SuggestionOut(
        title=f"Requirements Helper: {payload.context_type}",
        suggestions=[
            f"Clarify acceptance criteria for context {payload.context_id}.",
            f"Add budget guardrails and deadline constraints based on: {base[:90]}",
            "Document non-functional requirements: SLA, security, observability.",
            "Split delivery into milestones and define measurable outputs per milestone.",
        ],
        disclaimer="Review suggestions manually.",
    )
