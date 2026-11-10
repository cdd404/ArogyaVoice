# Arogya Voice

A multilingual healthcare assistance prototype for English, Kannada, Telugu, and Hindi. It offers an open demo entry flow, language selection, text chat, optional microphone input, Groq-generated replies, and Gnani Prisma/Timbre speech services. It is not a clinical tool and must not diagnose or prescribe.

## Start locally

1. Copy `backend/.env.example` to `backend/.env` and add fresh `GROQ_API_KEY` and `GNANI_API_KEY` values locally. Never commit or share this file.
2. The supplied Firebase web configuration is in the ignored `frontend/.env.local`. If missing, copy `frontend/.env.example` to `frontend/.env.local` and fill in the Firebase web-app values there.
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
- Voice: browser records up to 30 seconds and converts the clip to WAV; FastAPI sends it to Gnani Prisma, sends the transcript and context to Groq, then requests Timbre audio. The reply text and audio player are shown in the chat.
- Gnani credentials are read from `backend/.env`. No key belongs in React or a Vite environment variable.

## Firebase and privacy

The browser creates one Firestore document per session with a random document ID, language, and server timestamp only. It does not save the patient name, phone number, card number, messages, transcript, or audio. Patient-form values are used only in the current tab and are not sent to the API or Firebase. Deploy `firestore.rules` in the Firebase console; unauthenticated writes are limited to the minimal session schema, while reads, updates, and deletes are denied.

Chat text is sent to the configured Groq service and recorded audio is sent to Gnani. Use synthetic demo data only. No doctor-reviewed triage rules are included; the LLM is instructed not to diagnose or prescribe, and its replies are not a substitute for professional care.

## Official speech references

- Prisma STT: https://docs.gnani.ai/api/STT/speech-to-text
- Timbre TTS: https://docs.gnani.ai/api/TTS/tts-inference
- Python SDK reference: https://github.com/Gnani-AI-Mintlify/Gnani-Vachana
