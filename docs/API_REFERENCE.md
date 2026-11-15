# Arogya Voice API Reference

This reference is based on the FastAPI routes in `backend/app/main.py` and `backend/app/prescription_routes.py`. The default local API base is `http://localhost:8000`. Interactive OpenAPI documentation is available at `/docs` while the backend is running.

The backend does not authenticate callers. CORS allows the origins listed by `FRONTEND_ORIGINS` (default: `http://localhost:5173,http://127.0.0.1:5173`). CORS is not authentication or abuse protection.

## `GET /health`

Basic liveness response.

```json
{"status":"ok","service":"arogya-voice-api"}
```

## `GET /languages`

Returns language codes configured by the backend.

```json
{"languages":["en","hi","kn","te"]}
```

## `POST /chat`

Generates a health-information reply using Groq, then asks Gnani Timbre to synthesize it before returning. The browser sends in-memory conversation history; the backend does not load or persist chat history.

Request JSON:

```json
{
  "language":"en",
  "message":"I have a headache",
  "history":[{"role":"user","content":"Example earlier question"}]
}
```

`language` is one of `en`, `kn`, `te`, `hi`; `message` is 1–2000 characters; `history` is optional and limited to 16 turns, each with `role` `user` or `assistant` and 1–2000 character `content`.

TTS success response:

```json
{
  "reply":"A cautious, general response in the selected language.",
  "model":"qwen/qwen3.8-27b",
  "voice_status":"ready",
  "audio_base64":"<base64-encoded WAV bytes>",
  "audio_content_type":"audio/wav"
}
```

The model field reports the configured model string; it does not independently verify provider support. The frontend decodes the WAV into a browser-memory Blob and starts playback. No public audio URL is produced.

If Groq succeeds but TTS fails, the route returns a JSON object with the generated `reply`, `model`, `voice_status: "failed"`, and null audio fields. The React UI keeps the reply hidden and offers TTS retry or an explicit text-only reveal. Retrying uses `/voice/tts`, not `/chat`, so it does not repeat Groq.

Common errors: `503` when `GROQ_API_KEY` is missing; `502` for Groq failure or empty model response; `422` for request validation. When TTS fails after Groq, the route currently returns the structured `voice_status: "failed"` response rather than a non-2xx status.

## `POST /voice/stt`

Transcribes a recorded clip through Gnani Prisma. Multipart form fields:

| Field | Type | Notes |
|---|---|---|
| `audio_file` | file | Supported extensions: WAV, MP3, OGG, FLAC, AAC, M4A; maximum 15 MiB at backend. |
| `language` | string | `en`, `kn`, `te`, or `hi`; converted to `en-IN`, `kn-IN`, `te-IN`, or `hi-IN`. |

The frontend currently records at most 30 seconds, decodes/resamples to mono WAV in the browser, then posts that WAV file.

Successful response:

```json
{"transcript":"Example transcript","detected_language_code":"en-IN"}
```

The React client then submits the transcript to `/chat`. Prisma request authentication is `X-API-Key-ID` using `GNANI_API_KEY`; the endpoint is `https://api.vachana.ai/stt/v3`, with multipart `model=prisma-v3.0` and `language_code`.

Common errors: `503` missing `GNANI_API_KEY`; `400` empty recording; `413` over the byte limit; `415` unsupported extension; `502` provider rejection, invalid JSON or provider/network error; `422` invalid form language.

## `POST /voice/tts`

Timbre speech-only endpoint, used by the chat UI's **Retry audio** action and by the prescription reply player. It does not call Groq.

Request JSON:

```json
{"language":"en","text":"Text to speak."}
```

`language` is one of `en`, `kn`, `te`, `hi`; `text` is 1–3000 characters. The endpoint uses `https://api.vachana.ai/api/v1/tts/inference`, header `X-API-Key-ID: <GNANI_API_KEY>`, model `timbre-v3.0`, voice `Shivani`, speed `1.0`, locale mapping as above, and PCM/WAV configuration at 48 kHz, mono, 16-bit.

Success is raw `audio/wav` bytes with `Cache-Control: no-store`; FastAPI validates that the result is a non-empty WAV before returning it. It is not a download endpoint and the UI does not expose a download link/control.

Common errors: `503` missing speech key; `502` provider/network error, malformed WAV or empty WAV; `422` invalid request body.

## `POST /prescriptions/extract`

Multipart form fields:

| Field | Type | Notes |
|---|---|---|
| `file` | file | PDF, JPG, JPEG or PNG; max 10 MiB; PDFs max 8 pages. |
| `language` | string | Defaults to `en`; supported `en`, `kn`, `te`, `hi`. |

PDF text is extracted with PyMuPDF. Pages with fewer than 25 text characters are rendered and sent through OCR; images use Pillow preprocessing and Tesseract. The extracted text is passed to Groq and validated as a `PrescriptionData` object. Every result has `status: "needs_review"` and each medicine is marked for doctor confirmation. The user must compare and edit the draft before saving.

Typical response:

```json
{
  "prescription": {
    "doctor_name": null,
    "prescription_date": null,
    "medicines": [],
    "other_instructions": null,
    "status": "needs_review"
  },
  "source_kind":"pdf",
  "warning":null,
  "message":"Review every field against the original document. Do not rely on unclear extracted directions."
}
```

`warning` can report missing non-English Tesseract data and fallback behavior. If no text is found, the route returns an empty `needs_review` draft and a manual-entry message.

Errors include `400` empty file, `413` file/page/image-dimension limit exceeded, `415` unsupported type, `422` unreadable document or unsupported language, `503` missing `GROQ_API_KEY`, and `502` extraction/model failure. Uploads are processed in memory; no file-storage endpoint exists.

## `POST /prescriptions/ask`

JSON body uses the Pydantic `PrescriptionQuestion` schema:

```json
{
  "language":"en",
  "question":"What details are recorded?",
  "history":[],
  "prescription":{
    "doctor_name":null,
    "prescription_date":null,
    "medicines":[{"medicine_name":"Example","confidence":"high","needs_doctor_confirmation":false}],
    "other_instructions":null,
    "status":"verified"
  }
}
```

The API rejects a record whose status is not `verified` (`400`). History is optional, maximum 12 turns. The route sends the supplied verified record, question and history to Groq and returns:

```json
{"reply":"A cautious explanation in the selected language."}
```

The assistant is instructed not to infer or change medication directions. This is an LLM prompt, not independent medical validation. Common errors: `400` unverified record, `503` missing `GROQ_API_KEY`, `502` Groq failure/empty response, `422` validation failure.

## Validation and provider failures

FastAPI/Pydantic validation errors use `422`. Provider error details are generally replaced with safe user-facing messages. The code does not implement rate limiting, request authentication, a general request-size middleware, or provider retries beyond the Groq client's `max_retries=1` configuration.
