"""
LLM routing: Ollama (local) | OpenAI | Gemini | Hybrid.
Provider selection is driven by settings.json written by Electron.
API keys are forwarded per-request from Electron's OS keychain (via api_keys dict).
Env vars (OPENAI_API_KEY / GEMINI_API_KEY) are the fallback for standalone dev use.
"""

import base64
import io
import os
from typing import Optional


PROMPT = (
    "What vinyl record is in this image? "
    "Return ONLY in this exact format:\n"
    "Artist: [Artist Name]\n"
    "Album: [Album Name]"
)


def _image_to_b64(image_bytes: bytes) -> str:
    return base64.b64encode(image_bytes).decode("utf-8")


def _parse_response(text: str) -> dict:
    lines = text.strip().split("\n")
    artist, album = "", ""
    for line in lines:
        if line.lower().startswith("artist:"):
            artist = line.split(":", 1)[1].strip()
        elif line.lower().startswith("album:"):
            album = line.split(":", 1)[1].strip()
    return {"artist": artist, "album": album}


def _call_ollama(image_bytes: bytes, model: str) -> dict:
    import requests
    b64 = _image_to_b64(image_bytes)
    resp = requests.post(
        "http://localhost:11434/api/generate",
        json={"model": model, "prompt": PROMPT, "images": [b64], "stream": False},
        timeout=30,
    )
    resp.raise_for_status()
    return _parse_response(resp.json()["response"])


def _call_openai(image_bytes: bytes, model: str, api_key: Optional[str]) -> dict:
    from openai import OpenAI
    key = api_key or os.environ.get("OPENAI_API_KEY", "")
    client = OpenAI(api_key=key)
    b64 = _image_to_b64(image_bytes)
    resp = client.chat.completions.create(
        model=model,
        messages=[
            {
                "role": "user",
                "content": [
                    {"type": "text", "text": PROMPT},
                    {"type": "image_url", "image_url": {"url": f"data:image/jpeg;base64,{b64}"}},
                ],
            }
        ],
        max_tokens=200,
    )
    return _parse_response(resp.choices[0].message.content)


def _call_gemini(image_bytes: bytes, model: str, api_key: Optional[str]) -> dict:
    import google.generativeai as genai
    from PIL import Image as PILImage
    key = api_key or os.environ.get("GEMINI_API_KEY", "")
    genai.configure(api_key=key)
    m = genai.GenerativeModel(model)
    img = PILImage.open(io.BytesIO(image_bytes))
    resp = m.generate_content([PROMPT, img])
    return _parse_response(resp.text)


def route_to_llm(image_bytes: bytes, settings: dict, api_keys: Optional[dict] = None) -> dict:
    """
    Route image to the appropriate LLM based on settings.
    api_keys: { 'openai': str | None, 'gemini': str | None } — forwarded from Electron keychain.
    Returns: { artist: str, album: str, source: str }
    """
    keys = api_keys or {}
    provider = settings["llm"]["provider"]
    ollama_model = settings["llm"].get("ollamaModel") or "llava"
    cloud_provider = settings["llm"].get("cloudProvider", "openai")
    cloud_model = settings["llm"].get("cloudModel", "gpt-4o")

    def try_ollama():
        result = _call_ollama(image_bytes, ollama_model)
        return {**result, "source": "ollama"}

    def try_cloud():
        if cloud_provider == "gemini":
            result = _call_gemini(image_bytes, cloud_model, keys.get("gemini"))
            return {**result, "source": "gemini"}
        result = _call_openai(image_bytes, cloud_model, keys.get("openai"))
        return {**result, "source": "openai"}

    if provider == "local":
        return try_ollama()
    elif provider in ("openai", "gemini"):
        return try_cloud()
    elif provider == "hybrid":
        try:
            return try_ollama()
        except Exception as e:
            print(f"[llm] Ollama failed ({e}), falling back to cloud")
            return try_cloud()
    else:
        return {"artist": "", "album": "", "source": "unknown"}
