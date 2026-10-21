from __future__ import annotations

from fastapi import APIRouter, Depends, Header, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import GUEST_ID_RE, get_optional_user, rate_limit
from app.models import Feedback, Scan, User
from app.schemas import FeedbackCreate, FeedbackOut

router = APIRouter(prefix="/api/feedback", tags=["feedback"])


@router.post("", response_model=FeedbackOut, status_code=201, dependencies=[Depends(rate_limit)])
def create_feedback(
    body: FeedbackCreate,
    user: User | None = Depends(get_optional_user),
    x_guest_id: str | None = Header(default=None),
    db: Session = Depends(get_db),
):
    guest = x_guest_id if x_guest_id and GUEST_ID_RE.match(x_guest_id) else None
    if body.scan_id:
        owner_cond = (Scan.user_id == user.id) if user else ((Scan.guest_id == guest) & Scan.user_id.is_(None))
        if guest is None and user is None or db.scalar(select(Scan.id).where(Scan.id == body.scan_id, owner_cond)) is None:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Scan not found.")
    fb = Feedback(user_id=user.id if user else None, guest_id=None if user else guest, scan_id=body.scan_id,
                  category=body.category, rating=body.rating, message=body.message.strip(),
                  email=body.email)
    db.add(fb)
    db.commit()
    return FeedbackOut(id=fb.id, created_at=fb.created_at)
