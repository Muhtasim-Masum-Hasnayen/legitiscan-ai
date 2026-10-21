from app.services.verdict import (
    INCONCLUSIVE, LIKELY_AUTHENTIC, POTENTIALLY_COUNTERFEIT, Signal, Thresholds, decide,
)

T = Thresholds()


def sig(a, w=0.5):
    return Signal("k", "Label", w, a, "")


def test_no_signals_is_inconclusive():
    d = decide([], T)
    assert d.verdict == INCONCLUSIVE and d.score is None


def test_unavailable_signals_mention_missing_components():
    d = decide([sig(None)], T, missing_components=["ResNet50"])
    assert d.verdict == INCONCLUSIVE
    assert any("ResNet50" in r for r in d.reasons)


def test_high_score_is_likely_authentic():
    assert decide([sig(0.92)], T).verdict == LIKELY_AUTHENTIC


def test_low_score_is_potentially_counterfeit():
    assert decide([sig(0.1)], T).verdict == POTENTIALLY_COUNTERFEIT


def test_middle_score_is_inconclusive():
    assert decide([sig(0.5)], T).verdict == INCONCLUSIVE


def test_disagreeing_signals_are_inconclusive():
    assert decide([sig(0.95), sig(0.2)], T).verdict == INCONCLUSIVE


def test_blocking_quality_forces_inconclusive():
    assert decide([sig(0.99)], T, quality_blocking=True).verdict == INCONCLUSIVE


def test_weights_are_respected():
    d = decide([sig(0.9, 0.9), sig(0.6, 0.1)], T)
    assert d.verdict == LIKELY_AUTHENTIC and d.score == 0.87
