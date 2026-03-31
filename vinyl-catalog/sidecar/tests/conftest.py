import sys
import os
from unittest.mock import MagicMock

# Ensure the sidecar package directory is on the path so we can import main, ocr, llm
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

# Mock heavy ML dependencies that aren't available in the test environment.
# Must happen before any test module imports ocr.py (which has a top-level
# `from rapidocr_onnxruntime import RapidOCR` statement).
sys.modules.setdefault('rapidocr_onnxruntime', MagicMock())
