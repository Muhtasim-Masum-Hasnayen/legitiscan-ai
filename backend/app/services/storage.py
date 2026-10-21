"""Filesystem storage for sanitised scan images. File names are server-generated only."""
from __future__ import annotations

import shutil
from pathlib import Path

from app.config import Settings


def scan_dir(settings: Settings, scan_id: str) -> Path:
    return Path(settings.upload_dir) / scan_id


def image_path(settings: Settings, scan_id: str, position: int) -> Path:
    return scan_dir(settings, scan_id) / f"{position}.jpg"


def save_image(settings: Settings, scan_id: str, position: int, data: bytes) -> Path:
    path = image_path(settings, scan_id, position)
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_bytes(data)
    return path


def delete_scan_files(settings: Settings, scan_id: str) -> None:
    shutil.rmtree(scan_dir(settings, scan_id), ignore_errors=True)
