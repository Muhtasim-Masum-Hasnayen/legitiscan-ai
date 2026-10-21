from __future__ import annotations

from fastapi import APIRouter, Depends, Header, HTTPException, status
from sqlalchemy import select, update
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import GUEST_ID_RE, get_current_user, rate_limit
from app.models import Scan, User
from app.schemas import TokenOut, UserCreate, UserLogin, UserOut
from app.security import DUMMY_HASH, create_access_token, hash_password, verify_password

router = APIRouter(prefix="/api/auth", tags=["auth"])


def _claim_guest_scans(db: Session, user: User, guest_id: str | None) -> None:
    """Move scans made anonymously in this browser onto the account that just signed in."""
    if guest_id and GUEST_ID_RE.match(guest_id):
        db.execute(update(Scan).where(Scan.guest_id == guest_id, Scan.user_id.is_(None))
                   .values(user_id=user.id, guest_id=None))
        db.commit()


@router.post("/register", response_model=TokenOut, status_code=201, dependencies=[Depends(rate_limit)])
def register(body: UserCreate, db: Session = Depends(get_db), x_guest_id: str | None = Header(default=None)):
    if db.scalar(select(User).where(User.email == body.email)):
        raise HTTPException(status.HTTP_409_CONFLICT, "An account with this email already exists.")
    user = User(email=body.email, name=(body.name or "").strip() or None, password_hash=hash_password(body.password))
    db.add(user)
    db.commit()
    _claim_guest_scans(db, user, x_guest_id)
    return TokenOut(access_token=create_access_token(user.id), user=UserOut.model_validate(user))


@router.post("/login", response_model=TokenOut, dependencies=[Depends(rate_limit)])
def login(body: UserLogin, db: Session = Depends(get_db), x_guest_id: str | None = Header(default=None)):
    user = db.scalar(select(User).where(User.email == body.email))
    ok = verify_password(body.password, user.password_hash if user else DUMMY_HASH)
    if not user or not ok:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Incorrect email or password.")
    _claim_guest_scans(db, user, x_guest_id)
    return TokenOut(access_token=create_access_token(user.id), user=UserOut.model_validate(user))


@router.get("/me", response_model=UserOut)
def me(user: User = Depends(get_current_user)):
    return user
