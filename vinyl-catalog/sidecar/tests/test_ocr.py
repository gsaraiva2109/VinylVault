"""Tests for ocr.py extract_text function."""

from unittest.mock import patch, MagicMock

import pytest

# Import after conftest has inserted sidecar dir into sys.path
import ocr as ocr_module
from ocr import extract_text


# ---------------------------------------------------------------------------
# Helper to reset module-level _ocr singleton between tests so that our
# patched RapidOCR is actually used.
# ---------------------------------------------------------------------------

def reset_ocr_singleton():
    ocr_module._ocr = None


# ---------------------------------------------------------------------------
# Tests
# ---------------------------------------------------------------------------

class TestExtractText:
    def test_returns_empty_result_when_ocr_gives_no_result(self):
        """When RapidOCR returns an empty/falsy result, return empty text with 0 confidence."""
        reset_ocr_singleton()
        mock_ocr_instance = MagicMock()
        mock_ocr_instance.return_value = (None, None)

        with patch("ocr.RapidOCR", return_value=mock_ocr_instance):
            result = extract_text(b"fakebytes")

        assert result == {"text": "", "confidence": 0.0}

    def test_returns_empty_when_all_confidences_are_none(self):
        """When result rows have None confidence, they are filtered out and we return empty."""
        reset_ocr_singleton()
        mock_ocr_instance = MagicMock()
        # result rows: [box, text, confidence] — confidence is None
        mock_ocr_instance.return_value = (
            [
                ([0, 0, 10, 10], "hello", None),
                ([0, 0, 10, 10], "world", None),
            ],
            None,
        )

        with patch("ocr.RapidOCR", return_value=mock_ocr_instance):
            result = extract_text(b"fakebytes")

        assert result == {"text": "", "confidence": 0.0}

    def test_correctly_combines_text_and_averages_confidence(self):
        """Multiple OCR rows should be joined with spaces and confidence averaged."""
        reset_ocr_singleton()
        mock_ocr_instance = MagicMock()
        mock_ocr_instance.return_value = (
            [
                ([0, 0, 10, 10], "Dark Side", 0.9),
                ([0, 10, 10, 20], "of the Moon", 0.8),
            ],
            None,
        )

        with patch("ocr.RapidOCR", return_value=mock_ocr_instance):
            result = extract_text(b"fakebytes")

        assert result["text"] == "Dark Side of the Moon"
        assert abs(result["confidence"] - 0.85) < 1e-6

    def test_handles_exception_and_returns_empty_result(self):
        """If RapidOCR raises an exception, extract_text catches it and returns safe defaults."""
        reset_ocr_singleton()
        mock_ocr_instance = MagicMock()
        mock_ocr_instance.side_effect = RuntimeError("ONNX model failed to load")

        with patch("ocr.RapidOCR", return_value=mock_ocr_instance):
            result = extract_text(b"fakebytes")

        assert result == {"text": "", "confidence": 0.0}
