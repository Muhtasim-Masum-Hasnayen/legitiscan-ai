# Progress

## Done
- Backend: FastAPI app, auth (JWT + guest ids), scan/feedback/system endpoints, secure upload validation and re-encoding,
  SQLAlchemy models, rate limiting, pipeline with ResNet50/EasyOCR/Sentence-BERT wrappers that report missing assets
  honestly, transparent verdict logic, backend tests, Dockerfile, docker-compose, CI.
- Frontend: Next.js app with landing, scan (upload + camera + validation), report, history, about, safety, feedback,
  login/register, shared UI components, API client, unit tests for validation and verdict helpers.
- Docs: README, MODEL_INTEGRATION, DEPLOYMENT.

## NOT verified in the authoring environment (no network access there)
- `pip install`, `pytest`, `npm install`, `npm run typecheck|lint|test|build` were **not run**. Run them first on your
  machine (see README) and fix anything they report. Only the API/lib TypeScript files were type-checked in isolation.
- No real model has been executed: no trained weights or reference dataset exist yet.

## Next steps
1. Run backend tests and the frontend checks locally.
2. Add your trained `resnet50_cosmetics.pt`, `labels.json`, and `products.json`.
3. Calibrate thresholds on validation data.
4. Add Alembic migrations before the first production schema change.
