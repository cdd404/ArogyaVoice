# Arogya Voice

A multilingual healthcare assistance prototype for English, Kannada, Telugu, and Hindi. It offers an open demo entry flow, language selection, text chat, optional microphone input, Groq-generated replies, and Gnani Prisma/Timbre speech services. It is not a clinical tool and must not diagnose or prescribe.

## Start locally

1. Copy `backend/.env.example` to `backend/.env` and add fresh `GROQ_API_KEY` and `GNANI_API_KEY` values locally. Never commit or share this file.
2. Copy `frontend/.env.example` to `frontend/.env.local` and fill in the Firebase web-app values there. In Firebase Console, enable **Authentication → Sign-in method → Anonymous**, create Firestore, and deploy `firestore.rules`.
3. In PowerShell, from this folder:

```powershell
py -3.14 -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r backend\requirements.txt
python -m uvicorn app.main:app --reload --app-dir backend
```

4. In a second PowerShell window:

```powershell
cd C:\Users\HP\Documents\Codex\ArogyaVoice
npm install
cd frontend
npm install
npm run dev
```

Open the Vite address, usually http://localhost:5173. The API health page is http://127.0.0.1:8000/health.

## Provider flow

- Text: browser sends the current message and short in-memory conversation context to FastAPI; FastAPI calls the Groq Python SDK.
- Voice: browser records up to 30 seconds and converts the clip to WAV; FastAPI sends it to Gnani Prisma, then Groq generates a reply and Gnani Timbre generates audio before `/chat` returns. Text stays in the loading state until speech is ready; then the reply appears and playback starts automatically.
- `/chat` returns the text and base64 audio in one response. Audio is held in browser memory only. Pause/Resume, Restart, and Stop reuse that same audio without another Groq or Timbre request. If initial speech generation fails, the reply stays hidden until the user retries only TTS or explicitly chooses text-only. Since Gnani's REST response has no word timestamps, the sentence highlight during one full-response clip is an estimated progress guide, not exact word alignment. The player has no download control and releases temporary object URLs when a response is replaced or cancelled.
- Gnani credentials are read from `backend/.env`. No key belongs in React or a Vite environment variable.

## Firebase and privacy

The browser creates an anonymous Firebase Auth identity (no OTP or personal identifiers) and scopes session metadata and verified cabinet records to that identity. The patient name, phone number, card number, chat transcript, and voice recordings are not saved. Prescription files are previewed and processed temporarily; only the structured details the user confirms are saved to Firestore. The source file is not retained. Anonymous identities are tied to the browser and may not be recoverable if browser data is cleared. This is a prototype, not a production health-data system.

### Prescription Intelligence

- Upload a PDF, JPG, JPEG or PNG (up to 10 MB; PDF up to 8 pages), or take a photo with a mobile device.
- PDFs use PyMuPDF for text and Tesseract OCR for scanned pages; images use Pillow preprocessing and Tesseract. Install the Tesseract Windows application separately (https://github.com/UB-Mannheim/tesseract/wiki). This project uses whichever language packs are installed. English is included in the common installer; install `kan`, `tel`, `hin` and `osd` trained data under Tesseract's `tessdata` folder for Kannada, Telugu and Hindi OCR. If a pack is missing, the interface reports the English fallback. Handwriting can remain unreadable.
- Groq converts the OCR text into a typed draft. Missing fields remain blank, and all medicines must be checked against the original or explicitly flagged for clinician/pharmacist confirmation before saving.
- The prescription assistant receives the confirmed structured data and the current in-memory question history. It does not change directions or save Q&A transcripts. Voice Q&A reuses the existing Gnani Prisma/Timbre endpoints.
- Firestore rules limit records to the signed-in anonymous owner. Enable Anonymous Authentication before deploying the app. Do not use real health information for demos.

Chat text and temporary OCR text are sent to the configured Groq service; recorded audio is sent to Gnani. Use synthetic demo data only. No doctor-reviewed triage rules are included; the LLM is instructed not to diagnose, prescribe or alter prescription directions, and its replies are not a substitute for professional care.

## Official speech references

- Prisma STT: https://docs.gnani.ai/api/STT/speech-to-text
- Timbre TTS: https://docs.gnani.ai/api/TTS/tts-inference
- Python SDK reference: https://github.com/Gnani-AI-Mintlify/Gnani-Vachana
