from __future__ import annotations

import os
import io
import logging
from pathlib import Path
from typing import Literal
import wave

import httpx
from dotenv import load_dotenv
from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response
from groq import AsyncGroq
from pydantic import BaseModel, Field

BACKEND_DIR = Path(__file__).resolve().parents[1]
load_dotenv(BACKEND_DIR / ".env")

Language = Literal["en", "kn", "te", "hi"]
LANGUAGE_NAMES = {
    "en": "English",
    "kn": "Kannada (ಕನ್ನಡ)",
    "te": "Telugu (తెలుగు)",
    "hi": "Hindi (हिन्दी)",
}
GNANI_LOCALES = {"en": "en-IN", "kn": "kn-IN", "te": "te-IN", "hi": "hi-IN"}

app = FastAPI(title="Arogya Voice API", version="0.2.0")
logger = logging.getLogger(__name__)
app.add_middleware(
    CORSMiddleware,
    allow_origins=os.getenv("FRONTEND_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173").split(","),
    allow_credentials=False,
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type"],
)

SYSTEM_PROMPT = """You are Arogya Voice, a careful multilingual healthcare information assistant for a prototype.
Reply only in {language}. Be warm, plain-spoken, and concise. Ask one or two relevant follow-up questions when important details are missing instead of jumping to conclusions.
You are not a clinician. Never diagnose a disease, claim certainty, prescribe a medicine, recommend a dosage, or tell someone to start, stop, or change treatment. Offer only low-risk general wellbeing information. Encourage the person to contact a qualified healthcare professional for individual advice, persistent symptoms, or worsening symptoms.
If the person describes a possible immediate emergency or severe danger, tell them to contact their local emergency number or go to the nearest emergency department now. Do not delay that advice with questions.
Do not invent clinical facts or pretend that doctor-reviewed triage rules are configured. If you are unsure, say so and direct them to a healthcare professional. Do not ask for their name, phone number, government ID, address, or other identifying information. Avoid frightening language.
This is a prototype; do not present your answer as a diagnosis or a substitute for professional care."""

MAX_AUDIO_BYTES = 15 * 1024 * 1024
ALLOWED_AUDIO_EXTENSIONS = {".wav", ".mp3", ".ogg", ".flac", ".aac", ".m4a"}


class ChatTurn(BaseModel):
    role: Literal["user", "assistant"]
    content: str = Field(min_length=1, max_length=2000)


class ChatRequest(BaseModel):
    language: Language
    message: str = Field(min_length=1, max_length=2000)
    history: list[ChatTurn] = Field(default_factory=list, max_length=16)


class SpeechRequest(BaseModel):
    language: Language
    text: str = Field(min_length=1, max_length=3000)


@app.get("/health")
async def health():
    return {"status": "ok", "service": "arogya-voice-api"}


@app.get("/languages")
async def languages():
    return {"languages": sorted(LANGUAGE_NAMES)}


@app.post("/chat")
async def chat(request: ChatRequest):
    api_key = os.getenv("GROQ_API_KEY", "").strip()
    if not api_key:
        raise HTTPException(status_code=503, detail="The assistant is not configured yet. Add GROQ_API_KEY to backend/.env.")

    model = os.getenv("GROQ_MODEL", "qwen/qwen3.8-27b").strip()
    client = AsyncGroq(api_key=api_key, timeout=45.0, max_retries=1)
    messages = [{"role": "system", "content": SYSTEM_PROMPT.format(language=LANGUAGE_NAMES[request.language])}]
    messages.extend({"role": turn.role, "content": turn.content} for turn in request.history[-16:])
    messages.append({"role": "user", "content": request.message.strip()})

    try:
        completion = await client.chat.completions.create(
            model=model,
            messages=messages,
            temperature=0.3,
            max_completion_tokens=450,
        )
    except Exception as exc:
        # Provider responses and request content are deliberately not logged or returned.
        raise HTTPException(status_code=502, detail="The assistant service is temporarily unavailable. Please try again.") from exc
    finally:
        await client.close()

    reply = (completion.choices[0].message.content or "").strip()
    if not reply:
        raise HTTPException(status_code=502, detail="The assistant could not prepare a reply. Please try again.")
    return {"reply": reply, "model": model}


@app.post("/voice/stt")
async def speech_to_text(
    audio_file: UploadFile = File(...),
    language: Language = Form(...),
):
    api_key = os.getenv("GNANI_API_KEY", "").strip()
    if not api_key:
        raise HTTPException(status_code=503, detail="Speech recognition is not configured. Add GNANI_API_KEY to backend/.env.")
    filename = Path(audio_file.filename or "recording.wav").name
    if Path(filename).suffix.lower() not in ALLOWED_AUDIO_EXTENSIONS:
        raise HTTPException(status_code=415, detail="Use a WAV, MP3, OGG, FLAC, AAC, or M4A recording under 30 seconds.")
    audio = await audio_file.read(MAX_AUDIO_BYTES + 1)
    if not audio:
        raise HTTPException(status_code=400, detail="The recording is empty. Please record again.")
    if len(audio) > MAX_AUDIO_BYTES:
        raise HTTPException(status_code=413, detail="The recording is too large. Please record a shorter clip.")

    try:
        async with httpx.AsyncClient(timeout=65.0) as client:
            result = await client.post(
                "https://api.vachana.ai/stt/v3",
                headers={"X-API-Key-ID": api_key},
                files={"audio_file": (filename, audio, audio_file.content_type or "audio/wav")},
                data={"model": "prisma-v3.0", "language_code": GNANI_LOCALES[language]},
            )
        result.raise_for_status()
        payload = result.json()
    except httpx.HTTPStatusError as exc:
        raise HTTPException(status_code=502, detail="Speech recognition could not process that recording. Please try again.") from exc
    except (httpx.HTTPError, ValueError) as exc:
        raise HTTPException(status_code=502, detail="Speech recognition is temporarily unavailable. Please try again.") from exc

    if payload.get("success") is not True:
        raise HTTPException(status_code=502, detail="Speech recognition could not process that recording. Please try again.")
    return {
        "transcript": payload.get("transcript", ""),
        "detected_language_code": payload.get("detected_language_code"),
    }


@app.post(
    "/voice/tts",
    response_class=Response,
    responses={200: {"content": {"audio/wav": {"schema": {"type": "string", "format": "binary"}}}}},
)
async def text_to_speech(request: SpeechRequest):
    api_key = os.getenv("GNANI_API_KEY", "").strip()
    if not api_key:
        raise HTTPException(status_code=503, detail="Speech output is not configured. Add GNANI_API_KEY to backend/.env.")

    payload = {
        "text": request.text.strip(),
        "model": "timbre-v3.0",
        "voice": "Shivani",
        "language": GNANI_LOCALES[request.language],
        "speed": 1.0,
        "audio_config": {
            "sample_rate": 48000,
            "num_channels": 1,
            "sample_width": 2,
            "encoding": "linear_pcm",
            "container": "wav",
        },
    }
    try:
        async with httpx.AsyncClient(timeout=65.0) as client:
            result = await client.post(
                "https://api.vachana.ai/api/v1/tts/inference",
                headers={"X-API-Key-ID": api_key, "Content-Type": "application/json"},
                json=payload,
            )
        result.raise_for_status()
    except httpx.HTTPStatusError as exc:
        raise HTTPException(status_code=502, detail="Speech output is temporarily unavailable. You can still read the reply.") from exc
    except httpx.HTTPError as exc:
        raise HTTPException(status_code=502, detail="Speech output is temporarily unavailable. You can still read the reply.") from exc

    audio_bytes = result.content
    try:
        with wave.open(io.BytesIO(audio_bytes), "rb") as audio_file:
            frame_count = audio_file.getnframes()
            sample_rate = audio_file.getframerate()
    except (wave.Error, EOFError, OSError) as exc:
        logger.warning(
            "Gnani TTS returned non-WAV audio: upstream_status=%s content_type=%s bytes=%s",
            result.status_code,
            result.headers.get("content-type", "missing"),
            len(audio_bytes),
        )
        raise HTTPException(
            status_code=502,
            detail="Speech service returned an unreadable audio file. You can still read the reply.",
        ) from None

    if frame_count <= 0 or sample_rate <= 0:
        logger.warning(
            "Gnani TTS returned an empty WAV: upstream_status=%s content_type=%s bytes=%s frames=%s sample_rate=%s",
            result.status_code,
            result.headers.get("content-type", "missing"),
            len(audio_bytes),
            frame_count,
            sample_rate,
        )
        raise HTTPException(
            status_code=502,
            detail="Speech service returned an empty audio file. You can still read the reply.",
        )

    logger.info(
        "Gnani TTS audio validated: upstream_status=%s content_type=%s bytes=%s duration_seconds=%.2f",
        result.status_code,
        result.headers.get("content-type", "missing"),
        len(audio_bytes),
        frame_count / sample_rate,
    )
    return Response(content=audio_bytes, media_type="audio/wav", headers={"Cache-Control": "no-store"})
