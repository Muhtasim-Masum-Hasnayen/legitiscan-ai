# Connecting your dataset and trained models

Everything below is optional until your dataset is ready. Check status any time:

```bash
cd backend && python scripts/check_assets.py     # or open GET /api/system/status
```

## 1. ResNet50 classifier
Train a torchvision ResNet50 with a final `Linear(2048, N)` layer (N = number of classes) and save either a plain
`state_dict` or `{"state_dict": ..., "classes": ["authentic", "counterfeit"]}`.

Place in `backend/models/`:
- `resnet50_cosmetics.pt`
- `labels.json`, e.g. `["authentic", "counterfeit"]` (order must equal the model's output indices; must contain both names)

Pre-processing in `app/ml/classifier.py` is Resize(256) → CenterCrop(224) → ImageNet normalisation. **It must match your
training transforms**; edit it if you trained differently. Weights are loaded with `weights_only=True`.

## 2. EasyOCR
`pip install -r backend/requirements-ml.txt`. Language models download to `backend/models/easyocr/` on first run
(needs internet once). Set `OCR_LANGUAGES=en,bn` etc. in `backend/.env` for more languages.

## 3. Sentence-BERT reference matching
Create `backend/data/reference/products.json` (format example: `products.example.json`):

```json
{"products": [{"id": "sku-1", "brand": "...", "product_name": "...",
               "reference_text": ["text on genuine front", "text on genuine back"],
               "barcodes": ["optional EAN/UPC"]}]}
```
Use text taken from **genuine** packaging only. The model defaults to `all-MiniLM-L6-v2`; change `SBERT_MODEL` for a
different Hugging Face id or a local folder. Embeddings refresh automatically when the file changes.

## 4. Calibrate the thresholds (important)
Defaults are only starting points: `AUTHENTIC_THRESHOLD=0.75`, `COUNTERFEIT_THRESHOLD=0.30`,
`DISAGREEMENT_THRESHOLD=0.50`, plus `TEXT_SIM_LOW/HIGH` and signal weights in `app/services/pipeline.py`.
Tune them on a held-out validation set of real authentic and counterfeit photos, and measure precision/recall per
class before trusting any verdict. Keep the "Inconclusive" band wide while your dataset is small.

## How the verdict is decided (no hidden magic)
Signals: classifier (0.55), text-vs-reference (0.30), barcode-vs-reference (0.15). Unavailable signals are dropped and the
remaining weights re-normalised. No signal → **Inconclusive**. Blurry photos → **Inconclusive**. Signals that disagree by
≥ 0.50 → **Inconclusive**. Logic: `app/services/verdict.py` (unit tested).
