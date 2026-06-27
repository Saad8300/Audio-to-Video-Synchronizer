"""
transcription_helpers.py
Backend local Whisper transcription engine for SyncFrame Studio.
Uses faster-whisper for efficient CPU/GPU transcription.
No cloud APIs. Audio stays local.
"""

import logging
import os
import tempfile
from pathlib import Path
from typing import Callable, List, Optional

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Model cache — reuse loaded models across requests
# ---------------------------------------------------------------------------

_model_cache: dict = {}

# ---------------------------------------------------------------------------
# Segment helpers
# ---------------------------------------------------------------------------

def seconds_to_ts(s: float) -> str:
    """Convert seconds to M:SS format. e.g. 65.3 → '1:05'"""
    total = max(0, int(s))
    m, sec = divmod(total, 60)
    return f"{m}:{sec:02d}"


def seconds_to_srt(s: float) -> str:
    """Convert seconds to SRT HH:MM:SS,mmm format."""
    total_ms = int(round(s * 1000))
    ms = total_ms % 1000
    total_s = total_ms // 1000
    h, rem = divmod(total_s, 3600)
    m, sec = divmod(rem, 60)
    return f"{h:02d}:{m:02d}:{sec:02d},{ms:03d}"


# ---------------------------------------------------------------------------
# Formatter functions
# ---------------------------------------------------------------------------

def format_simple(segments: list) -> str:
    """[0:00] Text here"""
    return "\n".join(f"[{seconds_to_ts(s['start'])}] {s['text'].strip()}" for s in segments)


def format_detailed(segments: list) -> str:
    """[0:00 - 0:04] Text here"""
    return "\n".join(
        f"[{seconds_to_ts(s['start'])} - {seconds_to_ts(s['end'])}] {s['text'].strip()}"
        for s in segments
    )


def format_scene_plan(segments: list) -> str:
    """Scene 1\nTime: 0:00 - 0:04\nLine: Text here"""
    parts = []
    for i, s in enumerate(segments, 1):
        parts.append(
            f"Scene {i}\nTime: {seconds_to_ts(s['start'])} - {seconds_to_ts(s['end'])}\nLine: {s['text'].strip()}"
        )
    return "\n\n".join(parts)


def format_srt(segments: list) -> str:
    """Standard SRT subtitle format."""
    parts = []
    for i, s in enumerate(segments, 1):
        parts.append(
            f"{i}\n{seconds_to_srt(s['start'])} --> {seconds_to_srt(s['end'])}\n{s['text'].strip()}"
        )
    return "\n\n".join(parts)


def format_timeline_csv(segments: list) -> str:
    """start,end,text — compatible with SyncFrame Image/Media Timeline."""
    rows = ['start,end,text']
    for s in segments:
        safe = s['text'].strip().replace('"', '""')
        rows.append(f'{s["start"]:.2f},{s["end"]:.2f},"{safe}"')
    return "\n".join(rows)


def format_output(segments: list, output_format: str) -> str:
    """Route to the correct formatter based on output_format string."""
    fmt = output_format.lower().strip()
    if fmt == "detailed":
        return format_detailed(segments)
    elif fmt == "scene":
        return format_scene_plan(segments)
    elif fmt == "srt":
        return format_srt(segments)
    elif fmt == "csv":
        return format_timeline_csv(segments)
    else:
        return format_simple(segments)


# ---------------------------------------------------------------------------
# Segmentation helpers — apply output_style + segmentation_intensity
# ---------------------------------------------------------------------------

def apply_segmentation(
    raw_segments: list,
    output_style: str = "standard",
    segmentation_intensity: str = "detailed",
) -> list:
    """
    Post-process raw Whisper segments based on output_style and segmentation_intensity.
    
    visual_beat: prefer short segments (split long ones)
    standard: keep natural sentences
    
    segmentation_intensity:
      normal     → minimal splitting, keep longer segments
      detailed   → moderate splitting on punctuation
      aggressive → split more aggressively
    """
    segments = list(raw_segments)

    if output_style == "visual_beat":
        # Split long segments at sentence breaks
        max_chars = {"normal": 120, "detailed": 80, "aggressive": 50}.get(
            segmentation_intensity, 80
        )
        segments = _split_long_segments(segments, max_chars)
    else:
        # Standard: only split extremely long segments
        max_chars = {"normal": 300, "detailed": 200, "aggressive": 120}.get(
            segmentation_intensity, 200
        )
        segments = _split_long_segments(segments, max_chars)

    return segments


def _split_long_segments(segments: list, max_chars: int) -> list:
    """Split segments whose text exceeds max_chars at punctuation boundaries."""
    result = []
    for seg in segments:
        text = seg["text"].strip()
        if len(text) <= max_chars:
            result.append(seg)
            continue
        # Try to split at sentence boundaries
        sub_segs = _split_at_punctuation(seg, max_chars)
        result.extend(sub_segs)
    return result


def _split_at_punctuation(seg: dict, max_chars: int) -> list:
    """Split a single segment at punctuation marks into sub-segments."""
    import re
    text = seg["text"].strip()
    duration = seg["end"] - seg["start"]
    
    # Split at sentence boundaries
    parts = re.split(r'(?<=[.!?])\s+', text)
    if len(parts) <= 1:
        # No sentence breaks — split on commas or just hard-truncate
        parts = re.split(r'(?<=,)\s+', text)
    if len(parts) <= 1:
        # Just return as-is
        return [seg]
    
    # Distribute time proportionally by character count
    total_chars = sum(len(p) for p in parts)
    result = []
    current_start = seg["start"]
    
    for part in parts:
        if not part.strip():
            continue
        part_duration = duration * (len(part) / max(total_chars, 1))
        part_end = min(current_start + part_duration, seg["end"])
        result.append({
            "start": current_start,
            "end": part_end,
            "text": part.strip(),
        })
        current_start = part_end
    
    return result if result else [seg]


# ---------------------------------------------------------------------------
# Core transcription function
# ---------------------------------------------------------------------------

def transcribe_audio_backend(
    audio_path: str,
    model_name: str = "base",
    language: Optional[str] = None,
    output_style: str = "standard",
    segmentation_intensity: str = "detailed",
    progress_callback: Optional[Callable[[str, int], None]] = None,
) -> dict:
    """
    Transcribe audio using faster-whisper (local, no cloud).
    
    Returns:
        {
            "segments": [{"start": float, "end": float, "text": str}, ...],
            "language": str,
            "duration": float,
            "model": str,
        }
    """
    def _progress(step: str, pct: int) -> None:
        if progress_callback:
            progress_callback(step, pct)
        logger.info(f"[Transcription] {step} ({pct}%)")

    _progress("Loading Whisper model", 5)

    try:
        from faster_whisper import WhisperModel
    except ImportError:
        raise RuntimeError(
            "faster-whisper is not installed. "
            "Run: pip install faster-whisper"
        )

    # Validate model name
    valid_models = {"tiny", "base", "small", "medium", "large-v2", "large-v3"}
    if model_name not in valid_models:
        model_name = "base"

    # Load or reuse cached model
    cache_key = model_name
    if cache_key not in _model_cache:
        _progress(f"Downloading/loading Whisper {model_name} model…", 10)
        try:
            _model_cache[cache_key] = WhisperModel(
                model_name,
                device="cpu",
                compute_type="int8",    # efficient on CPU
            )
            logger.info(f"Whisper model '{model_name}' loaded and cached.")
        except Exception as e:
            logger.exception(f"Failed to load Whisper model '{model_name}'")
            raise RuntimeError(f"Whisper model failed to load: {e}") from e
    else:
        _progress(f"Whisper {model_name} model ready", 10)

    model = _model_cache[cache_key]

    _progress("Transcribing audio…", 20)

    # Transcribe
    transcribe_kwargs: dict = {
        "beam_size": 5,
        "vad_filter": True,          # voice activity detection — skips silence
        "vad_parameters": {"min_silence_duration_ms": 500},
    }
    if language and language != "auto":
        transcribe_kwargs["language"] = language

    try:
        segments_iter, info = model.transcribe(audio_path, **transcribe_kwargs)
    except Exception as e:
        logger.exception(f"Transcription failed for {audio_path}")
        raise RuntimeError(f"Transcription failed: {e}") from e

    _progress("Processing segments…", 60)

    raw_segments = []
    for seg in segments_iter:
        raw_segments.append({
            "start": float(seg.start),
            "end": float(seg.end),
            "text": seg.text.strip(),
        })

    _progress("Applying segmentation settings…", 80)
    
    segments = apply_segmentation(raw_segments, output_style, segmentation_intensity)

    duration = float(info.duration) if hasattr(info, "duration") else (
        segments[-1]["end"] if segments else 0.0
    )
    detected_language = info.language if hasattr(info, "language") else (language or "auto")

    _progress("Transcription complete", 95)

    return {
        "segments": segments,
        "language": detected_language,
        "duration": duration,
        "model": model_name,
        "segments_count": len(segments),
    }
