# Windows Development Setup

These commands match the repository layout. The inspected workstation had Python 3.14.7, Node.js 23.3.0 and npm 11.13.0. Backend requirements are not fully version-pinned. Vitest 4 declares Node support for 20, 22 and 24+ (not Node 23); the frontend tests have run successfully in the inspected Node 23 environment, but the engine-range mismatch may produce install warnings.

## 1. Install prerequisites

- Git for Windows.
- Python 3.14 (or another compatible Python with wheels for the listed packages).
- Node.js/npm. The actual frontend uses Vite 8 and Vitest 4; consult their engine requirements if changing Node versions.
- Tesseract OCR for prescription OCR. It is an external Windows application, not installed by `pip`. The code can use `TESSERACT_CMD` if the executable is not on PATH.

## 2. Clone and install Python dependencies

```powershell
git clone https://github.com/cdd404/ArogyaVoice.git
cd ArogyaVoice
python --version
node --version
npm --version
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
pip install -r backend\requirements.txt
```

If PowerShell blocks activation, either use a fresh Command Prompt and run `.venv\Scripts\activate.bat`, or allow activation for this PowerShell process only with `Set-ExecutionPolicy -Scope Process Bypass` and activate again. The backend can also be run with `.venv\Scripts\python.exe` without activating the environment.

## 3. Create local environment files

```powershell
Copy-Item backend\.env.example backend\.env
Copy-Item frontend\.env.example frontend\.env.local
```

### Backend file: `backend/.env`

Set:

| Variable | Purpose |
|---|---|
| `GROQ_API_KEY` | Secret used by the Python Groq SDK for chat, prescription extraction and prescription Q&A. |
| `GROQ_MODEL` | Groq model identifier; source default is `qwen/qwen3.8-27b`. Confirm it is available to your account. |
| `GNANI_API_KEY` | Secret sent as `X-API-Key-ID` to Gnani Prisma and Timbre. Use a current rotated key. |
| `FRONTEND_ORIGINS` | Comma-separated browser origins allowed by FastAPI CORS. Local defaults are shown in the example file. |
| `TESSERACT_CMD` | Optional path to the Tesseract executable. Used by the OCR service when set. |
| `TESSDATA_PREFIX` | Appears in the sample environment file but is not directly read by application code; Tesseract itself may use it as its own configuration. |

Never put Groq or Gnani credentials in frontend files. `GNANI_STT_URL` and `GNANI_TTS_URL` appear as blank values in the root `.env.example` but are not read by the current source; the provider URLs are hardcoded in `backend/app/main.py`.

### Frontend file: `frontend/.env.local`

Set `VITE_API_BASE_URL` to the backend base URL and populate all six Firebase web-app fields: `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_PROJECT_ID`, `VITE_FIREBASE_STORAGE_BUCKET`, `VITE_FIREBASE_MESSAGING_SENDER_ID`, and `VITE_FIREBASE_APP_ID`.

The configuration is a Firebase browser-app configuration and is visible in the browser bundle. Do not put service-account credentials there. The current `firebase.js` considers Firebase configured only when every one of the six values is non-empty, including `storageBucket`, although the app does not currently upload files to Firebase Storage.

### Firebase Console steps

1. Create/select a Firebase project and register a Web App. Copy its web configuration to `frontend/.env.local`.
2. Under **Authentication → Sign-in method**, enable **Anonymous** sign-in and make sure account creation is enabled for the project.
3. Create a Cloud Firestore database.
4. Publish the repository's `firestore.rules` in the Firestore Rules console. No Firebase CLI or automated rules deployment is configured in this repository.
5. Reload the app. If Firebase is unconfigured, session metadata and saved prescriptions remain temporary in page memory. If Anonymous Auth is disabled, Firebase errors are surfaced in the UI.

## 4. Install frontend packages

The React/Vite application and its dependencies are under `frontend/`; install and run from that folder:

```powershell
cd frontend
npm install
```

The root `package.json` is separate and declares Firebase plus an override; the browser application has its own `frontend/package.json` and lockfile. Root-level `npm install` is not needed to start the Vite app.

## 5. Install Tesseract and language data

Install the Windows Tesseract OCR application separately from a trusted distribution. Ensure the executable is on PATH or set `TESSERACT_CMD` in `backend/.env`. For Kannada, Telugu and Hindi OCR, install language data `kan`, `tel`, `hin` and `osd` in the Tesseract `tessdata` directory; English OCR uses `eng`. The code checks installed packs and can fall back to available languages, returning a warning for a missing selected language pack. OCR quality is not guaranteed, especially for handwriting.

## 6. Start the backend

In a PowerShell terminal at the repository root, with `.venv` active:

```powershell
python -m uvicorn app.main:app --reload --app-dir backend
```

Or without activating:

```powershell
.\.venv\Scripts\python.exe -m uvicorn app.main:app --reload --app-dir backend
```

The backend listens on port 8000 by default. Verify `http://127.0.0.1:8000/health`; open `http://127.0.0.1:8000/docs` for FastAPI's generated API UI.

## 7. Start the frontend

In a second terminal:

```powershell
cd C:\Users\HP\Documents\Codex\ArogyaVoice\frontend
npm run dev
```

Open the local Vite URL printed by the command (normally `http://localhost:5173`). If Vite selects a different port, add that exact origin to `FRONTEND_ORIGINS` and restart the backend.

## 8. Run checks

Frontend tests and production build:

```powershell
cd frontend
npm test
npm run build
```

Backend tests (run from `backend` so the tests can import the `app` package):

```powershell
cd ..\backend
..\.venv\Scripts\python.exe -m pytest -q
```

Backend tests include OCR/PDF processing and mocked Groq/Gnani flows; they do not make real provider calls. OCR tests need a working Tesseract installation. If testing from a fresh shell, ensure the project virtual environment is the interpreter used by both `uvicorn` and `pytest`.

## Troubleshooting

| Symptom | Check |
|---|---|
| `/health` cannot be reached | Confirm Uvicorn is running, port 8000 is free, and `VITE_API_BASE_URL` points to it. |
| Browser CORS error | Ensure the exact Vite origin is included in `FRONTEND_ORIGINS`, then restart FastAPI. |
| Groq `503`/`502` | Check only that `GROQ_API_KEY` is present in `backend/.env`; confirm model/account access and network connectivity. Do not paste the key into logs or chat. |
| No audio / retry shown | Check `GNANI_API_KEY`, account access, language/voice support and provider response. Main-chat text remains hidden until retry succeeds or text-only is explicitly selected. |
| Firebase `auth/configuration-not-found` | Enable Firebase Authentication for the correct project and confirm the web-app config/project ID. |
| Firebase `auth/admin-restricted-operation` or `auth/operation-not-allowed` | Enable Anonymous sign-in and account creation in Firebase Authentication. |
| Firebase permission denied | Publish `firestore.rules`, use the same Firebase project as the frontend config, and check Anonymous Auth identity. |
| Prescription OCR is blank or inaccurate | Confirm Tesseract is installed, selected language packs exist, PDF is within 8 pages/10 MiB, image is clear and correctly oriented; manually compare every extraction with the original. |
| Kannada/Telugu/Hindi OCR warning | Add the relevant `kan`, `tel`, or `hin` Tesseract data and `osd`; the app may use English/available-pack fallback. |

Use synthetic demo documents and identifiers only.
