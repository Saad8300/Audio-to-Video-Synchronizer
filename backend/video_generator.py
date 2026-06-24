"""
video_generator.py - Core video generation engine for Audio Image Sync Studio
Uses MoviePy 1.0.3 to assemble image clips, apply effects, and mux audio.
Batch 2: optional outro video and optional background music.
"""

import os
import time
import logging
import threading
from typing import Any, Callable, Optional

import numpy as np
from PIL import Image

# ---------------------------------------------------------------------------
# Pillow compatibility shim — must come BEFORE MoviePy imports.
#
# MoviePy 1.0.3 internally references PIL.Image.ANTIALIAS during video resize
# operations (e.g. VideoFileClip.resize).  Pillow ≥ 10.0.0 removed that
# attribute in favour of Image.Resampling.LANCZOS.  We patch it back so
# MoviePy never encounters the AttributeError.
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
    FORMAT_DIMENSIONS,
    seconds_to_mmss,
)

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Custom exception for clean cancellation
# ---------------------------------------------------------------------------

class GenerationCancelled(Exception):
    """Raised when a job cancel_event is set during generation."""
    pass


# ---------------------------------------------------------------------------
# Zoom effect helper
# ---------------------------------------------------------------------------

def make_zoom_clip(image_path: str, duration: float, target_w: int, target_h: int, zoom_factor: float = 1.08) -> VideoClip:
    """
    Create a VideoClip with a slow zoom-in effect (Ken Burns style).

    The image is pre-scaled slightly larger (zoom_factor) so the slow zoom
    never reveals canvas edges. We use VideoClip (not ImageClip) because
    MoviePy 1.0.3's ImageClip only accepts a static numpy array — passing
    a callable to it causes 'function object has no attribute shape'.

    zoom_factor: pre-scale multiplier (1.08 = 8% larger than target)
    """
    # Pre-scale the preprocessed image to zoom_factor × target size
    padded_w = int(target_w * zoom_factor)
    padded_h = int(target_h * zoom_factor)

    img = Image.open(image_path).convert("RGB")
    img_resized = img.resize((padded_w, padded_h), Image.LANCZOS)
    # Keep the full padded frame as a numpy array; per-frame crops are cheap
    img_array = np.array(img_resized)  # shape: (padded_h, padded_w, 3)

    def make_frame(t: float) -> np.ndarray:
        """Return a numpy frame (H, W, 3) for time t."""
        # Normalised progress 0→1 over the clip duration
        progress = t / max(duration, 0.001)
        progress = min(progress, 1.0)   # clamp to avoid off-by-epsilon

        # Scale factor goes from 1.0 (full padded size) to zoom_factor
        # As scale increases we crop a smaller window → simulates zoom-in
        scale = 1.0 + (zoom_factor - 1.0) * progress

        # Crop window size at this moment
        crop_w = int(padded_w / scale)
        crop_h = int(padded_h / scale)

        # Clamp to valid range (must never be larger than padded image)
        crop_w = min(crop_w, padded_w)
        crop_h = min(crop_h, padded_h)

        # Centre the crop inside the padded image
        x0 = max((padded_w - crop_w) // 2, 0)
        y0 = max((padded_h - crop_h) // 2, 0)
        x1 = x0 + crop_w
        y1 = y0 + crop_h

        cropped = img_array[y0:y1, x0:x1]  # numpy slice → (crop_h, crop_w, 3)

        # Resize the crop back to the exact target resolution
        pil_frame = Image.fromarray(cropped).resize((target_w, target_h), Image.BILINEAR)
        return np.array(pil_frame)  # (target_h, target_w, 3)  ← MoviePy expects this

    # VideoClip accepts a callable make_frame — this is the correct MoviePy 1.0.3 API
    # for time-varying content.  ImageClip is only for static numpy arrays.
    clip = VideoClip(make_frame, duration=duration)
    clip = clip.set_fps(30)
    return clip


# ---------------------------------------------------------------------------
# Outro video helper
# ---------------------------------------------------------------------------

def _load_outro_clip(outro_path: str, target_w: int, target_h: int) -> VideoFileClip:
    """
    Load and resize outro video to exactly (target_w, target_h).
    Uses cover/crop approach: resize to fill target, then centre-crop.
    Preserves outro's native audio if present.
    """
    clip = VideoFileClip(outro_path, audio=True)

    src_w, src_h = clip.size
    # Compute scale needed to fill target (cover approach)
    scale_x = target_w / src_w
    scale_y = target_h / src_h
    scale = max(scale_x, scale_y)

    new_w = int(src_w * scale)
    new_h = int(src_h * scale)

    # Resize
    resized = clip.resize((new_w, new_h))

    # Centre crop to exact target
    x_off = (new_w - target_w) // 2
    y_off = (new_h - target_h) // 2
    cropped = resized.crop(x1=x_off, y1=y_off, x2=x_off + target_w, y2=y_off + target_h)

    # Ensure fps is set
    if cropped.fps is None or cropped.fps <= 0:
        cropped = cropped.set_fps(30)

    return cropped


# ---------------------------------------------------------------------------
# Background music helper
# ---------------------------------------------------------------------------

def _build_music_track(
    music_path: str,
    target_duration: float,
    volume: float,
    fade: bool,
) -> Optional[AudioFileClip]:
    """
    Load, loop/trim, volume-adjust, and optionally fade background music.
    Returns an AudioFileClip ready to composite, or None on failure.
    """
    music = AudioFileClip(music_path)

    # Loop if music is shorter than video
    if music.duration < target_duration:
        # Build enough copies to cover the target duration
        copies_needed = int(target_duration / music.duration) + 2
        segments = [music] * copies_needed
        try:
            music = concatenate_audioclips(segments)
        except Exception:
            # Fallback: just repeat manually via subclip if concat fails
            pass

    # Trim to exact target duration
    if music.duration > target_duration:
        music = music.subclip(0, target_duration)

    # Apply volume
    music = music.volumex(float(volume))

    # Apply fade in/out
    if fade:
        fade_dur = min(1.5, target_duration / 4)
        try:
            music = audio_fadein(music, fade_dur)
            music = audio_fadeout(music, fade_dur)
        except Exception:
            pass  # Fade is nice-to-have; skip if it errors

    return music


# ---------------------------------------------------------------------------
# Main generator
# ---------------------------------------------------------------------------

def generate_video(
    audio_path: str,
    zip_path: str,
    csv_path: str,
    output_path: str,
    temp_dir: str,
    video_format: str = "16:9",
    fit_mode: str = "cover",
    transition: str = "none",
    zoom_effect: str = "none",
    # Batch 2 — optional features
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

    Returns a dict with:
        success       (bool)
        timeline      (list of row dicts enriched with status)
        warnings      (list of str)
        errors        (list of str)
        cancelled     (bool)

    cancel_event: a threading.Event; if set, generation is aborted at the next
                  safe checkpoint and GenerationCancelled is raised internally.
    progress_callback: callable(progress_pct: int, step_label: str) — called at
                       each major pipeline stage to report progress.
    outro_path: optional path to an outro video file (mp4/mov/webm).
    bg_music_path: optional path to background music (mp3/wav/m4a/aac).
    enable_bg_music: must be True (and bg_music_path present) for music to apply.
    music_volume: 0.0–1.0 (already normalised from frontend's 0–100 slider).
    music_fade: apply 1.5s fade-in and fade-out to the music track.
    """
    warnings: list[str] = []
    errors: list[str] = []
    timeline: list[dict] = []

    target_w, target_h = FORMAT_DIMENSIONS.get(video_format, (1920, 1080))
    fps = 30

    # Clamp volume to safe range
    music_volume = max(0.0, min(1.0, music_volume))

    # Decide if features are actually active
    use_outro = outro_path is not None and os.path.isfile(outro_path)
    use_music = (
        enable_bg_music
        and bg_music_path is not None
        and os.path.isfile(bg_music_path)
    )

    def _check_cancel():
        """Raise GenerationCancelled if the cancel_event has been set."""
        if cancel_event is not None and cancel_event.is_set():
            raise GenerationCancelled("Job was cancelled by user request.")

    def _progress(pct: int, step: str):
        """Fire the progress callback if supplied."""
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

    _check_cancel()

    # ------------------------------------------------------------------
    # 3. Warn about unused images in ZIP
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

        # Validate image exists
        if not os.path.isfile(src_path):
            errors.append(f"Image not found in ZIP: {img_name}")
            row["status"] = "missing"
            timeline.append(row)
            continue

        # Preprocess (resize / fit) to exact target resolution
        preprocessed_path = os.path.join(preprocessed_dir, f"pp_{img_name}.jpg")
        try:
            preprocess_image(src_path, preprocessed_path, video_format, fit_mode)
        except Exception as e:
            errors.append(f"Failed to preprocess {img_name}: {e}")
            row["status"] = "error"
            timeline.append(row)
            continue

        duration = row["duration"]

        # Build clip
        try:
            if zoom_effect == "slow_zoom_in":
                # VideoClip with per-frame callable (correct MoviePy 1.0.3 API)
                clip = make_zoom_clip(preprocessed_path, duration, target_w, target_h)
            else:
                # ImageClip with numpy array (correct API for static images)
                clip = ImageClip(preprocessed_path, duration=duration)
                clip = clip.set_fps(fps)

            # Apply fade transition
            if transition == "fade" and duration > 0.5:
                fade_dur = min(0.25, duration / 4)
                clip = fadein(clip, fade_dur)
                clip = fadeout(clip, fade_dur)

            clips.append(clip)
            row["status"] = "ok"

        except Exception as e:
            errors.append(f"Failed to build clip for {img_name}: {e}")
            row["status"] = "error"

        timeline.append(row)

        # Report per-clip progress between 40% and 52%
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
        # "compose" handles both VideoClip and ImageClip in the same sequence;
        # "chain" can break when mixing static ImageClips with VideoClips.
        concat_method = "compose" if zoom_effect == "slow_zoom_in" or transition == "fade" else "chain"
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

        # Trim or pad audio to match video length
        video_duration = video.duration
        if main_audio.duration > video_duration:
            main_audio = main_audio.subclip(0, video_duration)
        else:
            warnings.append(
                f"Audio ({seconds_to_mmss(main_audio.duration)}) is shorter than video "
                f"({seconds_to_mmss(video_duration)}). "
                "Video will be silent after audio ends."
            )
    except Exception as e:
        warnings.append(f"Could not load main audio: {e}. Video will be generated without audio.")
        main_audio = None

    _check_cancel()

    # ------------------------------------------------------------------
    # 7. Process background music (optional)
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
                    # Composite: voice at full vol + music at reduced vol
                    composite_audio = CompositeAudioClip([main_audio, music_track])
                    composite_audio = composite_audio.set_duration(video.duration)
                    video = video.set_audio(composite_audio)
                else:
                    # No main audio — play music on its own
                    video = video.set_audio(music_track)
                main_audio = None  # already set on video
        except Exception as e:
            warnings.append(f"Background music could not be applied: {e}. Continuing without music.")

        _check_cancel()
    else:
        # No music — just attach main audio directly
        if main_audio is not None:
            video = video.set_audio(main_audio)
            main_audio = None

    # If music was not used and main_audio still not attached:
    if main_audio is not None:
        video = video.set_audio(main_audio)
        main_audio = None

    _check_cancel()

    # ------------------------------------------------------------------
    # 8. Append outro video (optional)
    # ------------------------------------------------------------------
    outro_clip = None
    if use_outro:
        _progress(80, "Appending outro video")
        try:
            outro_clip = _load_outro_clip(outro_path, target_w, target_h)

            # Concatenate main video + outro
            # Use "compose" to handle mixed clip types safely
            video = concatenate_videoclips([video, outro_clip], method="compose")
        except GenerationCancelled:
            raise
        except Exception as e:
            errors.append(f"Failed to append outro video: {e}")
            # Clean up partial outro
            if outro_clip is not None:
                try:
                    outro_clip.close()
                except Exception:
                    pass
            return {"success": False, "timeline": timeline, "warnings": warnings, "errors": errors, "cancelled": False}

    _check_cancel()

    # ------------------------------------------------------------------
    # 9. Write output MP4
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
            preset="medium",
            bitrate="4000k",
            audio_bitrate="192k",
            verbose=False,
            logger=None,
        )
    except Exception as e:
        errors.append(f"Failed to write video file: {e}")
        return {"success": False, "timeline": timeline, "warnings": warnings, "errors": errors, "cancelled": False}
    finally:
        # Release MoviePy resources to avoid file-handle leaks
        try:
            video.close()
        except Exception:
            pass
        for c in clips:
            try:
                c.close()
            except Exception:
                pass
        if outro_clip is not None:
            try:
                outro_clip.close()
            except Exception:
                pass

    _progress(95, "Finalizing output")
    _check_cancel()
    _progress(100, "Complete")

    return {
        "success": True,
        "timeline": timeline,
        "warnings": warnings,
        "errors": errors,
        "cancelled": False,
    }
