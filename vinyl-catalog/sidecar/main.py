"""
Vinyl Catalog — Python sidecar (FastAPI, localhost:8765)

This is a HEADLESS HTTP API. It does NOT access the camera.
Camera capture happens in the Electron renderer via getUserMedia.
Image bytes are sent here over HTTP for recognition.
"""

import json
import os
import subprocess
from pathlib import Path

from typing import Optional

from fastapi import FastAPI, Form, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware

from ocr import extract_text
from llm import route_to_llm

app = FastAPI(title="Vinyl Catalog Sidecar", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Electron passes SIDECAR_SETTINGS_PATH pointing to userData/settings.json (always writable).
# Fall back to a local file for standalone dev use.
_env_path = os.environ.get("SIDECAR_SETTINGS_PATH")
SETTINGS_PATH = Path(_env_path) if _env_path else Path(__file__).parent / "settings.json"

DEFAULT_SETTINGS = {
    "ocr": {"enabled": True, "threshold": 0.7},
    "llm": {
        "provider": "local",
        "ollamaModel": "",
        "cloudProvider": "openai",
        "cloudModel": "gpt-4o",
    },
}


def load_settings() -> dict:
    try:
        return json.loads(SETTINGS_PATH.read_text())
    except Exception:
        return DEFAULT_SETTINGS


@app.get("/health")
def health():
    return {"ok": True}


@app.post("/recognize")
async def recognize(
    image: UploadFile = File(...),
    openaiApiKey: Optional[str] = Form(None),
    geminiApiKey: Optional[str] = Form(None),
):
    image_bytes = await image.read()
    settings = load_settings()

    # Keys forwarded from Electron keychain take priority over env vars
    api_keys = {
        "openai": openaiApiKey,
        "gemini": geminiApiKey,
    }

    if settings["ocr"]["enabled"]:
        ocr_result = extract_text(image_bytes)
        if ocr_result["confidence"] >= settings["ocr"]["threshold"]:
            return {
                "artist": "",
                "album": ocr_result["text"],
                "confidence": ocr_result["confidence"],
                "source": "ocr",
            }

    llm_result = route_to_llm(image_bytes, settings, api_keys=api_keys)
    return {
        "artist": llm_result.get("artist", ""),
        "album": llm_result.get("album", ""),
        "confidence": 1.0,
        "source": llm_result.get("source", "unknown"),
    }


@app.get("/ollama/models")
def ollama_models():
    try:
        out = subprocess.check_output(["ollama", "list"], text=True, timeout=5)
        lines = out.strip().split("\n")[1:]  # skip header
        models = [line.split()[0] for line in lines if line.strip()]
        return {"models": models}
    except FileNotFoundError:
        return {"models": [], "error": "ollama not found"}
    except subprocess.TimeoutExpired:
        return {"models": [], "error": "ollama timeout"}
    except Exception as e:
        return {"models": [], "error": str(e)}
