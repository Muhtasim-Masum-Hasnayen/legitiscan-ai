from __future__ import annotations

import io
import logging

from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, UploadFile, status
from fastapi.responses import FileResponse
from PIL import Image
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.config import Settings, get_settings
from app.database import get_db
from app.deps import Owner, get_owner, rate_limit
from app.ml.registry import get_pipeline
from app.models import Scan, ScanImage
from app.schemas import ScanDetail, ScanImageOut, ScanList, ScanSummary
from app.services import storage
from app.services.pipeline import ScanPipeline
from app.services.validation import ImageValidationError, ProcessedImage, process_upload

log = logging.getLogger(__name__)
router = APIRouter(prefix="/api/scans", tags=["scans"])


def _summary(scan: Scan) -> ScanSummary:
    return ScanSummary(
        id=scan.id, status=scan.status, verdict=scan.verdict, authenticity_score=scan.authenticity_score,
        headline=scan.headline, brand_hint=scan.brand_hint, product_hint=scan.product_hint,
        image_count=len(scan.images), created_at=scan.created_at,
    )


def _detail(scan: Scan) -> ScanDetail:
    return ScanDetail(
        **_summary(scan).model_dump(),
        images=[ScanImageOut.model_validate(i) for i in scan.images],
        result=scan.result, error=scan.error,
    )


def _owned_scan(db: Session, owner: Owner, scan_id: str) -> Scan:
    scan = db.scalar(select(Scan).where(Scan.id == scan_id, owner.scan_filter()))
    if scan is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Scan not found.")
    return scan


def _clean_hint(value: str | None) -> str | None:
    value = (value or "").strip()
    return value[:120] or None


@router.post("", response_model=ScanDetail, status_code=status.HTTP_201_CREATED, dependencies=[Depends(rate_limit)])
def create_scan(
    files: list[UploadFile] = File(...),
    brand: str | None = Form(default=None),
    product_name: str | None = Form(default=None),
    owner: Owner = Depends(get_owner),
    db: Session = Depends(get_db),
    pipeline: ScanPipeline = Depends(get_pipeline),
    settings: Settings = Depends(get_settings),
):
    if not files:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "Please upload at least one image.")
    if len(files) > settings.max_files_per_scan:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY,
                            f"You can upload at most {settings.max_files_per_scan} images per scan.")
    processed: list[ProcessedImage] = []
    try:
        for f in files:
            processed.append(process_upload(f, settings))
    except ImageValidationError as exc:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, str(exc)) from None

    brand, product_name = _clean_hint(brand), _clean_hint(product_name)
    scan = Scan(user_id=owner.user.id if owner.user else None, guest_id=owner.guest_id,
                status="processing", brand_hint=brand, product_hint=product_name)
    db.add(scan)
    db.flush()

    try:
        for pos, p in enumerate(processed):
            storage.save_image(settings, scan.id, pos, p.data)
            db.add(ScanImage(scan_id=scan.id, position=pos, original_name=p.original_name, width=p.width,
                             height=p.height, size_bytes=p.size_bytes, sha256=p.sha256))
        result = pipeline.analyze([p.image for p in processed], brand, product_name)
    except Exception:
        log.exception("Scan %s failed", scan.id)
        db.rollback()
        storage.delete_scan_files(settings, scan.id)
        failed = Scan(id=scan.id, user_id=scan.user_id, guest_id=scan.guest_id, status="failed",
                      error="The analysis failed unexpectedly. Please try again.")
        db.add(failed)
        db.commit()
        raise HTTPException(status.HTTP_500_INTERNAL_SERVER_ERROR, "The analysis failed unexpectedly. Please try again.") from None

    scan.status = "completed"
    scan.verdict = result["verdict"]
    scan.authenticity_score = result["evidence_score"]
    scan.headline = result["headline"]
    scan.result = result
    db.commit()
    db.refresh(scan)
    return _detail(scan)


@router.get("", response_model=ScanList)
def list_scans(
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=50),
    verdict: str | None = Query(None, pattern="^(likely_authentic|potentially_counterfeit|inconclusive)$"),
    owner: Owner = Depends(get_owner),
    db: Session = Depends(get_db),
):
    cond = [owner.scan_filter()]
    if verdict:
        cond.append(Scan.verdict == verdict)
    total = db.scalar(select(func.count()).select_from(Scan).where(*cond)) or 0
    rows = db.scalars(select(Scan).where(*cond).order_by(Scan.created_at.desc())
                      .offset((page - 1) * page_size).limit(page_size)).all()
    return ScanList(items=[_summary(r) for r in rows], total=total, page=page, page_size=page_size)


@router.get("/{scan_id}", response_model=ScanDetail)
def get_scan(scan_id: str, owner: Owner = Depends(get_owner), db: Session = Depends(get_db)):
    return _detail(_owned_scan(db, owner, scan_id))


@router.delete("/{scan_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_scan(scan_id: str, owner: Owner = Depends(get_owner), db: Session = Depends(get_db),
                settings: Settings = Depends(get_settings)):
    scan = _owned_scan(db, owner, scan_id)
    db.delete(scan)
    db.commit()
    storage.delete_scan_files(settings, scan_id)


@router.get("/{scan_id}/images/{position}")
def get_scan_image(scan_id: str, position: int, owner: Owner = Depends(get_owner), db: Session = Depends(get_db),
                   settings: Settings = Depends(get_settings)):
    scan = _owned_scan(db, owner, scan_id)
    if position not in {i.position for i in scan.images}:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Image not found.")
    path = storage.image_path(settings, scan.id, position)
    if not path.is_file():
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Image file is missing.")
    return FileResponse(path, media_type="image/jpeg", headers={"Cache-Control": "private, max-age=3600"})
