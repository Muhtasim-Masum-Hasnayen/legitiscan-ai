"""Simple, honest image-quality heuristics (sharpness, exposure, contrast)."""
from __future__ import annotations

import numpy as np
from PIL import Image


def analyze_quality(img: Image.Image, blur_min_variance: float) -> dict:
    small = img.convert("L")
    small.thumbnail((512, 512))
    g = np.asarray(small, dtype=np.float32)
    if g.shape[0] < 3 or g.shape[1] < 3:
        return {"sharpness": 0.0, "brightness": 0.0, "contrast": 0.0, "issues": [], "blocking": False}
    lap = -4 * g[1:-1, 1:-1] + g[:-2, 1:-1] + g[2:, 1:-1] + g[1:-1, :-2] + g[1:-1, 2:]
    sharpness = float(lap.var())
    brightness = float(g.mean())
    contrast = float(g.std())

    issues: list[dict] = []
    if sharpness < blur_min_variance:
        issues.append({"code": "blurry", "blocking": True,
                       "message": "The photo looks blurry. Hold the phone steady and retake it in focus."})
    if brightness < 45:
        issues.append({"code": "too_dark", "blocking": False,
                       "message": "The photo is quite dark. Retake it in better light."})
    elif brightness > 225:
        issues.append({"code": "overexposed", "blocking": False,
                       "message": "The photo is overexposed. Avoid direct flash or glare."})
    if contrast < 20 and sharpness >= blur_min_variance:
        issues.append({"code": "low_contrast", "blocking": False,
                       "message": "The photo has very low contrast, which can hide printing details."})
    return {
        "sharpness": round(sharpness, 1),
        "brightness": round(brightness, 1),
        "contrast": round(contrast, 1),
        "issues": issues,
        "blocking": any(i["blocking"] for i in issues),
    }
