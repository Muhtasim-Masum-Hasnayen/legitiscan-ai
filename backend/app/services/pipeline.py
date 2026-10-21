"""Orchestrates quality checks, ResNet50, EasyOCR and Sentence-BERT into one evidence report.

Design rules:
  * Every component is optional. If one is unavailable or crashes, that is recorded in the report
    (never silently skipped, never faked) and the verdict is computed from what actually ran.
  * With no usable AI signal the verdict is always "inconclusive".
"""
from __future__ import annotations

import logging
from typing import Any

from PIL import Image

from app.config import Settings
from app.ml.base import AssetStatus, ComponentUnavailable
from app.services.quality import analyze_quality
from app.services.text_fields import extract_fields
from app.services.verdict import (
    DISCLAIMER, RECOMMENDATIONS, Signal, Thresholds, decide,
)

log = logging.getLogger(__name__)

# Cosine similarity range mapped linearly onto a 0..1 "authenticity" signal.
# Starting values only - calibrate on your own validation data (docs/MODEL_INTEGRATION.md).
TEXT_SIM_LOW, TEXT_SIM_HIGH = 0.35, 0.80

W_CLASSIFIER, W_TEXT, W_BARCODE = 0.55, 0.30, 0.15


def _clamp(x: float) -> float:
    return max(0.0, min(1.0, x))


def _severity(a: float) -> str:
    return "positive" if a >= 0.75 else "negative" if a <= 0.30 else "warning"


class ScanPipeline:
    def __init__(self, classifier: Any, ocr: Any, matcher: Any, settings: Settings) -> None:
        self.classifier, self.ocr, self.matcher, self.s = classifier, ocr, matcher, settings

    def asset_status(self) -> list[AssetStatus]:
        return [self.classifier.status(), self.ocr.status(), self.matcher.status()]

    # ------------------------------------------------------------------ main entry
    def analyze(self, images: list[Image.Image], brand_hint: str | None = None,
                product_hint: str | None = None) -> dict:
        statuses = {st.key: st for st in self.asset_status()}
        signals: list[Signal] = []
        evidence: list[dict] = []
        unavailable_notes: dict[str, str] = {}

        # 1. Image quality (always available, no model needed)
        quality = [analyze_quality(im, self.s.blur_min_variance) for im in images]
        for i, q in enumerate(quality, start=1):
            for issue in q["issues"]:
                evidence.append({"type": "quality", "severity": "warning",
                                 "title": f"Photo {i}: {issue['code'].replace('_', ' ')}", "detail": issue["message"]})
        quality_blocking = any(q["blocking"] for q in quality)

        # 2. ResNet50 classifier
        per_image: list[dict] = []
        clf_auth: float | None = None
        if statuses["classifier"].available:
            try:
                results = [self.classifier.predict(im) for im in images]
                per_image = [{"p_authentic": round(r.p_authentic, 4), "p_counterfeit": round(r.p_counterfeit, 4)}
                             for r in results]
                clf_auth = sum(r.p_authentic for r in results) / len(results)
            except Exception as exc:
                log.exception("Classifier failed at runtime")
                unavailable_notes["classifier"] = f"Classifier failed at runtime ({type(exc).__name__})."
        else:
            unavailable_notes["classifier"] = statuses["classifier"].detail
        signals.append(Signal(
            "image_classifier", "Packaging image classifier (ResNet50)", W_CLASSIFIER, clf_auth,
            f"Mean authentic-class probability across {len(images)} photo(s): {clf_auth:.2f}."
            if clf_auth is not None else unavailable_notes.get("classifier", "Unavailable.")))

        # 3. OCR
        ocr_lines: list[dict] = []
        ocr_ok = False
        if statuses["ocr"].available:
            try:
                for im in images:
                    ocr_lines.extend(self.ocr.read(im).lines)
                ocr_ok = True
            except Exception as exc:
                log.exception("OCR failed at runtime")
                unavailable_notes["ocr"] = f"OCR failed at runtime ({type(exc).__name__})."
        else:
            unavailable_notes["ocr"] = statuses["ocr"].detail
        text = "\n".join(l["text"] for l in ocr_lines)
        mean_conf = round(sum(l["confidence"] for l in ocr_lines) / len(ocr_lines), 3) if ocr_lines else None
        fields = extract_fields(text) if text else {"batch_codes": [], "dates": [], "barcodes": []}

        if ocr_ok:
            if len(text.strip()) < self.s.ocr_min_chars:
                evidence.append({"type": "ocr", "severity": "warning", "title": "Very little text detected",
                                 "detail": "Too little readable text was found. Retake photos of the label, back panel and batch code."})
            if not fields["batch_codes"]:
                evidence.append({"type": "ocr", "severity": "info", "title": "No batch/lot code detected",
                                 "detail": "Many authentic products print a batch code. Check the physical product and photograph that area."})
            else:
                evidence.append({"type": "ocr", "severity": "info", "title": "Batch code detected",
                                 "detail": "Found: " + ", ".join(fields["batch_codes"]) + ". Verify it with the brand if they offer a checker."})
            for bc in fields["barcodes"]:
                if not bc["valid_check_digit"]:
                    evidence.append({"type": "barcode", "severity": "warning", "title": "Barcode digits fail check-digit test",
                                     "detail": f"{bc['value']} does not pass the EAN/UPC check digit. This can also be an OCR misread."})

        # 4. Sentence-BERT reference comparison
        match = None
        text_auth: float | None = None
        if not ocr_ok:
            text_note = unavailable_notes.get("ocr", "OCR unavailable.")
        elif len(text.strip()) < self.s.ocr_min_chars:
            text_note = "Not enough readable text to compare with reference data."
        elif not statuses["matcher"].available:
            text_note = statuses["matcher"].detail + " " + "; ".join(statuses["matcher"].missing)
        else:
            text_note = ""
            try:
                match = self.matcher.match(text, brand_hint)
                text_auth = _clamp((match.best["score"] - TEXT_SIM_LOW) / (TEXT_SIM_HIGH - TEXT_SIM_LOW))
                text_note = (f"Closest reference: {match.best['brand']} - {match.best['product_name']} "
                             f"(cosine similarity {match.best['score']:.2f}).")
            except Exception as exc:
                log.exception("Matcher failed at runtime")
                text_note = f"Reference matching failed at runtime ({type(exc).__name__})."
        signals.append(Signal("text_reference_match", "Printed text vs reference data (Sentence-BERT)",
                              W_TEXT, text_auth, text_note))

        # 5. Barcode vs reference (only counts when a check-digit-valid barcode was read)
        bar_auth: float | None = None
        bar_note = "No reference match with a stored barcode, or no valid barcode read."
        if match is not None and match.best["barcodes"]:
            valid = [b["value"] for b in fields["barcodes"] if b["valid_check_digit"]]
            if valid:
                hit = any(v in match.best["barcodes"] for v in valid)
                bar_auth = 1.0 if hit else 0.0
                bar_note = ("Printed barcode matches the reference product." if hit
                            else "Printed barcode does NOT match the barcodes stored for the closest reference product.")
        signals.append(Signal("barcode_match", "Barcode vs reference data", W_BARCODE, bar_auth, bar_note))

        # 6. Evidence from scored signals
        for s in signals:
            if s.authenticity is None:
                evidence.append({"type": s.key, "severity": "info", "title": f"{s.label}: not available", "detail": s.detail})
            else:
                evidence.append({"type": s.key, "severity": _severity(s.authenticity),
                                 "title": f"{s.label}: {s.authenticity:.2f}", "detail": s.detail})

        # 7. Missing assets, verdict
        missing_assets = [
            {"component": st.name, "missing": st.missing or [st.detail], "how_to_fix": st.how_to_fix}
            for st in statuses.values() if not st.available
        ]
        decision = decide(
            signals,
            Thresholds(self.s.authentic_threshold, self.s.counterfeit_threshold, self.s.disagreement_threshold),
            quality_blocking=quality_blocking,
            missing_components=[m["component"] for m in missing_assets],
        )

        return {
            "verdict": decision.verdict,
            "headline": decision.headline,
            "summary": decision.summary,
            "evidence_score": decision.score,
            "evidence_score_note": "Weighted combination of the available signals (0 = looks counterfeit, 1 = looks authentic). It is not a probability and not an accuracy figure.",
            "reasons": decision.reasons,
            "signals": [{"key": s.key, "label": s.label, "weight": s.weight, "authenticity": None if s.authenticity is None else round(s.authenticity, 3),
                         "status": "scored" if s.authenticity is not None else "unavailable", "detail": s.detail} for s in signals],
            "evidence": evidence,
            "ocr": {"text": text, "lines": ocr_lines, "mean_confidence": mean_conf, "fields": fields, "ran": ocr_ok},
            "classifier": {"per_image": per_image},
            "reference_match": None if match is None else {
                "best": match.best, "candidates": match.candidates, "brand_filter_applied": match.brand_filter_applied},
            "quality": quality,
            "hints": {"brand": brand_hint, "product_name": product_hint},
            "missing_assets": missing_assets,
            "thresholds": {"authentic": self.s.authentic_threshold, "counterfeit": self.s.counterfeit_threshold,
                           "disagreement": self.s.disagreement_threshold},
            "recommendations": RECOMMENDATIONS[decision.verdict],
            "disclaimer": DISCLAIMER,
        }
