"""
video_generator.py - Core video generation engine for Audio Image Sync Studio
Uses MoviePy 1.0.3 to assemble image clips, apply effects, and mux audio.
"""

import os
import time
import logging
from typing import Any

import numpy as np
from PIL import Image

# MoviePy 1.0.3 imports
from moviepy.editor import (
    ImageClip,
    VideoClip,
    AudioFileClip,
    CompositeVideoClip,
    concatenate_videoclips,
)
from moviepy.video.fx.all import fadein, fadeout

from utils import (
    parse_and_validate_csv,
    extract_zip_safely,
    preprocess_image,
    FORMAT_DIMENSIONS,
    seconds_to_mmss,
)

logger = logging.getLogger(__name__)

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
) -> dict[str, Any]:
    """
    Main entry-point for video generation.

    Returns a dict with:
        success       (bool)
        timeline      (list of row dicts enriched with status)
        warnings      (list of str)
        errors        (list of str)
    """
    warnings: list[str] = []
    errors: list[str] = []
    timeline: list[dict] = []

    target_w, target_h = FORMAT_DIMENSIONS.get(video_format, (1920, 1080))
    fps = 30

    # ------------------------------------------------------------------
    # 1. Extract images ZIP
    # ------------------------------------------------------------------
    images_dir = os.path.join(temp_dir, "images")
    os.makedirs(images_dir, exist_ok=True)

    extracted_files, zip_errors = extract_zip_safely(zip_path, images_dir)
    errors.extend(zip_errors)
    if zip_errors:
        return {"success": False, "timeline": [], "warnings": warnings, "errors": errors}

    # ------------------------------------------------------------------
    # 2. Parse & validate CSV
    # ------------------------------------------------------------------
    rows, csv_warnings, csv_errors = parse_and_validate_csv(csv_path)
    warnings.extend(csv_warnings)
    errors.extend(csv_errors)

    if csv_errors:
        return {"success": False, "timeline": timeline, "warnings": warnings, "errors": errors}

    if not rows:
        errors.append("CSV contains no valid rows.")
        return {"success": False, "timeline": timeline, "warnings": warnings, "errors": errors}

    # ------------------------------------------------------------------
    # 3. Warn about unused images in ZIP
    # ------------------------------------------------------------------
    used_images = {r["image"] for r in rows}
    unused = extracted_files - used_images
    if unused:
        warnings.append(
            f"The following images in the ZIP are not referenced in the CSV: {', '.join(sorted(unused))}"
        )

    # ------------------------------------------------------------------
    # 4. Preprocess images and build clips
    # ------------------------------------------------------------------
    preprocessed_dir = os.path.join(temp_dir, "preprocessed")
    os.makedirs(preprocessed_dir, exist_ok=True)

    clips: list = []

    for row in rows:
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

    if not clips:
        errors.append("No valid image clips could be created.")
        return {"success": False, "timeline": timeline, "warnings": warnings, "errors": errors}

    # ------------------------------------------------------------------
    # 5. Concatenate clips
    # ------------------------------------------------------------------
    try:
        # "compose" handles both VideoClip and ImageClip in the same sequence;
        # "chain" can break when mixing static ImageClips with VideoClips.
        concat_method = "compose" if zoom_effect == "slow_zoom_in" or transition == "fade" else "chain"
        video = concatenate_videoclips(clips, method=concat_method)
    except Exception as e:
        errors.append(f"Failed to concatenate clips: {e}")
        return {"success": False, "timeline": timeline, "warnings": warnings, "errors": errors}

    # ------------------------------------------------------------------
    # 6. Attach audio
    # ------------------------------------------------------------------
    try:
        audio = AudioFileClip(audio_path)

        # Trim or pad audio to match video length
        video_duration = video.duration
        if audio.duration > video_duration:
            audio = audio.subclip(0, video_duration)
        else:
            warnings.append(
                f"Audio ({seconds_to_mmss(audio.duration)}) is shorter than video "
                f"({seconds_to_mmss(video_duration)}). "
                "Video will be silent after audio ends."
            )

        video = video.set_audio(audio)
    except Exception as e:
        warnings.append(f"Could not attach audio: {e}. Video will be generated without audio.")

    # ------------------------------------------------------------------
    # 7. Write output MP4
    # ------------------------------------------------------------------
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
        return {"success": False, "timeline": timeline, "warnings": warnings, "errors": errors}
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

    return {
        "success": True,
        "timeline": timeline,
        "warnings": warnings,
        "errors": errors,
    }
