from __future__ import annotations

from fastapi import APIRouter, File, Form, HTTPException, UploadFile

from app.ocr_service import MAX_DOCUMENT_BYTES, extract_document_text, language_pack_missing
from app.prescription_assistant import answer_prescription_question
from app.prescription_extractor import extract_prescription
from app.prescription_models import PrescriptionQuestion

router = APIRouter(prefix="/prescriptions", tags=["Prescription Intelligence"])


@router.post("/extract")
async def extract_uploaded_prescription(file: UploadFile = File(...), language: str = Form("en")):
    if language not in {"en", "kn", "te", "hi"}:
        raise HTTPException(status_code=422, detail="Choose English, Kannada, Telugu, or Hindi.")
    data = await file.read(MAX_DOCUMENT_BYTES + 1)
    text, source_kind = extract_document_text(data, file.filename or "upload", language)
    if not text:
        return {"prescription": {"medicines": [], "status": "needs_review"}, "source_kind": source_kind,
                "warning": "This computer is missing the selected language's Tesseract data pack; OCR fell back to English." if language_pack_missing(language) else None,
                "message": "No readable text was found. Please enter the details manually or try a clearer document."}
    prescription = await extract_prescription(text, language)
    return {"prescription": prescription.model_dump(), "source_kind": source_kind,
            "warning": "This computer is missing the selected language's Tesseract data pack; OCR fell back to English." if language_pack_missing(language) else None,
            "message": "Review every field against the original document. Do not rely on unclear extracted directions."}


@router.post("/ask")
async def ask_about_prescription(request: PrescriptionQuestion):
    return {"reply": await answer_prescription_question(request)}
