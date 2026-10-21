import io

from tests.conftest import GUEST_A, GUEST_B, guest, make_image_bytes


def upload(client, data, name="front.jpg", ctype="image/jpeg", headers=None, extra_files=(), **form):
    files = [("files", (name, data, ctype))] + [("files", (n, d, c)) for n, d, c in extra_files]
    return client.post("/api/scans", files=files, data=form, headers=guest() if headers is None else headers)


# ---------- system
def test_health(client):
    assert client.get("/api/health").json() == {"status": "ok"}


def test_system_status_reports_missing_assets(client):
    body = client.get("/api/system/status").json()
    assert body["ready"] is False
    assert {c["key"] for c in body["components"]} == {"classifier", "ocr", "matcher"}
    assert all(not c["available"] for c in body["components"])
    assert body["limits"]["max_files_per_scan"] == 3


# ---------- auth
def test_register_login_me(client):
    r = client.post("/api/auth/register", json={"email": "Ann@Example.com", "password": "password123", "name": "Ann"})
    assert r.status_code == 201
    token = r.json()["access_token"]
    assert r.json()["user"]["email"] == "ann@example.com"
    me = client.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert me.status_code == 200 and me.json()["name"] == "Ann"
    assert client.post("/api/auth/login", json={"email": "ann@example.com", "password": "password123"}).status_code == 200


def test_register_duplicate_and_weak_password(client):
    body = {"email": "dup@example.com", "password": "password123"}
    assert client.post("/api/auth/register", json=body).status_code == 201
    assert client.post("/api/auth/register", json=body).status_code == 409
    assert client.post("/api/auth/register", json={"email": "x@example.com", "password": "short"}).status_code == 422


def test_login_wrong_password(client):
    client.post("/api/auth/register", json={"email": "w@example.com", "password": "password123"})
    assert client.post("/api/auth/login", json={"email": "w@example.com", "password": "nope-nope"}).status_code == 401
    assert client.post("/api/auth/login", json={"email": "ghost@example.com", "password": "nope-nope"}).status_code == 401


def test_me_requires_valid_token(client):
    assert client.get("/api/auth/me").status_code == 401
    assert client.get("/api/auth/me", headers={"Authorization": "Bearer garbage"}).status_code == 401


# ---------- scans
def test_scan_without_models_is_inconclusive_and_never_fabricated(client, jpeg_bytes):
    r = upload(client, jpeg_bytes, brand="Acme")
    assert r.status_code == 201, r.text
    body = r.json()
    assert body["verdict"] == "inconclusive"
    assert body["authenticity_score"] is None
    assert len(body["result"]["missing_assets"]) == 3
    assert all(s["status"] == "unavailable" for s in body["result"]["signals"])
    assert body["result"]["disclaimer"]
    assert body["images"][0]["width"] == 400


def test_scan_requires_identity(client, jpeg_bytes):
    assert upload(client, jpeg_bytes, headers={}).status_code == 400


def test_rejects_non_image(client):
    r = upload(client, b"this is not an image", name="evil.jpg")
    assert r.status_code == 422 and "valid image" in r.json()["detail"]


def test_rejects_unsupported_format(client):
    r = upload(client, make_image_bytes(fmt="GIF"), name="a.gif", ctype="image/gif")
    assert r.status_code == 422 and "JPEG, PNG or WebP" in r.json()["detail"]


def test_rejects_tiny_image(client):
    assert upload(client, make_image_bytes((100, 100))).status_code == 422


def test_rejects_too_many_files(client, jpeg_bytes):
    extra = [("b.jpg", jpeg_bytes, "image/jpeg")] * 3
    assert upload(client, jpeg_bytes, extra_files=extra).status_code == 422


def test_accepts_png_and_webp(client):
    assert upload(client, make_image_bytes(fmt="PNG"), name="a.png", ctype="image/png").status_code == 201
    assert upload(client, make_image_bytes(fmt="WEBP"), name="a.webp", ctype="image/webp").status_code == 201


def test_history_detail_image_delete_and_isolation(client, jpeg_bytes):
    scan_id = upload(client, jpeg_bytes).json()["id"]

    lst = client.get("/api/scans", headers=guest()).json()
    assert lst["total"] == 1 and lst["items"][0]["id"] == scan_id

    assert client.get(f"/api/scans/{scan_id}", headers=guest()).status_code == 200
    img = client.get(f"/api/scans/{scan_id}/images/0", headers=guest())
    assert img.status_code == 200 and img.headers["content-type"] == "image/jpeg"
    assert client.get(f"/api/scans/{scan_id}/images/5", headers=guest()).status_code == 404

    # another browser cannot see it
    other = guest(GUEST_B)
    assert client.get("/api/scans", headers=other).json()["total"] == 0
    assert client.get(f"/api/scans/{scan_id}", headers=other).status_code == 404
    assert client.delete(f"/api/scans/{scan_id}", headers=other).status_code == 404

    assert client.delete(f"/api/scans/{scan_id}", headers=guest()).status_code == 204
    assert client.get(f"/api/scans/{scan_id}", headers=guest()).status_code == 404


def test_guest_scans_are_claimed_on_login(client, jpeg_bytes):
    scan_id = upload(client, jpeg_bytes, headers=guest(GUEST_A)).json()["id"]
    r = client.post("/api/auth/register", json={"email": "claim@example.com", "password": "password123"},
                    headers=guest(GUEST_A))
    auth = {"Authorization": f"Bearer {r.json()['access_token']}"}
    assert client.get(f"/api/scans/{scan_id}", headers=auth).status_code == 200
    assert client.get(f"/api/scans/{scan_id}", headers=guest(GUEST_A)).status_code == 404


def test_history_pagination_and_filter(client, jpeg_bytes):
    for _ in range(3):
        upload(client, jpeg_bytes, headers=guest("guest-pagination-0001"))
    h = guest("guest-pagination-0001")
    assert len(client.get("/api/scans?page_size=2", headers=h).json()["items"]) == 2
    assert client.get("/api/scans?verdict=inconclusive", headers=h).json()["total"] == 3
    assert client.get("/api/scans?verdict=likely_authentic", headers=h).json()["total"] == 0
    assert client.get("/api/scans?verdict=bogus", headers=h).status_code == 422


# ---------- pipeline wiring with test doubles (tests only)
class FakeStatus:
    def __init__(self, key):
        self.key, self.name, self.available, self.detail, self.missing, self.how_to_fix = key, key, True, "ok", [], ""


class FakeClassifier:
    def __init__(self, p): self.p = p
    def status(self): return FakeStatus("classifier")
    def predict(self, image):
        from app.ml.classifier import ClassifierResult
        return ClassifierResult(self.p, 1 - self.p, "x")


class FakeOcr:
    def status(self): return FakeStatus("ocr")
    def read(self, image):
        from app.ml.ocr import OcrResult
        return OcrResult([{"text": "ACME RADIANCE SERUM BATCH NO: AB1234 EXP 08/2027", "confidence": 0.9}])


class FakeMatcher:
    def __init__(self, score): self.score = score
    def status(self): return FakeStatus("matcher")
    def match(self, text, brand_hint=None):
        from app.ml.similarity import MatchResult
        best = {"id": "r1", "brand": "Acme", "product_name": "Radiance Serum", "score": self.score, "barcodes": []}
        return MatchResult(best, [best], False)


def _override(p_auth, sim):
    from app.config import get_settings
    from app.main import app
    from app.ml.registry import get_pipeline
    from app.services.pipeline import ScanPipeline
    pipe = ScanPipeline(FakeClassifier(p_auth), FakeOcr(), FakeMatcher(sim), get_settings())
    app.dependency_overrides[get_pipeline] = lambda: pipe


def test_pipeline_authentic_path(client, jpeg_bytes):
    _override(0.97, 0.85)
    body = upload(client, jpeg_bytes).json()
    assert body["verdict"] == "likely_authentic"
    assert body["result"]["ocr"]["fields"]["batch_codes"] == ["AB1234"]
    assert body["result"]["reference_match"]["best"]["brand"] == "Acme"


def test_pipeline_counterfeit_path(client, jpeg_bytes):
    _override(0.05, 0.30)
    assert upload(client, jpeg_bytes).json()["verdict"] == "potentially_counterfeit"


def test_pipeline_conflict_is_inconclusive(client, jpeg_bytes):
    _override(0.97, 0.30)
    assert upload(client, jpeg_bytes).json()["verdict"] == "inconclusive"


def test_blurry_photo_is_inconclusive_even_with_confident_models(client):
    _override(0.99, 0.9)
    flat = make_image_bytes((500, 500), noisy=False)
    body = upload(client, flat).json()
    assert body["verdict"] == "inconclusive"


# ---------- feedback
def test_feedback(client, jpeg_bytes):
    r = client.post("/api/feedback", json={"category": "bug", "rating": 4, "message": "The camera button did not work."},
                    headers=guest())
    assert r.status_code == 201
    assert client.post("/api/feedback", json={"message": "short"}, headers=guest()).status_code == 422
    assert client.post("/api/feedback", json={"message": "valid message here", "scan_id": "nope"},
                       headers=guest()).status_code == 404
    scan_id = upload(client, jpeg_bytes).json()["id"]
    ok = client.post("/api/feedback", json={"category": "wrong_result", "message": "This result looks wrong.",
                                            "scan_id": scan_id}, headers=guest())
    assert ok.status_code == 201
