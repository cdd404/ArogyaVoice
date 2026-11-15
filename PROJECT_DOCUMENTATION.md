# Arogya Voice – Project Documentation

This technical reference describes the implementation found in this repository. It does not treat prior product plans, provider-account configuration or undocumented behavior as implemented facts. See [Feature Status](docs/FEATURE_STATUS.md), [API Reference](docs/API_REFERENCE.md) and [Windows Setup](docs/DEVELOPMENT_SETUP.md) for shorter operational references.

## A. Project background

Arogya Voice is a prototype exploring multilingual access to general health information through typed or spoken conversations, plus assisted reading of prescription documents. Its supported language codes are English (`en`), Kannada (`kn`), Telugu (`te`) and Hindi (`hi`). The intended prototype users are people who prefer one of those languages and are testing with synthetic demo data.

The source code does not establish a more specific organizational origin or clinical program. The product objective inferred from the implemented UI is to make a next-step conversation easier to access through text, microphone input and spoken replies. The system must not be used as a clinician: its model prompt prohibits diagnosis and prescribing, but there is no clinician-reviewed triage ruleset or independent medical decision engine.

Document tagline: **A prototype for health guidance in the language you speak.**

## B. Complete technology inventory

Versions below come from the repository manifests or the inspected local environment on 2026-11-15. Python dependency ranges in `backend/requirements.txt` generally do not pin versions; the resolved versions are environment-specific. npm versions are resolved in package lock files. “Latest” manifest entries are intentionally unpinned and can resolve to newer versions later.

| Technology / Tool | Version | Purpose | Where Used |
|---|---|---|---|
| Python | 3.14.7 (inspected environment) | Backend runtime | `.venv`, `backend/app/` |
| FastAPI | 0.162.2 locally; unpinned requirement | HTTP API, validation and OpenAPI | `backend/app/main.py`, `prescription_routes.py` |
| Uvicorn | 0.54.0 locally; requirement `uvicorn[standard]` | ASGI server | Local backend startup |
| Pydantic | 2.14.3 locally; resolved transitively with no direct requirement listed | Request and prescription schemas | `main.py`, `prescription_models.py` |
| Groq Python SDK | 1.7.0 locally; unpinned requirement `groq` | Async LLM requests | Chat, prescription extraction and Q&A |
| Groq model identifier | `qwen/qwen3.8-27b` source default | Text response/extraction model | `GROQ_MODEL`; availability must be confirmed in provider account |
| httpx | 0.28.1 locally; unpinned requirement | Async Gnani REST calls | Prisma and Timbre integration |
| python-dotenv | 1.2.4 locally; unpinned requirement | Loads `backend/.env` | `backend/app/main.py` |
| python-multipart | 0.0.33 locally; unpinned requirement | FastAPI multipart uploads/forms | STT and prescription extraction endpoints |
| PyMuPDF (`fitz`) | 1.28.2 locally; `>=1.24,<2.0` | PDF text extraction and page rendering | `backend/app/ocr_service.py` |
| Pillow | 13.0.0 locally; `>=10.0` | Image loading, orientation/contrast preprocessing | OCR service |
| pytesseract | 0.3.13 locally; `>=0.3.13` | Python wrapper around external Tesseract binary | OCR service |
| Tesseract OCR | External binary; version not established | OCR of images/scanned PDF pages | Installed separately on host |
| Node.js | 23.3.0 (inspected environment) | Frontend tooling/runtime | Vite/npm |
| npm | 11.13.0 (inspected environment) | JavaScript dependency installation/scripts | Root and `frontend/` manifests |
| React / React DOM | 19.3.1 resolved; manifest says `latest` | UI and client state | `frontend/src/` |
| Vite | 8.3.7 resolved; manifest says `latest` | Dev server and production bundling | `frontend/` |
| `@vitejs/plugin-react` | 6.3.0 resolved; manifest says `latest` | React transform for Vite | `frontend/package.json` |
| Firebase JavaScript SDK | 12.5.0 resolved; `^12.5.0` | Browser Anonymous Auth and Firestore Lite | `frontend/src/firebase.js` |
| Firebase Authentication | Project-side service; version not applicable | Anonymous owner identity | Firebase web SDK |
| Cloud Firestore | Project-side service; version not applicable | Session metadata and verified prescription records | Firebase web SDK, `firestore.rules` |
| Gnani Prisma | Hosted REST API; provider version/model `prisma-v3.0` | Speech-to-text | `POST /voice/stt` |
| Gnani Timbre | Hosted REST API; model `timbre-v3.0` | Text-to-speech | `/chat`, `/voice/tts`, playback UI |
| Gnani Vachana Python SDK | Not installed or used by current source | None; Gnani requests use `httpx` directly | SDK link is reference material only |
| Vitest | 4.1.12 resolved, `^4.1.12` | Frontend component tests | `frontend/src/SpeechPlayback.test.jsx` |
| jsdom | 27.0.1 resolved, `^27.0.1` | Browser-like test DOM | Frontend tests |
| Testing Library React | 16.3.3 resolved, `^16.3.3` | Component rendering/assertions | Frontend tests |
| Testing Library user-event | 14.6.10 resolved, `^14.6.10` | Simulated user actions | Frontend tests |
| pytest | 9.2.0 locally, requirement `>=8.3` | Backend/OCR/provider-mock tests | `backend/tests/` |

The root `package.json` separately lists Firebase and an `@grpc/grpc-js` override. The actual browser app is installed from `frontend/package.json`. The root `.env.example` has blank `GNANI_STT_URL`/`GNANI_TTS_URL` entries that are not read by current code. `TESSDATA_PREFIX` is documented in `backend/.env.example` but is not directly read by Python source; `TESSERACT_CMD` is read by OCR code.

### Repository map

```text
ArogyaVoice/
├── .env.example                    Root template; contains unused Gnani URL entries
├── .gitignore                      Ignores env files, virtualenvs, dependencies and build output
├── Arogya_Voice_Solution_Pitch.txt Existing pitch artifact; not used at runtime
├── package.json / package-lock.json Separate root npm manifest/lockfile
├── backend/
│   ├── .env.example                Backend config template
│   ├── requirements.txt            Python dependencies
│   ├── app/main.py                 FastAPI, Groq chat, Prisma/Timbre integration
│   ├── app/ocr_service.py          PDF/image validation and OCR
│   ├── app/prescription_models.py  Pydantic request/data schemas
│   ├── app/prescription_extractor.py Groq OCR-to-structured draft
│   ├── app/prescription_assistant.py Groq prescription Q&A
│   ├── app/prescription_routes.py  Prescription endpoints
│   └── tests/                      OCR and mocked provider tests
├── frontend/
│   ├── .env.example                Firebase/API browser config template
│   ├── index.html                  Vite HTML entry
│   ├── package.json / package-lock.json Frontend dependencies and lockfile
│   └── src/                        App, Firebase adapter, prescription/player components and styles/tests
├── firestore.rules                 Firestore owner/security rules
├── docs/                            Setup, API and feature-status documents
├── README.md                        GitHub overview and quick start
├── PROJECT_DOCUMENTATION.md         Detailed technical reference
└── AI_CONTEXT.md                    Fresh AI-session handoff
```

## C. Frontend architecture

The frontend is a single React app without a routing library. `frontend/src/main.jsx` mounts `App`. `App.jsx` controls welcome, language selection, chat, language dictionaries, chat state, session creation, STT upload and `/chat` requests. It conditionally mounts `PrescriptionWorkspace` for the medicine cabinet. `SpeechPlayback.jsx` is the reusable speech player; styling is split among `style.css`, `prescription.css` and `speech-playback.css`.

### Navigation and state

- `App` owns the selected language (`en`, `kn`, `te`, `hi`), welcome/chat messages, text draft, voice/text mode, pending state and anonymous Firestore session ID.
- The initial welcome form has patient name, phone and Ayushman fields. It is open and has no OTP/password. The submit handler reads only `patientName`; phone and card data are not saved or passed to the backend. Patient name is only local UI state.
- Language selection initializes the greeting and calls `createSession(language)`. “New conversation” returns to language selection.
- Prescription pages (`cabinet`, `upload`, `review`, `ask`) and their data/history live inside `PrescriptionWorkspace`. Prescription Q&A history is transient React state.
- Main chat sends the current user turn and up to 16 recent in-memory turns. A fresh tab/reload does not restore chat history from Firestore.

### Voice input and backend calls

The browser checks `getUserMedia`/`MediaRecorder`, records up to 30 seconds, then `blobToWav` decodes and converts the recording to mono PCM WAV. It posts a multipart file and selected language to `/voice/stt`. The transcript is passed to `sendMessage`, which posts JSON to `/chat`. If an additional question is submitted, the prior browser fetch is aborted, pending UI is replaced, old playback is cancelled and request IDs prevent a stale response from updating the UI. An upstream call already executing on the server may continue after browser cancellation.

### Main-chat audio playback

`/chat` returns `reply` and `audio_base64` only after Groq and Timbre succeed. The browser decodes the base64 WAV into a Blob; the reply only enters visible chat state after the combined response. `SpeechPlayback` creates a temporary object URL and tries autoplay. If the browser blocks autoplay, it retains the audio and shows a localized Play action. Pause, Resume, Restart and Stop reuse the cached audio. Submitting another question removes the previous audio Blob from React state and revokes its object URL.

Because one full-response WAV has no sentence timing metadata, the component estimates sentence progress by audio duration and sentence text length. That highlight is illustrative, not synchronized word timing. On TTS failure after Groq, the response object keeps the text internally but the UI shows only a localized failure message, Retry Audio and View Text Only actions. Retry calls `/voice/tts` only.

The Prescription Intelligence Q&A screen still uses the player’s legacy user-initiated mode: Play requests a Timbre clip for each sentence and highlights the sentence whose clip is playing. It is a different flow from main chat.

## D. Backend architecture

`backend/app/main.py` creates FastAPI, loads `backend/.env`, configures CORS, defines health/language/chat/STT/TTS routes, and includes `prescription_routes.py`. Request bodies use Pydantic. The backend uses no Firebase SDK or Admin credentials; the frontend writes Firestore records directly under client security rules.

Modules:

- `main.py`: Groq health conversation, Prisma STT, Timbre TTS, audio validation and shared configuration.
- `prescription_routes.py`: multipart prescription extraction and JSON Q&A routes.
- `ocr_service.py`: upload validation, PyMuPDF text extraction, image/page OCR with Pillow and pytesseract.
- `prescription_extractor.py`: Groq structured extraction from OCR text into Pydantic schema.
- `prescription_assistant.py`: Groq Q&A on user-reviewed prescription fields.
- `prescription_models.py`: constrained Pydantic models for medicines, prescriptions and history.
- `tests/test_prescription_intelligence.py`: synthetic OCR/PDF and provider-mock tests.

FastAPI returns Pydantic errors as `422`. Provider exceptions are usually converted to `502`/`503` user-facing messages; some safe logs contain upstream status, limited provider error text or response metadata. No auth middleware, request rate limit, production deployment or provider webhooks are implemented.

## E. Detailed AI workflow

`POST /chat` constructs a system message with the language name and safety guidance, appends up to 16 supplied turns and the current user question, then calls `AsyncGroq` with model from `GROQ_MODEL` (source default `qwen/qwen3.8-27b`), 45-second timeout, one client retry, temperature 0.3 and `max_completion_tokens=450`. Empty output or Groq failures become errors. The reply is passed to Timbre before returning to the frontend.

Prescription OCR text is limited to 12,000 characters in the extraction prompt. The extraction call uses the same model setting, temperature 0, JSON response format and up to 1,200 completion tokens. It asks the model to use null for missing/uncertain fields, validates the result with `PrescriptionData`, forces `status="needs_review"`, and forces each medicine to require doctor confirmation. This is data extraction, not verification of medical correctness.

Prescription Q&A uses the configured model, 45-second timeout, one retry, temperature 0.2 and up to 500 tokens. Its prompt labels prescription JSON as user-reviewed input and prohibits altering directions. It is not a clinical validation service.

## F. Gnani AI integration

### Gnani Prisma (STT)

- Purpose: convert patient voice recording into transcript text.
- Endpoint: `https://api.vachana.ai/stt/v3` (`POST`).
- Auth: `X-API-Key-ID` header set from backend-only `GNANI_API_KEY`.
- Request: multipart file field `audio_file`; form fields `model=prisma-v3.0` and `language_code` mapped from app language (`en-IN`, `kn-IN`, `te-IN`, `hi-IN`). Backend accepts a list of audio filename extensions and enforces a 15 MiB maximum; frontend caps recording duration at 30 seconds.
- Expected provider response: JSON with `success`, `transcript`, and optionally `detected_language_code`; endpoint treats `success` other than true as failure.
- App response: `{transcript, detected_language_code}`. Frontend then calls `/chat`.
- Errors: missing key -> 503, bad/empty/oversize upload -> 415/400/413, provider/network/JSON errors -> 502.

### Gnani Timbre (TTS)

- Purpose: synthesize a selected-language WAV reply.
- Endpoint: `https://api.vachana.ai/api/v1/tts/inference` (`POST`).
- Auth: `X-API-Key-ID` header set from `GNANI_API_KEY`, plus JSON content type.
- Request: `text`, model `timbre-v3.0`, voice `Shivani`, language locale mapping, speed 1.0, `audio_config` of 48,000 Hz, one channel, 2-byte samples, `linear_pcm`, `wav` container.
- Expected response: raw WAV audio bytes. The backend parses WAV headers and rejects unreadable/empty audio.
- Main chat: one TTS request after Groq, and JSON includes base64 WAV plus text only when audio is validated. On failure it returns the generated text internally in `voice_status: failed` data so the UI can offer TTS-only retry or text-only reveal.
- Retry/prescription player: `/voice/tts` returns `audio/wav` bytes. Prescription playback segments text and requests each sentence after explicit user playback action; main chat does not.
- No persisted or public audio asset is created. Main chat keeps audio in browser memory; temporary object URLs are revoked on cancellation/replacement/unmount.

Provider quotas, account access, exact support of each locale/voice and live response behavior cannot be inferred from repository code. Confirm against the current Gnani account/docs. Never place credentials in frontend env files.

## G. Prescription Intelligence workflow

1. User selects or captures PDF, JPG, JPEG or PNG. Frontend previews the selected file using an object URL and posts it to `/prescriptions/extract`; it is not stored in Firebase Storage.
2. Backend enforces 10 MiB maximum, 8 PDF pages and 30-megapixel image dimensions. PyMuPDF reads embedded PDF text. Pages with less than 25 extracted characters are rasterized and OCR'd. Images are EXIF-corrected, resized to at most 2400×2400, optionally orientation-corrected, converted to grayscale and contrast-adjusted.
3. Tesseract reads images using `eng`, `kan+eng`, `tel+eng` or `hin+eng` where installed. Missing packs may fall back to available language data and return a warning. `TESSERACT_CMD` can specify the binary path. Handwriting quality is not guaranteed.
4. Extracted text (maximum 12,000 characters in Groq prompt) is sent to Groq. The model is asked to extract only legible source facts and not infer missing medication details. Pydantic validates doctor/date/instruction and medicine fields. Every output remains `needs_review` and marked for confirmation.
5. User compares every field against the source preview, edits or adds medicine rows, and checks a review box for each medicine. This is user confirmation, not doctor verification. A separate `needs_doctor_confirmation` field can continue to flag uncertain details.
6. On confirmation the frontend sets status `verified` and writes a structured record to Firestore `prescriptions` if Firebase is configured. Without Firebase, the cabinet is temporary in component state and disappears on page reload.
7. User can view/delete cabinet entries and ask a question. `/prescriptions/ask` only accepts a record whose status is `verified`; Groq receives the provided structured record, question and up to 12 in-memory turns. The answer uses the selected language and an instruction not to alter directions. Prescription assistant text is not persisted. Optional voice input uses `/voice/stt`; speech playback currently starts on explicit Play and calls `/voice/tts` sentence-by-sentence.

The UI limits and backend validation are in the source; do not assume OCR extraction is accurate. Every prescription detail should be checked against its original and a qualified professional.

## H. Firebase architecture

Only browser Firebase services are used: Firebase App, Anonymous Auth and `firebase/firestore/lite`. `frontend/src/firebase.js` requires all six Vite Firebase config fields before initializing. The backend has no Firebase Admin SDK/service account.

### Collections and fields found in source/rules

- `sessions/{sessionId}`: `ownerId`, `language`, `createdAt`, `lastActivityAt`. Creation is via a random UUID when available; timestamps use server timestamps. Update only changes `lastActivityAt`. The application does not store messages here.
- `prescriptions/{generatedDocumentId}`: verified prescription data fields `doctor_name`, `prescription_date`, `medicines`, `other_instructions`, `status`, plus `ownerId`, `createdAt`, `updatedAt`. Medicine fields are defined in `prescription_models.py` (`medicine_name`, `strength`, `dosage`, `frequency`, `timing`, `duration`, `route`, `instructions`, `confidence`, `needs_doctor_confirmation`). The rule validates allowed top-level keys, verified status and record bounds; it does not deeply validate all medicine field values.

Rules require an authenticated Firebase user and compare owner ID to `request.auth.uid`. Prescription records can be read/deleted by their owner; updates must preserve owner/creation time and set update time to request time. Session updates only allow changing `lastActivityAt`; sessions are owner-scoped. The catch-all denies other access. Rules do not make app data HIPAA/production compliant. They must be manually deployed to the matching project.

The patient name, phone and card form fields are not used for identity; Firebase Anonymous Auth creates a separate unlinked ID. Clearing browser data can lose that anonymous account. A configured Firebase project is required for persistence; otherwise code returns temporary/local fallback behavior.

## I. API reference

See [docs/API_REFERENCE.md](docs/API_REFERENCE.md) for schemas, request examples, response examples and error status details. Actual routes:

| Method | Route | Purpose |
|---|---|---|
| GET | `/health` | Liveness check. |
| GET | `/languages` | Supported language codes. |
| POST | `/chat` | Groq health reply then Timbre synthesis; returns reply + base64 WAV or TTS failure status. |
| POST | `/voice/stt` | Multipart audio → Gnani Prisma transcript. |
| POST | `/voice/tts` | JSON text → Gnani Timbre WAV bytes. |
| POST | `/prescriptions/extract` | Multipart PDF/image → OCR/Groq unverified extraction draft. |
| POST | `/prescriptions/ask` | JSON verified prescription + question/history → Groq explanation. |

There are no server-side login, Firebase, prescription save, or file-upload storage routes.

## J. Known limitations

- This is a non-clinical prototype. The healthcare system prompt does not enforce correct medical advice, and no clinician-reviewed triage rules or independent emergency detection are present.
- The default model string may not be available to every Groq account; the repository has no capability check.
- API keys, provider quotas, network access, TTS voice access, and Firebase project setup are machine/account-specific.
- Browser Autoplay Policy may block automatic play; the interface offers a localized Play fallback. Microphone support needs a browser with `MediaRecorder` and a secure context (localhost is allowed by modern browsers).
- Main chat highlights approximate sentence timing because the full WAV lacks alignment metadata; prescription Q&A player uses independent sentence clips.
- Prescription secondary UI copy is not fully localized. OCR needs external Tesseract and language data; handwriting is especially error-prone.
- Firebase identity is anonymous and not recoverable through the welcome form. Firebase configuration is optional and app fallback may be temporary; deploy/test rules before relying on persistence.
- Backend endpoints have no caller authentication or rate limiting. CORS does not protect the API from non-browser clients.
- Python requirements are unpinned. Frontend package files include `latest` for React/Vite/plugin; lockfiles currently capture resolved versions but future installs may differ if lockfiles are regenerated.
- Documentation inspection does not verify live provider credentials, current project console settings, or production hosting.

## K. Troubleshooting

| Error or symptom | Likely cause and action |
|---|---|
| Groq service is unavailable / missing assistant configuration | Ensure backend `.env` exists and contains a locally valid `GROQ_API_KEY`; verify `GROQ_MODEL` availability. Restart backend after changing env. Never share the key. |
| Assistant text does not appear; voice retry offered | Groq returned text but TTS failed; choose Retry Audio or explicitly View Text Only. Check Gnani key/quota/locale and backend logs. |
| Firebase `auth/configuration-not-found` | Enable Authentication for the selected Firebase project; confirm `VITE_FIREBASE_PROJECT_ID` matches. |
| Firebase `auth/admin-restricted-operation` / `auth/operation-not-allowed` | Enable Anonymous sign-in and account creation in the Firebase Console. |
| Firestore permission denied | Publish `firestore.rules` to the matching project, reload, check anonymous auth and owner-scoped query. |
| No Firestore save | Check all six Firebase config fields are set; `firebase.js` disables Firebase if any one is blank. |
| CORS/network error | Check backend is running and exact Vite origin is included in `FRONTEND_ORIGINS`; check `VITE_API_BASE_URL`. |
| OCR no text/fallback | Install Tesseract and needed language data; configure `TESSERACT_CMD` if required; use a clear scan and manually verify. |
| Audio plays only after button press | Browser may block autoplay. The localized Play control is the intended fallback; initial combined response still includes validated audio. |

