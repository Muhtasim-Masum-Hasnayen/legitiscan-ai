# Deployment

Architecture: **Vercel** (Next.js frontend) → HTTPS → **backend host** (FastAPI) → **PostgreSQL**.

## 1. Database
Create a managed PostgreSQL (Neon, Supabase, Render, Railway). Copy its connection string, e.g.
`postgresql://user:pass@host:5432/dbname`. Tables are created on first start (`init_db()`).
If you later change the schema, introduce Alembic migrations before touching production data.

## 2. Backend (Render / Railway / Fly.io / VPS)
Deploy the `backend/` folder with its `Dockerfile` (build arg `INSTALL_ML=true` once your models are ready).
Environment variables:

| Variable | Value |
|---|---|
| `ENVIRONMENT` | `production` |
| `SECRET_KEY` | random 32+ chars: `python -c "import secrets;print(secrets.token_urlsafe(48))"` |
| `DATABASE_URL` | your PostgreSQL URL |
| `CORS_ORIGINS` | your Vercel URL, e.g. `https://legitiscan.vercel.app` (comma-separate several) |
| `TRUST_PROXY_HEADERS` | `true` when behind the host's proxy (correct rate limiting) |
| `ML_ENABLED` | `true` (or `false` to run without AI) |

Mount a persistent disk at `/app/storage/uploads` (uploads) and put weights/data in `/app/models`, `/app/data`.
The ML image needs ~2–4 GB RAM; EasyOCR/Sentence-BERT downloads happen on first scan unless baked in.
Verify: `https://<backend>/api/health` and `https://<backend>/api/system/status`.

## 3. Frontend on Vercel
1. Push the repo to GitHub.
2. Vercel → *Add New Project* → import the repo → **Root Directory: `frontend`**.
3. Environment variable: `NEXT_PUBLIC_API_URL=https://<your-backend-url>` (no trailing slash).
4. Deploy. Then add the final Vercel URL to the backend's `CORS_ORIGINS` and redeploy the backend.

`NEXT_PUBLIC_*` values are baked in at build time: redeploy the frontend after changing it.

## 4. Camera note
Browser camera capture requires HTTPS (Vercel provides it) or `localhost`. Elsewhere the app falls back to the phone's
native camera picker.

## Checklist before going live
- [ ] Strong `SECRET_KEY`, production DB, HTTPS everywhere
- [ ] `CORS_ORIGINS` contains only your real frontend origin
- [ ] Uploads on persistent storage; backups for the database
- [ ] Thresholds calibrated on your validation data; wording reviewed
