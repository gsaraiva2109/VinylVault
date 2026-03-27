"""
OCR pipeline using RapidOCR (ONNX Runtime backend — no PyTorch).
Models are downloaded on first run to ~/.cache/rapidocr/ (~15 MB).
"""

from rapidocr_onnxruntime import RapidOCR

_ocr = None


def _get_ocr():
    global _ocr
    if _ocr is None:
        _ocr = RapidOCR()
    return _ocr


def extract_text(image_bytes: bytes) -> dict:
    """
    Extract text from image bytes.
    Returns: { text: str, confidence: float }
    """
    try:
        ocr = _get_ocr()
        result, _ = ocr(image_bytes)
        if not result:
            return {"text": "", "confidence": 0.0}

        # result is list of [box, text, confidence]
        texts = [(text, conf) for _, text, conf in result if conf is not None]
        if not texts:
            return {"text": "", "confidence": 0.0}

        all_text = " ".join(t for t, _ in texts)
        avg_conf = sum(c for _, c in texts) / len(texts)
        return {"text": all_text.strip(), "confidence": avg_conf}
    except Exception as e:
        print(f"[ocr] error: {e}")
        return {"text": "", "confidence": 0.0}
