import asyncio
import base64
import io
import wave

import fitz
import pytest
from fastapi import HTTPException
from PIL import Image, ImageDraw, ImageFont

from app.ocr_service import extract_document_text
from app.prescription_assistant import answer_prescription_question
from app import prescription_extractor
from app import prescription_assistant
from app.prescription_models import PrescriptionData, PrescriptionQuestion
from app import main as api_main


def test_extracts_text_from_synthetic_pdf():
    document = fitz.open()
    page = document.new_page()
    page.insert_text((72, 72), "SYNTHETIC DEMO ONLY\nMedicine: Sample Tablet\nTake as written by clinician")
    data = document.tobytes()
    text, kind = extract_document_text(data, "demo.pdf", "en")
    assert kind == "pdf"
    assert "Sample Tablet" in text


def test_scanned_synthetic_pdf_uses_ocr():
    image = Image.new("RGB", (1200, 300), "white")
    draw = ImageDraw.Draw(image)
    font = ImageFont.truetype("C:/Windows/Fonts/arial.ttf", 48)
    draw.text((30, 70), "SYNTHETIC SCANNED PRESCRIPTION", fill="black", font=font)
    png = io.BytesIO()
    image.save(png, format="PNG")
    document = fitz.open()
    page = document.new_page()
    page.insert_image(page.rect, stream=png.getvalue())
    text, kind = extract_document_text(document.tobytes(), "scan.pdf", "en")
    assert kind == "pdf"
    assert "SYNTHETIC" in text.upper()


def test_extracts_printed_text_from_synthetic_image():
    image = Image.new("RGB", (1100, 260), "white")
    draw = ImageDraw.Draw(image)
    font_path = "C:/Windows/Fonts/arial.ttf"
    try:
        font = ImageFont.truetype(font_path, 48)
    except OSError:
        font = ImageFont.load_default()
    draw.text((30, 45), "SYNTHETIC DEMO PRESCRIPTION", fill="black", font=font)
    draw.text((30, 120), "Sample Tablet 500 mg", fill="black", font=font)
    data = io.BytesIO()
    image.save(data, format="PNG")
    text, kind = extract_document_text(data.getvalue(), "demo.png", "en")
    assert kind == "image"
    assert "SYNTHETIC" in text.upper()


def test_orientation_correction_reads_rotated_synthetic_image():
    image = Image.new("RGB", (1200, 420), "white")
    draw = ImageDraw.Draw(image)
    font = ImageFont.truetype("C:/Windows/Fonts/arial.ttf", 52)
    draw.text((35, 50), "SYNTHETIC DEMO PRESCRIPTION", fill="black", font=font)
    draw.text((35, 145), "Sample Tablet 500 mg", fill="black", font=font)
    draw.text((35, 240), "Verify every written direction", fill="black", font=font)
    rotated = image.rotate(90, expand=True)
    data = io.BytesIO()
    rotated.save(data, format="PNG")
    text, _ = extract_document_text(data.getvalue(), "rotated.png", "en")
    assert "SYNTHETIC" in text.upper()


@pytest.mark.parametrize("filename,data", [("demo.exe", b"data"), ("demo.pdf", b""), ("demo.pdf", b"not a pdf")])
def test_invalid_uploads_fail_safely(filename, data):
    with pytest.raises(HTTPException):
        extract_document_text(data, filename, "en")


def test_structured_extraction_never_fills_missing_medical_fields():
    medicine = PrescriptionData.model_validate({"medicines": [{"medicine_name": "Sample", "confidence": "low"}]})
    assert medicine.medicines[0].dosage is None
    assert medicine.medicines[0].frequency is None
    assert medicine.status == "needs_review"


def test_groq_extraction_keeps_unreadable_fields_missing(monkeypatch):
    class FakeGroq:
        def __init__(self, **kwargs):
            self.chat = type("Chat", (), {})()
            self.chat.completions = type("Completions", (), {})()
            self.chat.completions.create = self.create

        async def create(self, **kwargs):
            return type("Result", (), {"choices": [type("Choice", (), {"message": type("Message", (), {"content": '{"medicines":[{"medicine_name":"Sample","confidence":"low","needs_doctor_confirmation":true}],"status":"verified"}'})()})]})()

        async def close(self):
            return None

    monkeypatch.setenv("GROQ_API_KEY", "synthetic-test-key")
    monkeypatch.setattr(prescription_extractor, "AsyncGroq", FakeGroq)
    result = asyncio.run(prescription_extractor.extract_prescription("Synthetic OCR text", "en"))
    assert result.status == "needs_review"
    assert result.medicines[0].medicine_name == "Sample"
    assert result.medicines[0].dosage is None
    assert result.medicines[0].needs_doctor_confirmation is True


def test_unverified_prescription_cannot_be_used_for_qa():
    request = PrescriptionQuestion(language="en", question="How should I take it?", prescription=PrescriptionData())
    with pytest.raises(HTTPException) as exc:
        asyncio.run(answer_prescription_question(request))
    assert exc.value.status_code == 400


def test_prescription_question_answer_uses_confirmed_record_and_language(monkeypatch):
    observed = {}

    class FakeGroq:
        def __init__(self, **kwargs):
            self.chat = type("Chat", (), {})()
            self.chat.completions = type("Completions", (), {})()
            self.chat.completions.create = self.create

        async def create(self, **kwargs):
            observed.update(kwargs)
            return type("Result", (), {"choices": [type("Choice", (), {"message": type("Message", (), {"content": "This is what the prescription says."})()})]})()

        async def close(self):
            return None

    monkeypatch.setenv("GROQ_API_KEY", "synthetic-test-key")
    monkeypatch.setattr(prescription_assistant, "AsyncGroq", FakeGroq)
    prescription = PrescriptionData(status="verified", medicines=[{"medicine_name": "Sample", "dosage": "as written", "confidence": "high", "needs_doctor_confirmation": False}])
    request = PrescriptionQuestion(language="kn", question="What does this say?", prescription=prescription)
    reply = asyncio.run(answer_prescription_question(request))
    assert reply == "This is what the prescription says."
    assert "Kannada" in observed["messages"][0]["content"]
    assert "confidence is high" in observed["messages"][0]["content"]
    assert "Sample" in observed["messages"][1]["content"]


def test_existing_gnani_tts_route_returns_valid_wav_without_live_call(monkeypatch):
    audio_buffer = io.BytesIO()
    with wave.open(audio_buffer, "wb") as wav:
        wav.setnchannels(1)
        wav.setsampwidth(2)
        wav.setframerate(16000)
        wav.writeframes(b"\0\0" * 160)
    audio_data = audio_buffer.getvalue()
    captured = {}

    class FakeResponse:
        content = audio_data
        status_code = 200
        headers = {"content-type": "audio/wav"}

        def raise_for_status(self):
            return None

    class FakeClient:
        async def __aenter__(self):
            return self

        async def __aexit__(self, *args):
            return None

        async def post(self, url, **kwargs):
            captured.update(url=url, **kwargs)
            return FakeResponse()

    monkeypatch.setenv("GNANI_API_KEY", "synthetic-test-key")
    monkeypatch.setattr(api_main.httpx, "AsyncClient", lambda **kwargs: FakeClient())
    response = asyncio.run(api_main.text_to_speech(api_main.SpeechRequest(language="en", text="Synthetic response")))
    assert response.media_type == "audio/wav"
    assert response.body == audio_data
    assert captured["url"].endswith("/api/v1/tts/inference")
    assert captured["headers"]["X-API-Key-ID"] == "synthetic-test-key"
    assert captured["json"]["text"] == "Synthetic response"


def test_chat_waits_for_tts_and_returns_reply_and_audio_together(monkeypatch):
    sequence = []

    class FakeGroq:
        def __init__(self, **kwargs):
            self.chat = type("Chat", (), {})()
            self.chat.completions = type("Completions", (), {})()
            self.chat.completions.create = self.create

        async def create(self, **kwargs):
            sequence.append("groq")
            return type("Result", (), {"choices": [type("Choice", (), {"message": type("Message", (), {"content": "Synthetic cautious reply."})()})]})()

        async def close(self):
            return None

    async def fake_tts(text, language):
        sequence.append(("tts", text, language))
        return b"synthetic wav bytes"

    monkeypatch.setenv("GROQ_API_KEY", "synthetic-test-key")
    monkeypatch.setattr(api_main, "AsyncGroq", FakeGroq)
    monkeypatch.setattr(api_main, "generate_tts_audio", fake_tts)
    result = asyncio.run(api_main.chat(api_main.ChatRequest(language="kn", message="I have a headache")))
    assert sequence == ["groq", ("tts", "Synthetic cautious reply.", "kn")]
    assert result["reply"] == "Synthetic cautious reply."
    assert result["voice_status"] == "ready"
    assert result["audio_base64"] == base64.b64encode(b"synthetic wav bytes").decode("ascii")


def test_chat_holds_text_for_tts_only_retry_if_speech_fails(monkeypatch):
    class FakeGroq:
        def __init__(self, **kwargs):
            self.chat = type("Chat", (), {})()
            self.chat.completions = type("Completions", (), {})()
            self.chat.completions.create = self.create

        async def create(self, **kwargs):
            return type("Result", (), {"choices": [type("Choice", (), {"message": type("Message", (), {"content": "Private text until user chooses."})()})]})()

        async def close(self):
            return None

    async def failed_tts(text, language):
        raise HTTPException(status_code=502, detail="Synthetic TTS failure")

    monkeypatch.setenv("GROQ_API_KEY", "synthetic-test-key")
    monkeypatch.setattr(api_main, "AsyncGroq", FakeGroq)
    monkeypatch.setattr(api_main, "generate_tts_audio", failed_tts)
    result = asyncio.run(api_main.chat(api_main.ChatRequest(language="en", message="Synthetic question")))
    assert result["reply"] == "Private text until user chooses."
    assert result["voice_status"] == "failed"
    assert result["audio_base64"] is None


def test_existing_gnani_stt_route_sends_audio_and_returns_transcript(monkeypatch):
    from fastapi import UploadFile

    captured = {}

    class FakeResponse:
        status_code = 200

        def raise_for_status(self):
            return None

        def json(self):
            return {"success": True, "transcript": "synthetic voice question", "detected_language_code": "en-IN"}

    class FakeClient:
        async def __aenter__(self):
            return self

        async def __aexit__(self, *args):
            return None

        async def post(self, url, **kwargs):
            captured.update(url=url, **kwargs)
            return FakeResponse()

    monkeypatch.setenv("GNANI_API_KEY", "synthetic-test-key")
    monkeypatch.setattr(api_main.httpx, "AsyncClient", lambda **kwargs: FakeClient())
    upload = UploadFile(filename="question.wav", file=io.BytesIO(b"synthetic audio bytes"))
    result = asyncio.run(api_main.speech_to_text(upload, "en"))
    assert result["transcript"] == "synthetic voice question"
    assert captured["url"].endswith("/stt/v3")
    assert captured["headers"]["X-API-Key-ID"] == "synthetic-test-key"
    assert captured["data"]["language_code"] == "en-IN"
