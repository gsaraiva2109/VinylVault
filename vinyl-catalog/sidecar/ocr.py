"""
OCR pipeline using EasyOCR.
No camera access — operates on raw image bytes received from Electron renderer.
"""

import io
import numpy as np
from PIL import Image

# Lazy-load reader to avoid slow startup on import
_reader = None


def _get_reader():
    global _reader
    if _reader is None:
        import easyocr
        # gpu=True: uses CUDA if available, silently falls back to CPU
        _reader = easyocr.Reader(["en"], gpu=True, verbose=False)
    return _reader


def extract_text(image_bytes: bytes) -> dict:
    """
    Extract text from image bytes.
    Returns: { text: str, confidence: float }
    """
    try:
        img = Image.open(io.BytesIO(image_bytes)).convert("RGB")
        reader = _get_reader()
        results = reader.readtext(np.array(img))

        if not results:
            return {"text": "", "confidence": 0.0}

        # results: [(bbox, text, confidence), ...]
        text = " ".join(r[1] for r in results)
        confidence = sum(r[2] for r in results) / len(results)
        return {"text": text.strip(), "confidence": confidence}
    except Exception as e:
        print(f"[ocr] error: {e}")
        return {"text": "", "confidence": 0.0}
