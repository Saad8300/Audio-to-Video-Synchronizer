"""
video_generator.py - Core video generation engine for Audio Image Sync Studio
Uses MoviePy 1.0.3 to assemble image clips, apply effects, and mux audio.
Batch 2: optional outro video and optional background music.
Batch 3: export resolution, render profiles, Pillow-based watermark.
Batch 9: new motion effects (zoom out, ken burns, pans, random, dynamic shorts).
"""

import os
import platform
import random
import time
import logging
import threading
from typing import Any, Callable, Optional

import numpy as np
from PIL import Image, ImageDraw, ImageFont

# ---------------------------------------------------------------------------
# Pillow compatibility shim — must come BEFORE MoviePy imports.
# ---------------------------------------------------------------------------
if not hasattr(Image, 'ANTIALIAS'):
    try:
        Image.ANTIALIAS = Image.Resampling.LANCZOS  # type: ignore[attr-defined]
    except AttributeError:
        try:
            Image.ANTIALIAS = Image.LANCZOS          # type: ignore[attr-defined]
        except AttributeError:
            Image.ANTIALIAS = Image.BICUBIC          # type: ignore[attr-defined]

# MoviePy 1.0.3 imports
from moviepy.editor import (
    ImageClip,
    VideoClip,
    VideoFileClip,
    AudioFileClip,
    CompositeVideoClip,
    CompositeAudioClip,
    concatenate_videoclips,
    concatenate_audioclips,
)
from moviepy.video.fx.all import fadein, fadeout
from moviepy.audio.fx.all import audio_fadein, audio_fadeout

from utils import (
    parse_and_validate_csv,
    extract_zip_safely,
    preprocess_image,
    get_resolution,
    seconds_to_mmss,
)

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Render profile constants
# ---------------------------------------------------------------------------

BASE_VIDEO_BITRATES: dict[str, int] = {
    "720p":  2500,
    "1080p": 5000,
    "2K":    10000,
    "4K":    20000,
}

RENDER_PROFILES: dict[str, dict] = {
    "fast_preview": {
        "fps":            24,
        "preset":         "ultrafast",
        "bitrate_factor": 0.55,
        "audio_bitrate":  "128k",
    },
    "balanced": {
        "fps":            30,
        "preset":         "medium",
        "bitrate_factor": 1.0,
        "audio_bitrate":  "192k",
    },
    "high_quality": {
        "fps":            30,
        "preset":         "slow",
        "bitrate_factor": 1.5,
        "audio_bitrate":  "256k",
    },
}


# ---------------------------------------------------------------------------
# Custom exception for clean cancellation
# ---------------------------------------------------------------------------

class GenerationCancelled(Exception):
    """Raised when a job cancel_event is set during generation."""
    pass


# ---------------------------------------------------------------------------
# Motion intensity multipliers
# ---------------------------------------------------------------------------

INTENSITY_FACTOR: dict[str, float] = {
    "low":    0.6,
    "medium": 1.0,
    "high":   1.5,
}


# ---------------------------------------------------------------------------
# Motion effect clip builders
# ---------------------------------------------------------------------------

def _load_image_padded(image_path: str, padded_w: int, padded_h: int) -> np.ndarray:
    """Load and resize image to padded dimensions. Returns (H, W, 3) ndarray."""
    img = Image.open(image_path).convert("RGB")
    img = img.resize((padded_w, padded_h), Image.LANCZOS)
    return np.array(img)


def make_zoom_in_clip(
    image_path: str, duration: float, target_w: int, target_h: int,
    intensity: str = "medium",
) -> VideoClip:
    """Slow zoom-in: start normal, end slightly zoomed. No black edges."""
    factor = 1.0 + 0.08 * INTENSITY_FACTOR.get(intensity, 1.0)
    padded_w = int(target_w * factor)
    padded_h = int(target_h * factor)
    img_array = _load_image_padded(image_path, padded_w, padded_h)

    def make_frame(t: float) -> np.ndarray:
        progress = min(t / max(duration, 0.001), 1.0)
        scale    = 1.0 + (factor - 1.0) * progress
        crop_w   = min(int(padded_w / scale), padded_w)
        crop_h   = min(int(padded_h / scale), padded_h)
        x0 = max((padded_w - crop_w) // 2, 0)
        y0 = max((padded_h - crop_h) // 2, 0)
        cropped = img_array[y0:y0 + crop_h, x0:x0 + crop_w]
        return np.array(Image.fromarray(cropped).resize((target_w, target_h), Image.BILINEAR))

    return VideoClip(make_frame, duration=duration).set_fps(30)


def make_zoom_out_clip(
    image_path: str, duration: float, target_w: int, target_h: int,
    intensity: str = "medium",
) -> VideoClip:
    """Slow zoom-out: start zoomed in, gradually reveal full image. No black edges."""
    factor = 1.0 + 0.08 * INTENSITY_FACTOR.get(intensity, 1.0)
    padded_w = int(target_w * factor)
    padded_h = int(target_h * factor)
    img_array = _load_image_padded(image_path, padded_w, padded_h)

    def make_frame(t: float) -> np.ndarray:
        progress = min(t / max(duration, 0.001), 1.0)
        # Zoom starts at factor and reduces to 1.0
        scale    = factor - (factor - 1.0) * progress
        crop_w   = min(int(padded_w / scale), padded_w)
        crop_h   = min(int(padded_h / scale), padded_h)
        x0 = max((padded_w - crop_w) // 2, 0)
        y0 = max((padded_h - crop_h) // 2, 0)
        cropped = img_array[y0:y0 + crop_h, x0:x0 + crop_w]
        return np.array(Image.fromarray(cropped).resize((target_w, target_h), Image.BILINEAR))

    return VideoClip(make_frame, duration=duration).set_fps(30)


def make_ken_burns_clip(
    image_path: str, duration: float, target_w: int, target_h: int,
    intensity: str = "medium", seed: int = 0,
) -> VideoClip:
    """Ken Burns: smooth pan + zoom together, documentary style."""
    rng = random.Random(seed)
    factor = 1.0 + 0.10 * INTENSITY_FACTOR.get(intensity, 1.0)
    padded_w = int(target_w * factor)
    padded_h = int(target_h * factor)
    img_array = _load_image_padded(image_path, padded_w, padded_h)

    # Random start and end crop positions (top-left corners)
    max_x = padded_w - target_w
    max_y = padded_h - target_h
    start_x = rng.randint(0, max(max_x, 0))
    start_y = rng.randint(0, max(max_y, 0))
    # End slightly different from start
    end_x   = rng.randint(0, max(max_x, 0))
    end_y   = rng.randint(0, max(max_y, 0))

    def make_frame(t: float) -> np.ndarray:
        progress = min(t / max(duration, 0.001), 1.0)
        # Smooth easing
        eased = progress * progress * (3 - 2 * progress)
        # Interpolate crop position
        cx = int(start_x + (end_x - start_x) * eased)
        cy = int(start_y + (end_y - start_y) * eased)
        cx = max(0, min(cx, max_x))
        cy = max(0, min(cy, max_y))
        cropped = img_array[cy:cy + target_h, cx:cx + target_w]
        if cropped.shape[0] != target_h or cropped.shape[1] != target_w:
            cropped = np.array(Image.fromarray(cropped).resize((target_w, target_h), Image.BILINEAR))
        return cropped

    return VideoClip(make_frame, duration=duration).set_fps(30)


def _make_pan_clip(
    image_path: str, duration: float, target_w: int, target_h: int,
    direction: str, intensity: str = "medium",
) -> VideoClip:
    """
    Generic pan: moves image in the given direction.
    direction: 'left' | 'right' | 'up' | 'down'
    Pads image in pan axis to allow movement without black edges.
    """
    pad_factor = 1.0 + 0.15 * INTENSITY_FACTOR.get(intensity, 1.0)

    if direction in ("left", "right"):
        padded_w = int(target_w * pad_factor)
        padded_h = target_h
    else:  # up, down
        padded_w = target_w
        padded_h = int(target_h * pad_factor)

    img_array = _load_image_padded(image_path, padded_w, padded_h)
    max_x = max(padded_w - target_w, 0)
    max_y = max(padded_h - target_h, 0)

    def make_frame(t: float) -> np.ndarray:
        progress = min(t / max(duration, 0.001), 1.0)
        eased    = progress * progress * (3 - 2 * progress)

        if direction == "left":
            cx = int(eased * max_x)
            cy = 0
        elif direction == "right":
            cx = int((1.0 - eased) * max_x)
            cy = 0
        elif direction == "up":
            cx = 0
            cy = int(eased * max_y)
        else:  # down
            cx = 0
            cy = int((1.0 - eased) * max_y)

        cx = max(0, min(cx, max_x))
        cy = max(0, min(cy, max_y))
        cropped = img_array[cy:cy + target_h, cx:cx + target_w]
        if cropped.shape[0] != target_h or cropped.shape[1] != target_w:
            cropped = np.array(Image.fromarray(cropped).resize((target_w, target_h), Image.BILINEAR))
        return cropped

    return VideoClip(make_frame, duration=duration).set_fps(30)


def make_pan_left_clip(image_path, duration, target_w, target_h, intensity="medium"):
    return _make_pan_clip(image_path, duration, target_w, target_h, "left", intensity)

def make_pan_right_clip(image_path, duration, target_w, target_h, intensity="medium"):
    return _make_pan_clip(image_path, duration, target_w, target_h, "right", intensity)

def make_pan_up_clip(image_path, duration, target_w, target_h, intensity="medium"):
    return _make_pan_clip(image_path, duration, target_w, target_h, "up", intensity)

def make_pan_down_clip(image_path, duration, target_w, target_h, intensity="medium"):
    return _make_pan_clip(image_path, duration, target_w, target_h, "down", intensity)


def make_subtle_random_clip(
    image_path: str, duration: float, target_w: int, target_h: int,
    intensity: str = "medium", seed: int = 0,
) -> VideoClip:
    """
    Each clip gets a small random motion from a pool: zoom-in, zoom-out, or
    one of the four pans. Keeps images alive without feeling chaotic.
    """
    options = ["zoom_in", "zoom_out", "pan_left", "pan_right", "pan_up", "pan_down"]
    choice  = options[seed % len(options)]

    if choice == "zoom_in":
        return make_zoom_in_clip(image_path, duration, target_w, target_h, intensity)
    elif choice == "zoom_out":
        return make_zoom_out_clip(image_path, duration, target_w, target_h, intensity)
    elif choice == "pan_left":
        return make_pan_left_clip(image_path, duration, target_w, target_h, intensity)
    elif choice == "pan_right":
        return make_pan_right_clip(image_path, duration, target_w, target_h, intensity)
    elif choice == "pan_up":
        return make_pan_up_clip(image_path, duration, target_w, target_h, intensity)
    else:
        return make_pan_down_clip(image_path, duration, target_w, target_h, intensity)


def make_dynamic_shorts_clip(
    image_path: str, duration: float, target_w: int, target_h: int,
    intensity: str = "medium", seed: int = 0,
) -> VideoClip:
    """
    Slightly stronger motion for short-form vertical videos.
    Combines a gentle pan with a subtle zoom for energy.
    """
    # Increase intensity one step for shorts
    intensity_map = {"low": "medium", "medium": "high", "high": "high"}
    boosted = intensity_map.get(intensity, "high")

    # Alternate between ken burns and pan variants per clip
    if seed % 2 == 0:
        return make_ken_burns_clip(image_path, duration, target_w, target_h, boosted, seed)
    else:
        directions = ["left", "right", "up", "down"]
        direction  = directions[seed % len(directions)]
        return _make_pan_clip(image_path, duration, target_w, target_h, direction, boosted)


# ---------------------------------------------------------------------------
# Legacy zoom clip (Batch 3 compat — same as zoom_in, kept for clarity)
# ---------------------------------------------------------------------------

def make_zoom_clip(
    image_path: str,
    duration: float,
    target_w: int,
    target_h: int,
    zoom_factor: float = 1.08,
) -> VideoClip:
    """
    Create a VideoClip with a slow zoom-in effect (Ken Burns style).
    Kept for backward compatibility with Batch 3 zoom_effect='slow_zoom_in'.
    """
    padded_w = int(target_w * zoom_factor)
    padded_h = int(target_h * zoom_factor)
    img_array = _load_image_padded(image_path, padded_w, padded_h)

    def make_frame(t: float) -> np.ndarray:
        progress = min(t / max(duration, 0.001), 1.0)
        scale    = 1.0 + (zoom_factor - 1.0) * progress
        crop_w   = min(int(padded_w / scale), padded_w)
        crop_h   = min(int(padded_h / scale), padded_h)
        x0 = max((padded_w - crop_w) // 2, 0)
        y0 = max((padded_h - crop_h) // 2, 0)
        cropped  = img_array[y0:y0 + crop_h, x0:x0 + crop_w]
        return np.array(Image.fromarray(cropped).resize((target_w, target_h), Image.BILINEAR))

    return VideoClip(make_frame, duration=duration).set_fps(30)


# ---------------------------------------------------------------------------
# Watermark helpers (Pillow-based — no ImageMagick required)
# ---------------------------------------------------------------------------

def _load_watermark_font(font_size: int) -> Any:
    candidates: list[str] = []
    if platform.system() == "Darwin":
        candidates = [
            "/System/Library/Fonts/Helvetica.ttc",
            "/System/Library/Fonts/HelveticaNeue.ttc",
            "/System/Library/Fonts/SFNSText.ttf",
            "/System/Library/Fonts/SFNS.ttf",
            "/Library/Fonts/Arial.ttf",
        ]
    else:
        candidates = [
            "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
            "/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf",
            "/usr/share/fonts/opentype/noto/NotoSans-Regular.ttf",
            "/usr/share/fonts/truetype/freefont/FreeSans.ttf",
        ]
    for path in candidates:
        try:
            return ImageFont.truetype(path, font_size)
        except (IOError, OSError):
            pass
    return ImageFont.load_default()


def _make_watermark_overlay(
    target_w: int, target_h: int, text: str,
    position_mode: str = "preset", position: str = "bottom_right",
    x_pos: int = 50, y_pos: int = 50,
    opacity: float = 0.65, size: int = 20, margin: int = 36,
) -> Optional[np.ndarray]:
    text = text.strip()
    if not text:
        return None
    size_factor = max(0.01, size * 0.0011)
    font_size = max(14, int(target_h * size_factor))
    try:
        font = _load_watermark_font(font_size)
        overlay = Image.new("RGBA", (target_w, target_h), (0, 0, 0, 0))
        draw = ImageDraw.Draw(overlay)
        try:
            bbox = draw.textbbox((0, 0), text, font=font)
            text_w = bbox[2] - bbox[0]
            text_h = bbox[3] - bbox[1]
            text_offset_x = -bbox[0]
            text_offset_y = -bbox[1]
        except AttributeError:
            text_w, text_h = draw.textsize(text, font=font)  # type: ignore[attr-defined]
            text_offset_x = 0
            text_offset_y = 0
        pad_x = max(int(font_size * 0.55), 8)
        pad_y = max(int(font_size * 0.28), 4)
        pill_w = text_w + pad_x * 2
        pill_h = text_h + pad_y * 2
        margin = max(5, min(margin, min(target_w, target_h) // 4))
        if position_mode == "custom":
            x = x_pos
            y = y_pos
        else:
            pos = position.lower().replace("-", "_")
            if pos == "top_left":
                x, y = margin, margin
            elif pos == "top_right":
                x, y = target_w - pill_w - margin, margin
            elif pos == "bottom_left":
                x, y = margin, target_h - pill_h - margin
            elif pos == "center":
                x = (target_w - pill_w) // 2
                y = (target_h - pill_h) // 2
            else:
                x = target_w - pill_w - margin
                y = target_h - pill_h - margin
        x = max(0, min(x, target_w - pill_w))
        y = max(0, min(y, target_h - pill_h))
        bg_alpha  = int(opacity * 170)
        txt_alpha = int(opacity * 255)
        radius = pill_h // 2
        try:
            draw.rounded_rectangle([x, y, x + pill_w, y + pill_h], radius=radius, fill=(0, 0, 0, bg_alpha))
        except AttributeError:
            draw.rectangle([x, y, x + pill_w, y + pill_h], fill=(0, 0, 0, bg_alpha))
        tx = x + pad_x + text_offset_x
        ty = y + pad_y + text_offset_y
        draw.text((tx, ty), text, font=font, fill=(255, 255, 255, txt_alpha))
        return np.array(overlay)
    except Exception as exc:
        logger.warning("Watermark overlay render failed: %s", exc)
        return None


def _apply_wm_frame(frame: np.ndarray, overlay: np.ndarray) -> np.ndarray:
    alpha = overlay[:, :, 3:4].astype(np.float32) / 255.0
    rgb   = overlay[:, :, :3].astype(np.float32)
    out   = frame.astype(np.float32) * (1.0 - alpha) + rgb * alpha
    return np.clip(out, 0, 255).astype(np.uint8)


# ---------------------------------------------------------------------------
# Media video helper (intro / outro)
# ---------------------------------------------------------------------------

def _load_media_clip(media_path: str, target_w: int, target_h: int) -> VideoFileClip:
    clip = VideoFileClip(media_path, audio=True)
    src_w, src_h = clip.size
    scale   = max(target_w / src_w, target_h / src_h)
    new_w   = int(src_w * scale)
    new_h   = int(src_h * scale)
    resized = clip.resize((new_w, new_h))
    x_off   = (new_w - target_w) // 2
    y_off   = (new_h - target_h) // 2
    cropped = resized.crop(x1=x_off, y1=y_off, x2=x_off + target_w, y2=y_off + target_h)
    if cropped.fps is None or cropped.fps <= 0:
        cropped = cropped.set_fps(30)
    return cropped


# ---------------------------------------------------------------------------
# Background music helper
# ---------------------------------------------------------------------------

def _build_music_track(
    music_path: str, target_duration: float, volume: float, fade: bool,
) -> Optional[AudioFileClip]:
    music = AudioFileClip(music_path)
    if music.duration < target_duration:
        copies = int(target_duration / music.duration) + 2
        try:
            music = concatenate_audioclips([music] * copies)
        except Exception:
            pass
    if music.duration > target_duration:
        music = music.subclip(0, target_duration)
    music = music.volumex(float(volume))
    if fade:
        fade_dur = min(1.5, target_duration / 4)
        try:
            music = audio_fadein(music, fade_dur)
            music = audio_fadeout(music, fade_dur)
        except Exception:
            pass
    return music


# ---------------------------------------------------------------------------
# Dispatch: build one clip with the chosen motion effect
# ---------------------------------------------------------------------------

def _build_motion_clip(
    image_path: str,
    duration: float,
    target_w: int,
    target_h: int,
    motion_effect: str,
    motion_intensity: str,
    fps: int,
    clip_index: int,
) -> Any:
    """
    Returns a VideoClip (or ImageClip) for the given motion effect.
    All motion clips are pre-sized to (target_w, target_h) with no black edges.
    """
    if motion_effect == "slow_zoom_in":
        return make_zoom_in_clip(image_path, duration, target_w, target_h, motion_intensity)
    elif motion_effect == "slow_zoom_out":
        return make_zoom_out_clip(image_path, duration, target_w, target_h, motion_intensity)
    elif motion_effect == "ken_burns":
        return make_ken_burns_clip(image_path, duration, target_w, target_h, motion_intensity, seed=clip_index)
    elif motion_effect == "pan_left":
        return make_pan_left_clip(image_path, duration, target_w, target_h, motion_intensity)
    elif motion_effect == "pan_right":
        return make_pan_right_clip(image_path, duration, target_w, target_h, motion_intensity)
    elif motion_effect == "pan_up":
        return make_pan_up_clip(image_path, duration, target_w, target_h, motion_intensity)
    elif motion_effect == "pan_down":
        return make_pan_down_clip(image_path, duration, target_w, target_h, motion_intensity)
    elif motion_effect == "subtle_random":
        return make_subtle_random_clip(image_path, duration, target_w, target_h, motion_intensity, seed=clip_index)
    elif motion_effect == "dynamic_shorts":
        return make_dynamic_shorts_clip(image_path, duration, target_w, target_h, motion_intensity, seed=clip_index)
    else:
        # No motion — static ImageClip
        clip = ImageClip(image_path, duration=duration)
        return clip.set_fps(fps)


# ---------------------------------------------------------------------------
# Main generator
# ---------------------------------------------------------------------------

def generate_video(
    audio_path: str,
    zip_path: str,
    csv_path: str,
    output_path: str,
    temp_dir: str,
    # Core settings
    aspect_ratio: str = "9:16",
    export_resolution: str = "1080p",
    fit_mode: str = "cover",
    transition: str = "fade",
    transition_duration: float = 0.5,
    zoom_effect: str = "none",      # kept for backward compat
    render_profile: str = "balanced",
    # Batch 9A — motion & style
    motion_effect: str = "slow_zoom_in",
    motion_intensity: str = "medium",
    visual_effect: str = "none",
    effect_strength: str = "medium",
    # Watermark (Batch 3)
    enable_watermark: bool = False,
    watermark_text: str = "",
    watermark_position_mode: str = "preset",
    watermark_position: str = "bottom_right",
    watermark_x: int = 50,
    watermark_y: int = 50,
    watermark_opacity: float = 0.65,
    watermark_size: int = 20,
    watermark_margin: int = 36,
    # Batch 2/6 — optional features
    intro_path: Optional[str] = None,
    outro_path: Optional[str] = None,
    bg_music_path: Optional[str] = None,
    enable_bg_music: bool = False,
    music_volume: float = 0.12,
    music_fade: bool = True,
    # Cancellation + progress
    cancel_event: Optional[threading.Event] = None,
    progress_callback: Optional[Callable[[int, str], None]] = None,
) -> dict[str, Any]:
    """
    Main entry-point for video generation.
    Returns dict: success, timeline, warnings, errors, cancelled.
    """
    warnings: list[str] = []
    errors:   list[str] = []
    timeline: list[dict] = []

    # ── Resolve resolution & render profile ──────────────────────────────────
    target_w, target_h = get_resolution(aspect_ratio, export_resolution)
    profile       = RENDER_PROFILES.get(render_profile, RENDER_PROFILES["balanced"])
    fps           = profile["fps"]
    preset        = profile["preset"]
    base_kbps     = BASE_VIDEO_BITRATES.get(export_resolution, 5000)
    video_bitrate = f"{int(base_kbps * profile['bitrate_factor'])}k"
    audio_bitrate = profile["audio_bitrate"]

    # ── Clamp optional numeric params ────────────────────────────────────────
    music_volume      = max(0.0, min(1.0, music_volume))
    watermark_opacity = max(0.0, min(1.0, watermark_opacity))
    watermark_margin  = max(5, min(watermark_margin, 200))
    transition_duration = max(0.1, min(float(transition_duration), 2.0))

    # ── Effective motion effect ───────────────────────────────────────────────
    # motion_effect takes priority; zoom_effect is kept for backward compat
    effective_motion = motion_effect
    if effective_motion == "none" and zoom_effect == "slow_zoom_in":
        effective_motion = "slow_zoom_in"

    # ── Feature flags ────────────────────────────────────────────────────────
    use_intro     = intro_path is not None and os.path.isfile(intro_path)
    use_outro     = outro_path is not None and os.path.isfile(outro_path)
    use_music     = enable_bg_music and bg_music_path is not None and os.path.isfile(bg_music_path)
    use_watermark = enable_watermark and bool(watermark_text.strip())
    use_motion    = effective_motion != "none"

    # ── Performance warnings ──────────────────────────────────────────────────
    is_heavy_motion = effective_motion in ("ken_burns", "dynamic_shorts", "subtle_random")
    if export_resolution == "4K" and render_profile == "high_quality" and is_heavy_motion:
        warnings.append(
            "4K + High Quality + heavy motion effect is a very demanding combination. "
            "This may take significantly longer on your computer. "
            "Consider using 720p Fast Preview to check timing first."
        )
    elif export_resolution in ("2K", "4K") and render_profile == "high_quality":
        warnings.append(
            f"{export_resolution} + High Quality render may take a while. "
            "Consider Balanced profile for faster results."
        )
    elif is_heavy_motion and export_resolution == "4K":
        warnings.append(
            "Motion effects with 4K resolution will increase render time. "
            "Use 720p Fast Preview for a quick timing check."
        )

    logger.info(
        f"Starting job. Res: {export_resolution}, Profile: {render_profile}, "
        f"Motion: {effective_motion} ({motion_intensity}), "
        f"Aspect: {aspect_ratio}, Watermark: {use_watermark}"
    )

    def _check_cancel():
        if cancel_event is not None and cancel_event.is_set():
            raise GenerationCancelled("Job was cancelled by user request.")

    def _progress(pct: int, step: str):
        if progress_callback is not None:
            try:
                progress_callback(pct, step)
            except Exception:
                pass

    _progress(5, "Preparing job")
    _check_cancel()

    # ------------------------------------------------------------------
    # 1. Extract images ZIP
    # ------------------------------------------------------------------
    _progress(10, "Extracting ZIP")
    images_dir = os.path.join(temp_dir, "images")
    os.makedirs(images_dir, exist_ok=True)
    extracted_files, zip_errors = extract_zip_safely(zip_path, images_dir)
    errors.extend(zip_errors)
    if zip_errors:
        return {"success": False, "timeline": [], "warnings": warnings, "errors": errors, "cancelled": False}
    _check_cancel()

    # ------------------------------------------------------------------
    # 2. Parse & validate CSV
    # ------------------------------------------------------------------
    _progress(20, "Reading CSV")
    rows, csv_warnings, csv_errors = parse_and_validate_csv(csv_path)
    warnings.extend(csv_warnings)
    errors.extend(csv_errors)
    if csv_errors:
        return {"success": False, "timeline": timeline, "warnings": warnings, "errors": errors, "cancelled": False}
    if not rows:
        errors.append("CSV contains no valid rows.")
        return {"success": False, "timeline": timeline, "warnings": warnings, "errors": errors, "cancelled": False}

    total_duration = rows[-1]["end"] if rows else 0
    logger.info(f"Timeline loaded: {len(rows)} rows, duration: {seconds_to_mmss(total_duration)}")
    _check_cancel()

    # ------------------------------------------------------------------
    # 3. Warn about unused images
    # ------------------------------------------------------------------
    _progress(30, "Validating images and timeline")
    used_images = {r["image"] for r in rows}
    unused = extracted_files - used_images
    if unused:
        warnings.append(
            f"The following images in the ZIP are not referenced in the CSV: {', '.join(sorted(unused))}"
        )
    _check_cancel()

    # ------------------------------------------------------------------
    # 4. Preprocess images and build clips
    # ------------------------------------------------------------------
    _progress(40, "Preparing clips")
    preprocessed_dir = os.path.join(temp_dir, "preprocessed")
    os.makedirs(preprocessed_dir, exist_ok=True)

    clips: list = []
    total_rows = len(rows)

    for idx, row in enumerate(rows):
        _check_cancel()

        img_name = row["image"]
        src_path = os.path.join(images_dir, img_name)

        if not os.path.isfile(src_path):
            errors.append(f"Image not found in ZIP: {img_name}")
            row["status"] = "missing"
            timeline.append(row)
            continue

        preprocessed_path = os.path.join(preprocessed_dir, f"pp_{img_name}.jpg")
        try:
            if not os.path.isfile(preprocessed_path):
                preprocess_image(src_path, preprocessed_path, target_w, target_h, fit_mode)
        except Exception as e:
            errors.append(f"Failed to preprocess {img_name}: {e}")
            row["status"] = "error"
            timeline.append(row)
            continue

        duration = row["duration"]

        try:
            if use_motion:
                clip = _build_motion_clip(
                    image_path=preprocessed_path,
                    duration=duration,
                    target_w=target_w,
                    target_h=target_h,
                    motion_effect=effective_motion,
                    motion_intensity=motion_intensity,
                    fps=fps,
                    clip_index=idx,
                )
            else:
                clip = ImageClip(preprocessed_path, duration=duration)
                clip = clip.set_fps(fps)

            if transition == "fade" and duration > (transition_duration * 2):
                fade_dur = min(transition_duration, duration / 4)
                clip = fadein(clip, fade_dur)
                clip = fadeout(clip, fade_dur)

            clips.append(clip)
            row["status"] = "ok"

        except Exception as e:
            errors.append(f"Failed to build clip for {img_name}: {e}")
            row["status"] = "error"

        timeline.append(row)
        clip_pct = 40 + int(12 * (idx + 1) / max(total_rows, 1))
        _progress(clip_pct, f"Preparing clips ({idx + 1}/{total_rows})")

    if not clips:
        errors.append("No valid image clips could be created.")
        return {"success": False, "timeline": timeline, "warnings": warnings, "errors": errors, "cancelled": False}

    _check_cancel()

    # ------------------------------------------------------------------
    # 5. Concatenate main image clips
    # ------------------------------------------------------------------
    _progress(55, "Building video timeline")
    try:
        # Use 'compose' when motion clips are present (VideoClip, not ImageClip)
        concat_method = "compose" if use_motion or transition == "fade" else "chain"
        video = concatenate_videoclips(clips, method=concat_method)
    except Exception as e:
        errors.append(f"Failed to concatenate clips: {e}")
        return {"success": False, "timeline": timeline, "warnings": warnings, "errors": errors, "cancelled": False}

    _check_cancel()

    # ------------------------------------------------------------------
    # 6. Attach main audio
    # ------------------------------------------------------------------
    _progress(65, "Mixing audio")
    main_audio = None
    try:
        main_audio = AudioFileClip(audio_path)
        video_duration = video.duration
        if main_audio.duration > video_duration:
            main_audio = main_audio.subclip(0, video_duration)
        else:
            warnings.append(
                f"Audio ({seconds_to_mmss(main_audio.duration)}) is shorter than video "
                f"({seconds_to_mmss(video_duration)}). Video will be silent after audio ends."
            )
    except Exception as e:
        warnings.append(f"Could not load main audio: {e}. Video will be generated without audio.")
        main_audio = None

    _check_cancel()

    # ------------------------------------------------------------------
    # 7. Background music (optional)
    # ------------------------------------------------------------------
    if use_music:
        _progress(72, "Processing background music")
        try:
            music_track = _build_music_track(
                music_path=bg_music_path,
                target_duration=video.duration,
                volume=music_volume,
                fade=music_fade,
            )
            if music_track is not None:
                if main_audio is not None:
                    composite_audio = CompositeAudioClip([main_audio, music_track])
                    composite_audio = composite_audio.set_duration(video.duration)
                    video = video.set_audio(composite_audio)
                else:
                    video = video.set_audio(music_track)
                main_audio = None
        except Exception as e:
            warnings.append(f"Background music could not be applied: {e}. Continuing without music.")
        _check_cancel()

    if main_audio is not None:
        video = video.set_audio(main_audio)
        main_audio = None

    _check_cancel()

    # ------------------------------------------------------------------
    # 8. Watermark (optional)
    # ------------------------------------------------------------------
    intro_clip = None
    outro_clip = None
    if use_watermark:
        _progress(78, "Applying watermark")
        wm_overlay = _make_watermark_overlay(
            target_w=target_w,
            target_h=target_h,
            text=watermark_text,
            position_mode=watermark_position_mode,
            position=watermark_position,
            x_pos=watermark_x,
            y_pos=watermark_y,
            opacity=watermark_opacity,
            size=watermark_size,
            margin=watermark_margin,
        )
        if wm_overlay is not None:
            _overlay = wm_overlay
            video = video.fl_image(lambda frame: _apply_wm_frame(frame, _overlay))
        else:
            warnings.append("Watermark could not be rendered. Continuing without watermark.")
        _check_cancel()

    # ------------------------------------------------------------------
    # 9. Append intro/outro videos (optional)
    # ------------------------------------------------------------------
    clips_to_concat = []

    if use_intro:
        _progress(80, "Adding intro video")
        try:
            intro_clip = _load_media_clip(intro_path, target_w, target_h)
            clips_to_concat.append(intro_clip)
        except GenerationCancelled:
            raise
        except Exception as e:
            errors.append(f"Failed to load intro video: {e}")
            if intro_clip is not None:
                try: intro_clip.close()
                except Exception: pass
            return {"success": False, "timeline": timeline, "warnings": warnings, "errors": errors, "cancelled": False}

    clips_to_concat.append(video)

    if use_outro:
        _progress(82, "Appending outro video")
        try:
            outro_clip = _load_media_clip(outro_path, target_w, target_h)
            clips_to_concat.append(outro_clip)
        except GenerationCancelled:
            raise
        except Exception as e:
            errors.append(f"Failed to load outro video: {e}")
            for c in [intro_clip, outro_clip]:
                if c is not None:
                    try: c.close()
                    except Exception: pass
            return {"success": False, "timeline": timeline, "warnings": warnings, "errors": errors, "cancelled": False}

    if len(clips_to_concat) > 1:
        _progress(85, "Concatenating videos")
        try:
            video = concatenate_videoclips(clips_to_concat, method="compose")
        except GenerationCancelled:
            raise
        except Exception as e:
            errors.append(f"Failed to concatenate videos: {e}")
            return {"success": False, "timeline": timeline, "warnings": warnings, "errors": errors, "cancelled": False}

    _check_cancel()

    # ------------------------------------------------------------------
    # 10. Write output MP4
    # ------------------------------------------------------------------
    _progress(88, "Encoding video")
    try:
        video.write_videofile(
            output_path,
            fps=fps,
            codec="libx264",
            audio_codec="aac",
            temp_audiofile=os.path.join(temp_dir, "temp_audio.m4a"),
            remove_temp=True,
            preset=preset,
            bitrate=video_bitrate,
            audio_bitrate=audio_bitrate,
            verbose=False,
            logger=None,
        )
    except Exception as e:
        logger.exception("Failed to write video file")
        errors.append(f"Failed to write video file: {e}")
        return {"success": False, "timeline": timeline, "warnings": warnings, "errors": errors, "cancelled": False}
    finally:
        logger.info("Closing MoviePy clips to free memory")
        try: video.close()
        except Exception: pass
        for c in clips:
            try: c.close()
            except Exception: pass
        if intro_clip is not None:
            try: intro_clip.close()
            except Exception: pass
        if outro_clip is not None:
            try: outro_clip.close()
            except Exception: pass

    _progress(95, "Finalizing output")
    _check_cancel()
    _progress(100, "Complete")

    logger.info("Video generation completed successfully")
    return {
        "success": True,
        "timeline": timeline,
        "warnings": warnings,
        "errors": errors,
        "cancelled": False,
    }
