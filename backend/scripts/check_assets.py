"""Print which AI assets are ready.  Run from backend/:  python scripts/check_assets.py"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.config import get_settings  # noqa: E402
from app.ml.registry import get_pipeline  # noqa: E402
from app.ml.similarity import load_reference_products  # noqa: E402

s = get_settings()
print(f"ML_ENABLED={s.ml_enabled}")
for st in get_pipeline().asset_status():
    print(f"[{'OK' if st.available else 'MISSING'}] {st.name}: {st.detail}")
    for m in st.missing:
        print(f"      - {m}")
    if not st.available and st.how_to_fix:
        print(f"      fix: {st.how_to_fix}")
products, problems = load_reference_products(Path(s.reference_data_file))
print(f"Reference products loaded: {len(products)}")
for p in problems:
    print(f"      problem: {p}")
