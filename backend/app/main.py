from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

app = FastAPI(title="Arogya Voice API", version="0.1.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)

SUPPORTED_LANGUAGES = {"en", "kn", "te", "hi"}


class TriageRequest(BaseModel):
    language: str = Field(pattern="^(en|kn|te|hi)$")
    concern: str = Field(min_length=1, max_length=2000)


@app.get("/health")
def health():
    return {"status": "ok", "service": "arogya-voice-api"}


@app.get("/languages")
def languages():
    return {"languages": sorted(SUPPORTED_LANGUAGES)}


@app.post("/triage")
def triage(request: TriageRequest):
    # Deliberately conservative placeholder: reviewed clinical rules are required before use.
    # No diagnosis, urgency score, or treatment recommendation is generated here.
    return {
        "language": request.language,
        "message": "Thank you for sharing. Please speak with a qualified healthcare professional for personal medical advice.",
        "emergency": "If you may be in immediate danger or have severe symptoms, contact local emergency services now.",
        "disclaimer": "Prototype only. Not a diagnosis or a substitute for professional care.",
    }
