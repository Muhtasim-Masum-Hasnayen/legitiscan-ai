"""Extract verifiable fields (batch codes, dates, barcodes) from OCR text."""
from __future__ import annotations

import re

BATCH_RE = re.compile(
    r"(?i)\b(?:batch|lot|b\.?\s?no|b/n)\b\.?\s*(?:no\.?|number|#|:)?\s*[:\-]?\s*([A-Z0-9][A-Z0-9\-/]{2,19})"
)
DATE_RE = re.compile(
    r"(?i)\b(EXP(?:IRY)?|MFG|MFD|BEST BEFORE|USE BY)\b\.?\s*[:\-]?\s*"
    r"(\d{1,2}[/\-.]\d{2,4}(?:[/\-.]\d{2,4})?|[A-Z]{3,9}\.?\s*\d{2,4})"
)
DIGIT_RUN_RE = re.compile(r"\d(?:[ \-]?\d){7,12}")


def ean_check_digit_valid(code: str) -> bool:
    """Validate EAN-8 / UPC-A (12) / EAN-13 check digits."""
    if not code.isdigit() or len(code) not in (8, 12, 13):
        return False
    digits = [int(c) for c in code]
    total = sum(d * (3 if i % 2 == 0 else 1) for i, d in enumerate(reversed(digits[:-1])))
    return (10 - total % 10) % 10 == digits[-1]


def extract_fields(text: str) -> dict:
    batch_codes: list[str] = []
    for m in BATCH_RE.finditer(text):
        code = m.group(1).upper()
        if code not in batch_codes:
            batch_codes.append(code)

    dates = []
    for m in DATE_RE.finditer(text):
        item = {"label": m.group(1).upper(), "value": m.group(2).strip()}
        if item not in dates:
            dates.append(item)

    barcodes = []
    seen: set[str] = set()
    for m in DIGIT_RUN_RE.finditer(text):
        digits = re.sub(r"[ \-]", "", m.group(0))
        if len(digits) in (8, 12, 13) and digits not in seen:
            seen.add(digits)
            barcodes.append({"value": digits, "valid_check_digit": ean_check_digit_valid(digits)})

    return {"batch_codes": batch_codes, "dates": dates, "barcodes": barcodes}
