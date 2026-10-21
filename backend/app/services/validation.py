"""Secure image upload validation + sanitisation.

Every upload is decoded with Pillow, EXIF-rotated, stripped of metadata, flattened to RGB,
size-capped and re-encoded as JPEG. The original bytes are never stored or served.
"""
from __future__ import annotations

import hashlib
import io
import os
import re
from dataclasses import dataclass

from fastapi import UploadFile
from PIL import Image, ImageOps, UnidentifiedImageError

from app.config import Settings

Image.MAX_IMAGE_PIXELS = 50_000_000  # decompression-bomb guard
ALLOWED_FORMATS = {"JPEG", "PNG", "WEBP"}


class ImageValidationError(Exception):
    """Raised with a user-safe message."""


@dataclass
class ProcessedImage:
    image: Image.Image
    data: bytes  # sanitised JPEG bytes
    original_name: str
    width: int
    height: int
    size_bytes: int
    sha256: str


def _safe_name(name: str | None) -> str:
    base = os.path.basename(name or "upload")
    base = re.sub(r"[^A-Za-z0-9._ -]", "_", base)[:120]
    return base or "upload"


def process_upload(upload: UploadFile, settings: Settings) -> ProcessedImage:
    name = _safe_name(upload.filename)
    raw = upload.file.read(settings.max_upload_bytes + 1)
    if not raw:
        raise ImageValidationError(f"'{name}' is empty.")
    if len(raw) > settings.max_upload_bytes:
        raise ImageValidationError(f"'{name}' is larger than {settings.max_upload_mb} MB.")

    try:
        probe = Image.open(io.BytesIO(raw))
        fmt = probe.format
        probe.verify()
    except (UnidentifiedImageError, Image.DecompressionBombError, OSError, SyntaxError, ValueError):
        raise ImageValidationError(f"'{name}' is not a valid image file.") from None
    if fmt not in ALLOWED_FORMATS:
        raise ImageValidationError(f"'{name}' must be a JPEG, PNG or WebP image.")

    try:
        img = Image.open(io.BytesIO(raw))
        img = ImageOps.exif_transpose(img)
        if img.mode in ("RGBA", "LA", "P"):
            img = img.convert("RGBA")
            bg = Image.new("RGB", img.size, (255, 255, 255))
            bg.paste(img, mask=img.split()[-1])
            img = bg
        else:
            img = img.convert("RGB")
    except (OSError, Image.DecompressionBombError, ValueError):
        raise ImageValidationError(f"'{name}' could not be decoded.") from None

    if min(img.size) < settings.min_image_side:
        raise ImageValidationError(
            f"'{name}' is too small ({img.width}x{img.height}). Use at least {settings.min_image_side}px on the short side."
        )
    if max(img.size) > settings.max_image_side:
        img.thumbnail((settings.max_image_side, settings.max_image_side), Image.LANCZOS)

    buf = io.BytesIO()
    img.save(buf, format="JPEG", quality=90, optimize=True)  # no EXIF is written
    data = buf.getvalue()
    return ProcessedImage(
        image=img,
        data=data,
        original_name=name,
        width=img.width,
        height=img.height,
        size_bytes=len(data),
        sha256=hashlib.sha256(data).hexdigest(),
    )
