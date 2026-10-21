"""Test setup. Environment is configured BEFORE the app is imported."""
import os
import tempfile
from pathlib import Path

_tmp = tempfile.mkdtemp(prefix="legitiscan-test-")
os.environ.update({
    "ENVIRONMENT": "test",
    "DATABASE_URL": f"sqlite:///{_tmp}/test.db",
    "UPLOAD_DIR": f"{_tmp}/uploads",
    "ML_ENABLED": "false",  # real models are not required for the unit/integration tests
    "SCAN_RATE_LIMIT_PER_MINUTE": "1000",
    "SECRET_KEY": "test-secret-key-test-secret-key-1234567890",
})

import io  # noqa: E402

import numpy as np  # noqa: E402
import pytest  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402
from PIL import Image  # noqa: E402

from app.deps import limiter  # noqa: E402
from app.main import app  # noqa: E402

GUEST_A = "guest-aaaaaaaaaaaaaaaa"
GUEST_B = "guest-bbbbbbbbbbbbbbbb"


@pytest.fixture()
def client():
    limiter.reset()
    app.dependency_overrides.clear()
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()


def make_image_bytes(size=(400, 400), fmt="JPEG", noisy=True) -> bytes:
    if noisy:
        arr = (np.random.rand(size[1], size[0], 3) * 255).astype("uint8")
        img = Image.fromarray(arr)
    else:
        img = Image.new("RGB", size, (120, 120, 120))
    buf = io.BytesIO()
    img.save(buf, format=fmt)
    return buf.getvalue()


@pytest.fixture()
def jpeg_bytes():
    return make_image_bytes()


def guest(g=GUEST_A):
    return {"X-Guest-Id": g}
