"""Shared types for the AI components."""
from __future__ import annotations

from dataclasses import asdict, dataclass, field


class ComponentUnavailable(Exception):
    """Raised when a component cannot run because an asset/dependency is missing or invalid."""


@dataclass
class AssetStatus:
    key: str
    name: str
    available: bool
    detail: str
    missing: list[str] = field(default_factory=list)
    how_to_fix: str = ""

    def to_dict(self) -> dict:
        return asdict(self)
