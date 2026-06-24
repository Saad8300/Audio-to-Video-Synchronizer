"""
utils.py - Utility functions for Audio Image Sync Studio
Handles CSV validation, time parsing, ZIP extraction, and image preprocessing.
"""

import os
import re
import zipfile
import shutil
from pathlib import Path
from typing import Any

import pandas as pd
import numpy as np
from PIL import Image, ImageFilter


# ---------------------------------------------------------------------------
# Time parsing helpers
# ---------------------------------------------------------------------------

def parse_time(time_str: str) -> float:
    """
    Parse various time formats into seconds (float).

    Supported formats:
        MM:SS           -> "00:02"
        MM:SS.mmm       -> "00:01.500"
        HH:MM:SS        -> "00:00:02"
        HH:MM:SS.mmm    -> "00:00:02.500"
    """
    time_str = str(time_str).strip()

    # HH:MM:SS or HH:MM:SS.mmm
    m = re.fullmatch(r"(\d+):(\d{2}):(\d{2})(?:\.(\d+))?", time_str)
    if m:
        h, mn, s = int(m.group(1)), int(m.group(2)), int(m.group(3))
        ms = float(f"0.{m.group(4)}") if m.group(4) else 0.0
        return h * 3600 + mn * 60 + s + ms

    # MM:SS or MM:SS.mmm
    m = re.fullmatch(r"(\d+):(\d{2})(?:\.(\d+))?", time_str)
    if m:
        mn, s = int(m.group(1)), int(m.group(2))
        ms = float(f"0.{m.group(3)}") if m.group(3) else 0.0
        return mn * 60 + s + ms

    raise ValueError(f"Cannot parse time string: '{time_str}'")


def seconds_to_mmss(seconds: float) -> str:
    """Format seconds as MM:SS.mmm"""
    m = int(seconds // 60)
    s = seconds - m * 60
    return f"{m:02d}:{s:06.3f}"


# ---------------------------------------------------------------------------
# CSV parsing & validation
# ---------------------------------------------------------------------------

def parse_and_validate_csv(csv_path: str) -> tuple[list[dict], list[str], list[str]]:
    """
    Load the timestamp CSV and return (rows, warnings, errors).

    Required columns: image, start, end
    Optional column:  text
    """
    warnings: list[str] = []
    errors: list[str] = []
    rows: list[dict] = []

    try:
        df = pd.read_csv(csv_path)
    except Exception as e:
        errors.append(f"Failed to read CSV: {e}")
        return rows, warnings, errors

    # Normalise column names
    df.columns = [c.strip().lower() for c in df.columns]

    required = {"image", "start", "end"}
    missing_cols = required - set(df.columns)
    if missing_cols:
        errors.append(f"CSV is missing required columns: {', '.join(missing_cols)}")
        return rows, warnings, errors

    if "text" not in df.columns:
        df["text"] = ""

    for idx, row in df.iterrows():
        row_num = idx + 2  # 1-indexed, row 1 = header
        image_name = str(row["image"]).strip()
        text = str(row.get("text", "")).strip()

        # Parse start time
        try:
            start_sec = parse_time(str(row["start"]))
        except ValueError as e:
            errors.append(f"Row {row_num}: invalid start time — {e}")
            continue

        # Parse end time
        try:
            end_sec = parse_time(str(row["end"]))
        except ValueError as e:
            errors.append(f"Row {row_num}: invalid end time — {e}")
            continue

        # Validate end > start
        if end_sec <= start_sec:
            errors.append(
                f"Row {row_num} ({image_name}): end time ({row['end']}) must be after start time ({row['start']})"
            )
            continue

        rows.append(
            {
                "image": image_name,
                "start": start_sec,
                "end": end_sec,
                "duration": round(end_sec - start_sec, 4),
                "text": text,
                "row_num": row_num,
            }
        )

    # Check for timeline gaps and overlaps (only on valid rows)
    rows_sorted = sorted(rows, key=lambda r: r["start"])
    for i in range(1, len(rows_sorted)):
        prev, curr = rows_sorted[i - 1], rows_sorted[i]
        gap = round(curr["start"] - prev["end"], 4)
        if gap > 0.01:
            warnings.append(
                f"Timeline gap of {gap:.3f}s between '{prev['image']}' (ends {seconds_to_mmss(prev['end'])}) "
                f"and '{curr['image']}' (starts {seconds_to_mmss(curr['start'])})"
            )
        elif gap < -0.01:
            warnings.append(
                f"Timeline overlap of {-gap:.3f}s between '{prev['image']}' (ends {seconds_to_mmss(prev['end'])}) "
                f"and '{curr['image']}' (starts {seconds_to_mmss(curr['start'])})"
            )

    return rows, warnings, errors


# ---------------------------------------------------------------------------
# ZIP extraction
# ---------------------------------------------------------------------------

def extract_zip_safely(zip_path: str, extract_to: str) -> tuple[set[str], list[str]]:
    """
    Extract an images ZIP to extract_to directory.
    Returns (set of extracted filenames, list of errors).
    """
    errors: list[str] = []
    extracted: set[str] = set()
    allowed_extensions = {".jpg", ".jpeg", ".png", ".webp"}

    try:
        with zipfile.ZipFile(zip_path, "r") as zf:
            for member in zf.namelist():
                # Security: skip paths with directory traversal
                member_path = Path(member)
                if member_path.is_absolute() or ".." in member_path.parts:
                    errors.append(f"Skipped unsafe ZIP entry: {member}")
                    continue

                ext = member_path.suffix.lower()
                if ext not in allowed_extensions:
                    # Skip directories and non-image files silently
                    continue

                # Flatten: use only the filename, not subdirectory structure
                filename = member_path.name
                dest = os.path.join(extract_to, filename)
                with zf.open(member) as src, open(dest, "wb") as dst:
                    shutil.copyfileobj(src, dst)
                extracted.add(filename)
    except zipfile.BadZipFile:
        errors.append("The uploaded file is not a valid ZIP archive.")
    except Exception as e:
        errors.append(f"ZIP extraction failed: {e}")

    return extracted, errors


# ---------------------------------------------------------------------------
# Image preprocessing
# ---------------------------------------------------------------------------

# Format -> (width, height)
FORMAT_DIMENSIONS: dict[str, tuple[int, int]] = {
    "9:16": (1080, 1920),
    "16:9": (1920, 1080),
    "1:1": (1080, 1080),
}


def preprocess_image(
    image_path: str,
    output_path: str,
    video_format: str = "16:9",
    fit_mode: str = "cover",
) -> None:
    """
    Resize/crop an image to match the target video dimensions.

    fit_mode='cover'   -> fill canvas, crop center
    fit_mode='contain' -> fit inside canvas with blurred background
    """
    dimensions = FORMAT_DIMENSIONS.get(video_format, (1920, 1080))
    target_w, target_h = dimensions

    img = Image.open(image_path).convert("RGB")
    src_w, src_h = img.size

    if fit_mode == "cover":
        # Scale up so the shortest dimension fills the canvas, then center-crop
        scale = max(target_w / src_w, target_h / src_h)
        new_w = int(src_w * scale)
        new_h = int(src_h * scale)
        img = img.resize((new_w, new_h), Image.LANCZOS)
        left = (new_w - target_w) // 2
        top = (new_h - target_h) // 2
        img = img.crop((left, top, left + target_w, top + target_h))

    elif fit_mode == "contain":
        # Scale so the longest dimension fits, centre on blurred background
        scale = min(target_w / src_w, target_h / src_h)
        new_w = int(src_w * scale)
        new_h = int(src_h * scale)

        # Blurred background: scale & crop cover-style, then heavy blur
        bg_scale = max(target_w / src_w, target_h / src_h)
        bg_w = int(src_w * bg_scale)
        bg_h = int(src_h * bg_scale)
        bg = img.resize((bg_w, bg_h), Image.LANCZOS)
        l_bg = (bg_w - target_w) // 2
        t_bg = (bg_h - target_h) // 2
        bg = bg.crop((l_bg, t_bg, l_bg + target_w, t_bg + target_h))
        bg = bg.filter(ImageFilter.GaussianBlur(radius=30))

        # Dim background slightly for depth
        bg_arr = np.array(bg, dtype=np.float32)
        bg_arr *= 0.5
        bg = Image.fromarray(bg_arr.astype(np.uint8))

        # Paste sharp foreground centred
        fg = img.resize((new_w, new_h), Image.LANCZOS)
        x = (target_w - new_w) // 2
        y = (target_h - new_h) // 2
        bg.paste(fg, (x, y))
        img = bg

    else:
        img = img.resize((target_w, target_h), Image.LANCZOS)

    img.save(output_path, "JPEG", quality=95)
