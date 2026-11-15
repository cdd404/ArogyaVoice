# Feature Status (Source-Based)

Status reflects files present in this repository, not previous plans or provider-side configuration. “Implemented” means a code path exists; it does not prove the external account is configured or that the feature is clinically validated.

## Implemented

| Feature | Evidence / boundary |
|---|---|
| Welcome form with patient name, phone and Ayushman fields | `frontend/src/App.jsx`; form submits without OTP/password. Only patient name is read into component state; phone/card are not stored or used for authentication. |
| Language selection: English, Kannada, Telugu, Hindi | `App.jsx` language state and language dictionary; codes `en`, `kn`, `te`, `hi` are sent to backend. |
| Text health chat and short conversational context | `App.jsx` holds messages in React state and sends up to 16 turns to `/chat`. No chat transcript is written to Firebase by the client. |
| Groq health response | `backend/app/main.py`; prompt requires selected language, plain language, follow-up questions, no diagnosis/prescribing and emergency referral when the model recognizes an immediate danger. This is prompt guidance, not clinical validation. |
| Generate main-chat voice before revealing response | `/chat` calls Groq then `generate_tts_audio`; ready JSON contains reply and base64 WAV. On TTS failure, UI keeps reply hidden until retry or text-only reveal. |
| Automatic playback and controls for main chat | `SpeechPlayback.jsx` accepts the returned Blob; supports Play/Pause/Resume/Restart/Stop without repeating provider calls on the cached audio. Browser autoplay rejection leaves a Play option. |
| Voice question input | `App.jsx` uses browser `MediaRecorder`, WAV conversion and `/voice/stt`; transcript is sent to `/chat`. UI recording limit is 30 seconds. |
| Gnani Prisma STT and Timbre TTS routes | `backend/app/main.py` uses the documented API paths, `X-API-Key-ID` and language mappings. Actual usable account/voice/language entitlements require local verification. |
| Prescription PDF/image upload and preview | `PrescriptionWorkspace.jsx`; supported PDF/JPG/JPEG/PNG, up to 10 MiB and PDF up to 8 pages. Files are processed temporarily by FastAPI, not uploaded to Firebase Storage. |
| OCR and structured draft | `ocr_service.py`, `prescription_extractor.py`, `prescription_models.py`; PyMuPDF text extraction, Pillow preprocessing, Tesseract OCR and Groq JSON extraction. Fields stay nullable; drafts are `needs_review`. |
| User review before cabinet save | `PrescriptionWorkspace.jsx` requires the user to check every displayed medicine. `firebase.js` refuses a non-verified status; the UI's “verified” means user-reviewed, not doctor-certified. |
| Medicine Cabinet | `firebase.js` saves/queries/deletes owner-scoped structured records when Firebase works; otherwise a temporary page-local list is used. |
| Prescription Q&A | `/prescriptions/ask` accepts verified prescription data and up to 12 prior turns; Groq answers in selected language under a cautious instruction prompt. Context is client memory, not persisted as a chat transcript. |
| Anonymous Firebase identity and Firestore rules | `firebase.js` calls `signInAnonymously`; `firestore.rules` limits session and prescription documents to `request.auth.uid`. Firebase requires project-side setup and deployed rules. |
| Automated tests | Frontend playback suite has 14 tests. Backend test source contains OCR, extraction, TTS/STT and chat orchestration tests with mocked providers. Test execution can depend on local Tesseract and Python/Windows event-loop setup. |

## Partially implemented / requires verification

| Feature | Remaining caveat |
|---|---|
| Multilingual interface | Main chat and playback labels are localized. Some welcome text and secondary Prescription Intelligence labels, prompts, warnings and form labels remain English. |
| Main-chat sentence highlighting | Sentence selection is estimated from audio duration and text length. Timbre response does not supply sentence/word alignment metadata, so highlight is not exact. Prescription Q&A has sentence-sized audio requests, but each starts only when the user selects Play. |
| Medical safety | LLM system prompt prohibits diagnosis and prescribing; there are no doctor-reviewed rules, validated triage engine, or independent emergency detector. Model compliance is not guaranteed. |
| Firebase privacy boundary | Rules are present, but must be published to the correct project. The client allows optional Firebase configuration and falls back to temporary data; this does not provide production account recovery. |
| Groq model | Code default is `qwen/qwen3.8-27b`; account availability and current provider support have not been checked by repository code. |
| Speech integration | Code handles provider errors and checks WAV validity. Real API keys, quotas, supported voices/languages and live end-to-end audio playback need local testing. |
| OCR languages | OCR depends on installed Tesseract and language data. Missing language packs can trigger fallback; handwritten prescriptions may remain unreadable. |
| Patient identity | Welcome form is open, and Firebase's anonymous ID is unrelated to form fields. It is not verified patient authentication. |

## Not implemented in this repository

- Clinical diagnosis, autonomous prescribing, medication dose advice, or a doctor-reviewed triage/emergency ruleset.
- OTP, password, verified patient account, phone verification, Ayushman-card lookup, or linking profile fields to Firebase.
- Chat transcript, audio recording, TTS file, or source prescription file persistence.
- Firebase Storage upload or backend Firebase Admin SDK integration.
- A production deployment configuration, hosting workflow, CI pipeline, rate limiting, backend authentication, monitoring, or audit trail.
- Exact word-level speech highlighting/alignment.
- A production-grade medical-record or health-data compliance implementation.

## Future work (not represented as current behavior)

Candidate work, subject to product and clinical review: clinician-authored/localized triage content with explicit governance; verified account and consent flows; robust server-side abuse protection; supported model/provider compatibility checks; Firebase rules emulator tests; production deployment/monitoring; full localization of secondary screens; provider-supplied speech alignment if available; and accessibility/usability review with speakers of all supported languages.
