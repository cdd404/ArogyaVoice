# Arogya Voice

A multilingual healthcare assistance prototype for English, Kannada, Telugu, and Hindi. This early scaffold contains a Vite/React interface and a FastAPI service. It uses no real patient data and does not diagnose, prescribe, or make clinical triage decisions.

## Start the API (PowerShell)

```powershell
cd D:\ArogyaVoice
.\.venv\Scripts\Activate.ps1
python -m uvicorn app.main:app --reload --app-dir backend
```

The API runs at http://127.0.0.1:8000. Its health check is `/health`; interactive API documentation is `/docs`.

## Start the web app (second PowerShell window)

```powershell
cd D:\ArogyaVoice\frontend
npm run dev
```

Open the local URL printed by Vite (usually http://localhost:5173).

## Environment and integrations

`.env.example` contains placeholders only. Copy it to `.env` and enter any rotated provider credentials locally. `.env` is ignored by Git. The Gnani integration is intentionally not implemented until official API documentation and request examples are available; do not assume endpoint formats.

## Safety scope

Any future triage behavior must use doctor-reviewed rules, include clear emergency escalation, and avoid autonomous diagnosis or prescribing. Current responses are generic educational placeholders, not medical advice. Use synthetic demo data only.
