"""FastAPI dependencies: current user / guest identity, rate limiting."""
from __future__ import annotations

import re
import threading
import time
from collections import defaultdict, deque
from dataclasses import dataclass

from fastapi import Depends, Header, HTTPException, Request, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.config import Settings, get_settings
from app.database import get_db
from app.models import Scan, User
from app.security import decode_access_token

bearer_scheme = HTTPBearer(auto_error=False)
GUEST_ID_RE = re.compile(r"^[A-Za-z0-9_-]{16,64}$")


@dataclass
class Owner:
    """Who owns a scan: a logged-in user OR an anonymous browser (guest id)."""

    user: User | None = None
    guest_id: str | None = None

    def scan_filter(self):
        if self.user is not None:
            return Scan.user_id == self.user.id
        return (Scan.guest_id == self.guest_id) & (Scan.user_id.is_(None))


def get_optional_user(
    creds: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    db: Session = Depends(get_db),
) -> User | None:
    if creds is None:
        return None
    user_id = decode_access_token(creds.credentials)
    if user_id is None:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid or expired token.")
    user = db.get(User, user_id)
    if user is None:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid or expired token.")
    return user


def get_current_user(user: User | None = Depends(get_optional_user)) -> User:
    if user is None:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Authentication required.")
    return user


def get_owner(
    user: User | None = Depends(get_optional_user),
    x_guest_id: str | None = Header(default=None),
    settings: Settings = Depends(get_settings),
) -> Owner:
    if user is not None:
        return Owner(user=user)
    if settings.require_auth:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Please sign in to use this feature.")
    if x_guest_id and GUEST_ID_RE.match(x_guest_id):
        return Owner(guest_id=x_guest_id)
    raise HTTPException(status.HTTP_400_BAD_REQUEST, "Missing or invalid X-Guest-Id header.")


class SlidingWindowLimiter:
    """Tiny in-memory per-key limiter. Use Redis or a gateway limiter if you run several instances."""

    def __init__(self) -> None:
        self._hits: dict[str, deque[float]] = defaultdict(deque)
        self._lock = threading.Lock()

    def allow(self, key: str, limit: int, window: float = 60.0) -> bool:
        now = time.monotonic()
        with self._lock:
            q = self._hits[key]
            while q and now - q[0] > window:
                q.popleft()
            if len(q) >= limit:
                return False
            q.append(now)
            return True

    def reset(self) -> None:
        with self._lock:
            self._hits.clear()


limiter = SlidingWindowLimiter()


def client_ip(request: Request, settings: Settings) -> str:
    if settings.trust_proxy_headers:
        fwd = request.headers.get("x-forwarded-for")
        if fwd:
            return fwd.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


def rate_limit(request: Request, settings: Settings = Depends(get_settings)) -> None:
    key = f"{request.url.path}:{client_ip(request, settings)}"
    if not limiter.allow(key, settings.scan_rate_limit_per_minute):
        raise HTTPException(status.HTTP_429_TOO_MANY_REQUESTS, "Too many requests. Please wait a minute and try again.")
