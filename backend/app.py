from __future__ import annotations

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from pathlib import Path
from typing import Any, Dict
from gtts import gTTS
import hashlib
import time

from model import analyze_text


ROOT_DIR = Path(__file__).resolve().parent
AUDIO_DIR = ROOT_DIR / "audio"
AUDIO_DIR.mkdir(exist_ok=True)


class AnalyzeRequest(BaseModel):
    text: str


class AnalyzeResponse(BaseModel):
    dialogue: str
    audio_url: str
    score: float
    category: str
    matched_keywords: Dict[str, list]
    metrics: Dict[str, object]


app = FastAPI(title="Kurakkum Patti Kadikkilla API", version="0.1.0")

# CORS: allow overlay from any site
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Serve generated audio files
app.mount("/audio", StaticFiles(directory=str(AUDIO_DIR)), name="audio")


def _generate_tts_file(text: str) -> str:
    """Generate Malayalam TTS mp3 for the given text and return filename."""
    # Hash includes text and timestamp for uniqueness
    unique_key = f"{text}-{time.time()}".encode("utf-8")
    filename = hashlib.sha1(unique_key).hexdigest() + ".mp3"
    filepath = AUDIO_DIR / filename

    tts = gTTS(text=text, lang="ml")
    tts.save(str(filepath))
    return filename


@app.post("/analyze", response_model=AnalyzeResponse)
async def analyze(request: Request, body: AnalyzeRequest) -> Any:
    """Analyze text, pick a dialogue, synthesize audio, and return the result."""
    result = analyze_text(body.text)

    # Generate audio
    audio_filename = _generate_tts_file(result.chosen_dialogue)

    # Build absolute URL for convenience in cross-origin usage
    base_url = str(request.base_url).rstrip("/")
    audio_url = f"{base_url}/audio/{audio_filename}"

    # Build metrics dict from model result (set in model.analyze_text)
    metrics: Dict[str, object] = getattr(result, "metrics", {})  # type: ignore[assignment]

    payload = AnalyzeResponse(
        dialogue=result.chosen_dialogue,
        audio_url=audio_url,
        score=result.score,
        category=result.category,
        matched_keywords=result.matched_keywords,
        metrics=metrics,
    )
    return JSONResponse(content=payload.model_dump())


@app.get("/health")
async def health() -> Dict[str, str]:
    return {"status": "ok"}


