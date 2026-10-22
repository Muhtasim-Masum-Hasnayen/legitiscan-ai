# LegitiScan AI — Scan Smart. Shop Confidently.
<img width="1904" height="818" alt="1" src="https://github.com/Muhtasim-Masum-Hasnayen/legitiscan-ai/blob/main/1.png" />
Web app that checks cosmetic packaging photos and reports one of three outcomes:
**Likely Authentic**, **Potentially Counterfeit** or **Inconclusive**, with the evidence behind it.

| Layer | Tech |
|-------|------|
| Frontend | Next.js 14 (App Router), TypeScript, Tailwind CSS |
| Backend | Python FastAPI, SQLAlchemy 2, JWT auth (optional guest mode) |
| Database | PostgreSQL (SQLite fallback for zero-config local dev) |
| AI | ResNet50 (packaging classifier), EasyOCR (text), Sentence-BERT (text vs reference data) |

## Honest status of the AI part

The code for all three models is integrated, **but your trained assets are not included**:

| Missing asset | Where it goes |
|---|---|
| Trained ResNet50 weights `resnet50_cosmetics.pt` + `labels.json` | `backend/models/` |
| Reference dataset `products.json` (genuine packaging text, optional barcodes) | `backend/data/reference/` |
| AI libraries (torch, easyocr, sentence-transformers) | `pip install -r backend/requirements-ml.txt` |

Until they exist the app still runs, shows exactly what is missing (scan page banner + `GET /api/system/status`),
and **every verdict is Inconclusive**. Nothing is predicted without a real model. The app never claims 100% accuracy,
and the "evidence score" is a weighted signal, not a probability. See [docs/MODEL_INTEGRATION.md](docs/MODEL_INTEGRATION.md).

## Quick start (VS Code, no Docker)

Prerequisites: Node 18.18+ (20 recommended), Python 3.11+.

```bash
# 1) Backend  (terminal 1)
cd backend
python -m venv .venv
source .venv/bin/activate            # Windows: .venv\Scripts\activate
pip install -r requirements-dev.txt
cp .env.example .env                 # Windows: copy .env.example .env
uvicorn app.main:app --reload --port 8000
# API docs: http://localhost:8000/docs      health: http://localhost:8000/api/health

# 2) Frontend (terminal 2)
cd frontend
cp .env.example .env.local           # Windows: copy .env.example .env.local
npm install
npm run dev
# App: http://localhost:3000
```

Local dev uses SQLite (`legitiscan_dev.db`) unless you set `DATABASE_URL`.

## Docker (frontend + backend + PostgreSQL)

```bash
docker compose up --build            # app: http://localhost:3000, API docs: http://localhost:8000/docs
# include the AI libraries in the image (large, ~2-3 GB):
INSTALL_ML=true docker compose up --build
```
Model files and the reference dataset are mounted from `backend/models` and `backend/data`.

## Tests

```bash
cd backend && pytest -q              # API, validation, verdict logic, text extraction
cd frontend && npm run typecheck && npm run lint && npm test && npm run build
```
CI (`.github/workflows/ci.yml`) runs all of these on every push.

## Pages

Landing `/`, Scanner `/scan` (upload, camera, preview, validation), Report `/report/:id`, History `/history`,
About `/about`, Safety `/safety`, Feedback `/feedback`, Sign in `/login`, Create account `/register`.

## Project layout

```
backend/   FastAPI app (app/), AI wrappers (app/ml/), tests/, models/, data/reference/
frontend/  Next.js app (src/app pages, src/components, src/lib api client + helpers)
docs/      MODEL_INTEGRATION.md, DEPLOYMENT.md, PROGRESS.md
```

## Push to GitHub

```bash
git init && git add . && git commit -m "Initial commit: LegitiScan AI"
git branch -M main
git remote add origin https://github.com/<you>/legitiscan-ai.git
git push -u origin main
```
`.gitignore` already excludes secrets, uploads, model weights and datasets. Use Git LFS or a model host for weights.

## Deploy

Vercel hosts the **frontend only**. The FastAPI + PyTorch backend does not fit Vercel's serverless limits; host it on
Render, Railway, Fly.io or a VPS. Step by step: [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md).

## Security notes

Uploads are type/size/dimension validated, decoded and re-encoded (metadata stripped), stored under random IDs, and
only served to their owner. Passwords use bcrypt, tokens are JWT, requests are rate limited, CORS is allow-listed.
Set a strong `SECRET_KEY` in production (the backend refuses to start with the default).

## Disclaimer

LegitiScan AI is decision-support, not certification. Confirm results with the brand or an authorised retailer.
