"""Pydantic request/response schemas."""
from __future__ import annotations

from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator

Verdict = Literal["likely_authentic", "potentially_counterfeit", "inconclusive"]


class UserCreate(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=72)
    name: str | None = Field(default=None, max_length=80)

    @field_validator("email")
    @classmethod
    def _lower(cls, v: str) -> str:
        return v.lower()


class UserLogin(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1, max_length=72)

    @field_validator("email")
    @classmethod
    def _lower(cls, v: str) -> str:
        return v.lower()


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    email: str
    name: str | None = None


class TokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut


class ScanImageOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    position: int
    original_name: str
    width: int
    height: int
    size_bytes: int


class ScanSummary(BaseModel):
    id: str
    status: str
    verdict: Verdict | None = None
    authenticity_score: float | None = None
    headline: str | None = None
    brand_hint: str | None = None
    product_hint: str | None = None
    image_count: int = 0
    created_at: datetime


class ScanDetail(ScanSummary):
    images: list[ScanImageOut] = []
    result: dict[str, Any] | None = None
    error: str | None = None


class ScanList(BaseModel):
    items: list[ScanSummary]
    total: int
    page: int
    page_size: int


FeedbackCategory = Literal["bug", "wrong_result", "feature", "general"]


class FeedbackCreate(BaseModel):
    category: FeedbackCategory = "general"
    rating: int | None = Field(default=None, ge=1, le=5)
    message: str = Field(min_length=10, max_length=2000)
    email: EmailStr | None = None
    scan_id: str | None = Field(default=None, max_length=36)


class FeedbackOut(BaseModel):
    id: int
    created_at: datetime
