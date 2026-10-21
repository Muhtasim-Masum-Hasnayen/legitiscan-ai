"""Transparent decision logic. Pure functions: no I/O, fully unit-testable.

The verdict is a rule-based combination of the *available* signals. It never invents a signal:
missing models/datasets simply reduce the evidence, and with no evidence the answer is Inconclusive.
"""
from __future__ import annotations

from dataclasses import dataclass, field

LIKELY_AUTHENTIC = "likely_authentic"
POTENTIALLY_COUNTERFEIT = "potentially_counterfeit"
INCONCLUSIVE = "inconclusive"

DISCLAIMER = (
    "LegitiScan AI is a decision-support tool, not a certification. It can be wrong. "
    "Results are estimates from packaging images only and are never a guarantee of authenticity. "
    "Always confirm with the brand or an authorised retailer before relying on a result."
)

RECOMMENDATIONS = {
    LIKELY_AUTHENTIC: [
        "Still buy from the brand's official store or an authorised retailer where possible.",
        "Check the batch/lot code on the brand's official verification page if one exists.",
        "Inspect the product itself: seal, texture, smell and print quality should match what you expect.",
    ],
    POTENTIALLY_COUNTERFEIT: [
        "Do not rely on this app alone. Contact the brand's customer support with the batch code and photos.",
        "Compare against the same product from an authorised retailer (printing, fonts, colours, seals).",
        "Stop using the product if you notice irritation, and report the seller to the marketplace.",
    ],
    INCONCLUSIVE: [
        "Retake clear, well-lit, in-focus photos of the front, back and batch-code area.",
        "Verify the product with the brand or an authorised retailer.",
        "If you are unsure, treat the product with caution until verified.",
    ],
}


@dataclass
class Signal:
    key: str
    label: str
    weight: float
    authenticity: float | None  # 0 = looks counterfeit, 1 = looks authentic, None = not available
    detail: str


@dataclass
class Thresholds:
    authentic: float = 0.75
    counterfeit: float = 0.30
    disagreement: float = 0.50


@dataclass
class Decision:
    verdict: str
    score: float | None
    headline: str
    summary: str
    reasons: list[str] = field(default_factory=list)


HEADLINES = {
    LIKELY_AUTHENTIC: "Likely Authentic",
    POTENTIALLY_COUNTERFEIT: "Potentially Counterfeit",
    INCONCLUSIVE: "Inconclusive",
}


def _decision(verdict: str, score: float | None, summary: str, reasons: list[str]) -> Decision:
    return Decision(verdict, None if score is None else round(score, 3), HEADLINES[verdict], summary, reasons)


def decide(
    signals: list[Signal],
    thresholds: Thresholds,
    quality_blocking: bool = False,
    missing_components: list[str] | None = None,
) -> Decision:
    missing_components = missing_components or []
    scored = [s for s in signals if s.authenticity is not None]

    if quality_blocking:
        return _decision(
            INCONCLUSIVE, None,
            "The photo quality is too low for a reliable analysis.",
            ["At least one photo failed the sharpness check, so no verdict was given."],
        )

    if not scored:
        reasons = ["No analysis component produced a usable result."]
        if missing_components:
            reasons.append("Missing or unavailable: " + ", ".join(missing_components) + ".")
        return _decision(
            INCONCLUSIVE, None,
            "There was not enough analysable evidence to give a verdict.",
            reasons,
        )

    total_weight = sum(s.weight for s in scored)
    score = sum(s.weight * s.authenticity for s in scored) / total_weight  # type: ignore[operator]
    values = [s.authenticity for s in scored]  # type: ignore[misc]
    spread = max(values) - min(values)

    if len(scored) > 1 and spread >= thresholds.disagreement:
        return _decision(
            INCONCLUSIVE, score,
            "The analysis signals disagree with each other, so no confident verdict can be given.",
            [f"{s.label}: {s.authenticity:.2f}" for s in scored],
        )

    if score >= thresholds.authentic and min(values) >= 0.5:
        return _decision(
            LIKELY_AUTHENTIC, score,
            "The packaging evidence we could analyse is consistent with authentic reference data. This is not proof of authenticity.",
            [f"{s.label}: {s.authenticity:.2f}" for s in scored],
        )

    if score <= thresholds.counterfeit:
        return _decision(
            POTENTIALLY_COUNTERFEIT, score,
            "The packaging evidence differs from what we would expect of an authentic product. This is not proof of counterfeiting.",
            [f"{s.label}: {s.authenticity:.2f}" for s in scored],
        )

    return _decision(
        INCONCLUSIVE, score,
        "The evidence falls between our thresholds, so we cannot call this either way.",
        [f"{s.label}: {s.authenticity:.2f}" for s in scored],
    )
