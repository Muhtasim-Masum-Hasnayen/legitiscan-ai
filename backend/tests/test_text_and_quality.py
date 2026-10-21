from PIL import Image

from app.services.quality import analyze_quality
from app.services.text_fields import ean_check_digit_valid, extract_fields
from tests.conftest import make_image_bytes
import io


def test_ean_check_digit():
    assert ean_check_digit_valid("4006381333931")
    assert not ean_check_digit_valid("4006381333932")
    assert ean_check_digit_valid("036000291452")
    assert not ean_check_digit_valid("12345")


def test_extract_fields():
    f = extract_fields("BATCH NO: AB1234\nEXP 08/2027\nMFG: 08/2025\n4 006381 333931")
    assert f["batch_codes"] == ["AB1234"]
    assert {"label": "EXP", "value": "08/2027"} in f["dates"]
    assert f["barcodes"] == [{"value": "4006381333931", "valid_check_digit": True}]


def test_extract_fields_empty():
    assert extract_fields("hello world") == {"batch_codes": [], "dates": [], "barcodes": []}


def test_blur_detection():
    flat = Image.new("RGB", (600, 600), (128, 128, 128))
    sharp = Image.open(io.BytesIO(make_image_bytes((600, 600))))
    assert analyze_quality(flat, 25)["blocking"] is True
    assert analyze_quality(sharp, 25)["blocking"] is False
