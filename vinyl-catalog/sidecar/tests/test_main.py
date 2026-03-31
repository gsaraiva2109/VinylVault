"""Tests for main.py FastAPI application."""

import json
import io
import subprocess
from pathlib import Path
from unittest.mock import patch, MagicMock

import pytest
from fastapi.testclient import TestClient

from main import app, load_settings, DEFAULT_SETTINGS

client = TestClient(app)


# ---------------------------------------------------------------------------
# Health endpoint
# ---------------------------------------------------------------------------

class TestHealth:
    def test_health_returns_ok(self):
        response = client.get("/health")
        assert response.status_code == 200
        assert response.json() == {"ok": True}


# ---------------------------------------------------------------------------
# /recognize endpoint
# ---------------------------------------------------------------------------

class TestRecognize:
    def _make_image_upload(self, content: bytes = b"fakeimagebytes") -> dict:
        return {"image": ("test.jpg", io.BytesIO(content), "image/jpeg")}

    def test_returns_ocr_result_when_confidence_is_high(self):
        """When OCR confidence meets or exceeds threshold, skip LLM and return OCR result."""
        ocr_result = {"text": "Dark Side of the Moon Pink Floyd", "confidence": 0.95}

        with patch("main.extract_text", return_value=ocr_result) as mock_ocr, \
             patch("main.route_to_llm") as mock_llm, \
             patch("main.load_settings", return_value={
                 "ocr": {"enabled": True, "threshold": 0.7},
                 "llm": {"provider": "local", "ollamaModel": "", "cloudProvider": "openai", "cloudModel": "gpt-4o"},
             }):
            response = client.post("/recognize", files=self._make_image_upload())

        assert response.status_code == 200
        body = response.json()
        assert body["source"] == "ocr"
        assert body["album"] == "Dark Side of the Moon Pink Floyd"
        assert body["confidence"] == 0.95
        mock_llm.assert_not_called()

    def test_falls_back_to_llm_when_ocr_confidence_is_low(self):
        """When OCR confidence is below threshold, route to LLM."""
        ocr_result = {"text": "blurry text", "confidence": 0.3}
        llm_result = {"artist": "Pink Floyd", "album": "Wish You Were Here", "source": "ollama"}

        with patch("main.extract_text", return_value=ocr_result), \
             patch("main.route_to_llm", return_value=llm_result), \
             patch("main.load_settings", return_value={
                 "ocr": {"enabled": True, "threshold": 0.7},
                 "llm": {"provider": "local", "ollamaModel": "llava", "cloudProvider": "openai", "cloudModel": "gpt-4o"},
             }):
            response = client.post("/recognize", files=self._make_image_upload())

        assert response.status_code == 200
        body = response.json()
        assert body["source"] == "ollama"
        assert body["artist"] == "Pink Floyd"
        assert body["album"] == "Wish You Were Here"


# ---------------------------------------------------------------------------
# /ollama/models endpoint
# ---------------------------------------------------------------------------

class TestOllamaModels:
    def test_success_returns_models_list(self):
        """Successful ollama list returns parsed model names."""
        fake_output = "NAME\nllava:latest\nllama3:latest\n"
        with patch("subprocess.check_output", return_value=fake_output):
            response = client.get("/ollama/models")

        assert response.status_code == 200
        body = response.json()
        assert "models" in body
        assert "llava:latest" in body["models"]
        assert "llama3:latest" in body["models"]

    def test_ollama_not_found_returns_error(self):
        """FileNotFoundError means ollama binary is not installed."""
        with patch("subprocess.check_output", side_effect=FileNotFoundError):
            response = client.get("/ollama/models")

        assert response.status_code == 200
        body = response.json()
        assert body["models"] == []
        assert "not found" in body["error"].lower()

    def test_timeout_returns_error(self):
        """TimeoutExpired means ollama is unresponsive."""
        with patch("subprocess.check_output",
                   side_effect=subprocess.TimeoutExpired(cmd="ollama", timeout=5)):
            response = client.get("/ollama/models")

        assert response.status_code == 200
        body = response.json()
        assert body["models"] == []
        assert "timeout" in body["error"].lower()


# ---------------------------------------------------------------------------
# load_settings helper
# ---------------------------------------------------------------------------

class TestLoadSettings:
    def test_returns_default_settings_when_file_does_not_exist(self, tmp_path):
        """If the settings file is missing, DEFAULT_SETTINGS is returned."""
        non_existent = tmp_path / "does_not_exist.json"
        with patch("main.SETTINGS_PATH", non_existent):
            result = load_settings()

        assert result == DEFAULT_SETTINGS

    def test_returns_parsed_settings_when_file_exists(self, tmp_path):
        """When the file exists and is valid JSON, it is parsed and returned."""
        custom = {"ocr": {"enabled": False, "threshold": 0.5}, "llm": {}}
        settings_file = tmp_path / "settings.json"
        settings_file.write_text(json.dumps(custom))

        with patch("main.SETTINGS_PATH", settings_file):
            result = load_settings()

        assert result == custom
