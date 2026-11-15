from __future__ import annotations

import io
import os
from pathlib import Path

from fastapi import HTTPException
from PIL import Image, ImageEnhance, ImageOps

MAX_DOCUMENT_BYTES = 10 * 1024 * 1024
MAX_PDF_PAGES = 8
ALLOWED_EXTENSIONS = {".pdf", ".jpg", ".jpeg", ".png"}
OCR_LANGS = {"en": "eng", "kn": "kan+eng", "te": "tel+eng", "hi": "hin+eng"}


def language_pack_missing(language: str) -> bool:
    if language == "en":
        return False
    try:
        import pytesseract

        installed = set(pytesseract.get_languages(config=""))
        return not all(code in installed for code in OCR_LANGS.get(language, "eng").split("+"))
    except Exception:
        return True


def _ocr_image(image: Image.Image, language: str) -> str:
    import pytesseract

    configured_binary = os.getenv("TESSERACT_CMD", "").strip()
    if configured_binary:
        pytesseract.pytesseract.tesseract_cmd = configured_binary
    image = ImageOps.exif_transpose(image).convert("RGB")
    image.thumbnail((2400, 2400))
    try:
        orientation = pytesseract.image_to_osd(image, output_type=pytesseract.Output.DICT, timeout=10)
        rotation = int(orientation.get("rotate", 0))
        if rotation in {90, 180, 270}:
            image = image.rotate(-rotation, expand=True)
    except Exception:
        # OSD needs a language data pack and enough text. Normal OCR still runs if it is unavailable.
        pass
    image = ImageOps.autocontrast(image.convert("L"))
    image = ImageEnhance.Contrast(image).enhance(1.25)
    # Tesseract language packs are optional on the host. Gracefully fall back to English.
    installed = set(pytesseract.get_languages(config=""))
    requested = OCR_LANGS.get(language, "eng").split("+")
    trained = "+".join(code for code in requested if code in installed) or "eng"
    return pytesseract.image_to_string(image, lang=trained, timeout=25).strip()


def extract_document_text(data: bytes, filename: str, language: str) -> tuple[str, str]:
    extension = Path(filename).suffix.lower()
    if extension not in ALLOWED_EXTENSIONS:
        raise HTTPException(status_code=415, detail="Upload a PDF, JPG, JPEG, or PNG prescription.")
    if not data:
        raise HTTPException(status_code=400, detail="The uploaded file is empty.")
    if len(data) > MAX_DOCUMENT_BYTES:
        raise HTTPException(status_code=413, detail="The file is too large. Maximum size is 10 MB.")

    try:
        if extension == ".pdf":
            import fitz

            document = fitz.open(stream=data, filetype="pdf")
            if document.page_count > MAX_PDF_PAGES:
                raise HTTPException(status_code=413, detail=f"PDFs may contain at most {MAX_PDF_PAGES} pages.")
            pages: list[str] = []
            for page in document:
                text = page.get_text().strip()
                if len(text) < 25:
                    pixmap = page.get_pixmap(matrix=fitz.Matrix(2, 2), alpha=False)
                    text = _ocr_image(Image.open(io.BytesIO(pixmap.tobytes("png"))), language)
                pages.append(text)
            return "\n\n".join(pages).strip(), "pdf"

        image = Image.open(io.BytesIO(data))
        if image.width * image.height > 30_000_000:
            raise HTTPException(status_code=413, detail="Image dimensions are too large to process safely.")
        return _ocr_image(image, language), "image"
    except HTTPException:
        raise
    except Exception as exc:
        # Do not return parser/OCR internals or document content to the client.
        raise HTTPException(status_code=422, detail="The document could not be read. Try a clearer PDF or image.") from exc
