"""
video_timeline_generator.py
Generates a video from:
  - A main audio track
  - A ZIP of video clips
  - A timeline CSV (start, end, video)

Batch 10B implementation. Uses MoviePy 1.0.3 + standard library.
No new dependencies. Correctness > performance for this batch.
"""

import csv
import io
import os
import shutil
import threading
import logging
import zipfile
from pathlib import Path
from typing import Optional, Callable

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Resolution table (shared with image generator)
# ---------------------------------------------------------------------------

FORMAT_DIMENSIONS: dict[str, dict[str, tuple[int, int]]] = {
    "9:16":  {"720p": (720,  1280), "1080p": (1080, 1920), "2K": (1440, 2560), "4K": (2160, 3840)},
    "16:9": {"720p": (1280, 720),  "1080p": (1920, 1080), "2K": (2560, 1440), "4K": (3840, 2160)},
    "1:1":  {"720p": (720,  720),  "1080p": (1080, 1080), "2K": (1440, 1440), "4K": (2160, 2160)},
}

ALLOWED_VIDEO_EXTS = {".mp4", ".mov", ".webm"}

PROFILE_SETTINGS = {
    "fast_preview": {"fps": 24, "preset": "ultrafast", "crf": 28},
    "balanced":     {"fps": 30, "preset": "medium",    "crf": 23},
    "high_quality": {"fps": 30, "preset": "slow",      "crf": 18},
}


# ---------------------------------------------------------------------------
# Exceptions
# ---------------------------------------------------------------------------

class VideoTimelineCancelled(Exception):
    pass


class VideoTimelineError(Exception):
    pass


# ---------------------------------------------------------------------------
# ZIP extraction
# ---------------------------------------------------------------------------

def extract_videos_zip(
    zip_path: str,
    dest_dir: str,
) -> dict[str, str]:  # {filename_lower → abs_path}
    """
    Safely extract video files from a ZIP.
    Returns a mapping from lowercased original filename → absolute extracted path.
    """
    video_map: dict[str, str] = {}
    dest = Path(dest_dir)
    dest.mkdir(parents=True, exist_ok=True)

    with zipfile.ZipFile(zip_path, 'r') as zf:
        for member in zf.infolist():
            name = member.filename

            # Skip directories, Mac metadata, hidden files
            if member.is_dir():
                continue
            basename = Path(name).name
            if not basename or basename.startswith('.') or '__MACOSX' in name:
                continue

            ext = Path(basename).suffix.lower()
            if ext not in ALLOWED_VIDEO_EXTS:
                continue

            # Zip-slip protection: ensure extracted path stays inside dest_dir
            target_path = (dest / basename).resolve()
            if not str(target_path).startswith(str(dest.resolve())):
                logger.warning("Skipping potentially unsafe zip entry: %s", name)
                continue

            # If two files share a basename (from different subdirs), keep first
            if basename.lower() in video_map:
                continue

            with zf.open(member) as src, open(target_path, 'wb') as dst:
                shutil.copyfileobj(src, dst)

            video_map[basename.lower()] = str(target_path)
            logger.info("Extracted video: %s", basename)

    return video_map


# ---------------------------------------------------------------------------
# CSV parsing
# ---------------------------------------------------------------------------

def parse_timeline_csv(
    csv_path: str,
    video_map: dict[str, str],
) -> tuple[list[dict], list[str], list[str]]:  # rows, warnings, errors
    """
    Parse timeline CSV with columns: start, end, video.
    Returns (rows, warnings, errors).
    rows = [{start: float, end: float, video: str, video_path: str}, ...]
    """
    rows: list[dict] = []
    warnings: list[str] = []
    errors: list[str] = []

    with open(csv_path, newline='', encoding='utf-8-sig') as f:
        content = f.read()

    reader = csv.DictReader(io.StringIO(content))

    if reader.fieldnames is None:
        errors.append("CSV is empty or has no header row.")
        return rows, warnings, errors

    # Normalise column names
    fieldnames_lower = [fn.strip().lower() for fn in reader.fieldnames]
    required = {'start', 'end', 'video'}
    missing_cols = required - set(fieldnames_lower)
    if missing_cols:
        errors.append(f"CSV is missing required columns: {', '.join(sorted(missing_cols))}. Required: start, end, video")
        return rows, warnings, errors

    col_map = {fn.strip().lower(): fn for fn in (reader.fieldnames or [])}

    for i, raw_row in enumerate(reader, start=2):  # row 2 = first data row
        row_label = f"Row {i}"

        start_str = raw_row.get(col_map.get('start', 'start'), '').strip()
        end_str   = raw_row.get(col_map.get('end',   'end'),   '').strip()
        video_str = raw_row.get(col_map.get('video', 'video'), '').strip()

        if not start_str and not end_str and not video_str:
            continue  # skip blank rows

        # Validate numeric
        try:
            start_val = float(start_str)
        except ValueError:
            errors.append(f"{row_label}: 'start' must be a number, got '{start_str}'.")
            continue

        try:
            end_val = float(end_str)
        except ValueError:
            errors.append(f"{row_label}: 'end' must be a number, got '{end_str}'.")
            continue

        if end_val <= start_val:
            errors.append(f"{row_label}: 'end' ({end_val}) must be greater than 'start' ({start_val}).")
            continue

        if not video_str:
            errors.append(f"{row_label}: 'video' column is empty.")
            continue

        # Look up video in ZIP map (case-insensitive)
        video_path = video_map.get(video_str.lower())
        if video_path is None:
            errors.append(
                f"{row_label}: references '{video_str}', but it was not found in the videos ZIP. "
                f"Available: {', '.join(sorted(video_map.keys())) or 'none'}"
            )
            continue

        rows.append({
            'start':      start_val,
            'end':        end_val,
            'video':      video_str,
            'video_path': video_path,
        })

    if not rows and not errors:
        errors.append("CSV has no valid data rows.")
        return rows, warnings, errors

    if errors:
        return rows, warnings, errors

    # Sort by start time
    rows.sort(key=lambda r: r['start'])

    # Check for overlaps
    for i in range(1, len(rows)):
        prev = rows[i - 1]
        curr = rows[i]
        if curr['start'] < prev['end']:
            errors.append(
                f"Rows {i} and {i+1} overlap: row {i} ends at {prev['end']}s "
                f"but row {i+1} starts at {curr['start']}s."
            )

    # Check for gaps (warn, don't error)
    for i in range(1, len(rows)):
        prev = rows[i - 1]
        curr = rows[i]
        gap = curr['start'] - prev['end']
        if gap > 0.05:  # more than 50ms gap
            warnings.append(
                f"Gap of {gap:.2f}s between row {i} (ends {prev['end']}s) "
                f"and row {i+1} (starts {curr['start']}s). A black segment will be inserted."
            )

    return rows, warnings, errors


# ---------------------------------------------------------------------------
# Clip processing
# ---------------------------------------------------------------------------

def _build_segment_clip(video_path: str, segment_duration: float, fill_mode: str, target_w: int, target_h: int, fit_mode: str):
    """
    Load a video clip, resize it to target resolution, and fill the segment.
    Returns a MoviePy VideoClip of exactly segment_duration seconds.
    fill_mode: 'loop' | 'trim_only' | 'freeze'
    fit_mode:  'cover' | 'contain'
    """
    from moviepy.editor import VideoFileClip, concatenate_videoclips, ColorClip, ImageClip
    import numpy as np

    raw = VideoFileClip(video_path, audio=False)  # mute clip audio
    source_dur = raw.duration

    # ── Resize / fit ─────────────────────────────────────────────────────────
    src_w, src_h = raw.w, raw.h
    target_ratio = target_w / target_h
    src_ratio    = src_w   / src_h

    if fit_mode == 'contain':
        # Letterbox / pillarbox — scale down to fit
        if src_ratio > target_ratio:
            new_w = target_w
            new_h = int(target_w / src_ratio)
        else:
            new_h = target_h
            new_w = int(target_h * src_ratio)
        new_w = new_w - (new_w % 2)  # ensure even
        new_h = new_h - (new_h % 2)
        resized = raw.resize((new_w, new_h))
        # Pad to target size with black
        bg = ColorClip(size=(target_w, target_h), color=(0, 0, 0), duration=raw.duration)
        x_off = (target_w - new_w) // 2
        y_off = (target_h - new_h) // 2
        from moviepy.editor import CompositeVideoClip
        resized_pos = resized.set_position((x_off, y_off))
        fitted = CompositeVideoClip([bg, resized_pos], size=(target_w, target_h))
    else:
        # Cover / crop — scale up to fill, then crop
        if src_ratio > target_ratio:
            # Source is wider → fit by height, crop sides
            new_h = target_h
            new_w = int(target_h * src_ratio)
        else:
            # Source is taller → fit by width, crop top/bottom
            new_w = target_w
            new_h = int(target_w / src_ratio)
        new_w = new_w + (new_w % 2)  # ensure even (round up)
        new_h = new_h + (new_h % 2)
        resized = raw.resize((new_w, new_h))
        x_off = (new_w - target_w) // 2
        y_off = (new_h - target_h) // 2
        fitted = resized.crop(x1=x_off, y1=y_off, x2=x_off + target_w, y2=y_off + target_h)

    # ── Fill to segment_duration ──────────────────────────────────────────────
    if source_dur >= segment_duration:
        # Trim
        result = fitted.subclip(0, segment_duration)
    else:
        # Source is shorter than segment
        if fill_mode == 'loop':
            # Loop until we have enough, then trim
            parts = []
            accumulated = 0.0
            while accumulated < segment_duration:
                remaining = segment_duration - accumulated
                clip_dur = min(source_dur, remaining)
                parts.append(fitted.subclip(0, clip_dur))
                accumulated += clip_dur
            result = concatenate_videoclips(parts)
        elif fill_mode == 'freeze':
            # Play once, then freeze last frame
            play_part = fitted
            freeze_dur = segment_duration - source_dur
            last_frame = fitted.to_ImageClip(t=min(source_dur - 0.03, source_dur - 1/30))
            freeze_part = last_frame.set_duration(freeze_dur)
            result = concatenate_videoclips([play_part, freeze_part])
        else:  # trim_only — just use what's there, pad with black
            pad_dur = segment_duration - source_dur
            black = ColorClip(size=(target_w, target_h), color=(0, 0, 0), duration=pad_dur)
            result = concatenate_videoclips([fitted, black])

    # Ensure exact duration (floating point safety)
    result = result.set_duration(segment_duration)
    raw.close()
    return result


# ---------------------------------------------------------------------------
# Main generator
# ---------------------------------------------------------------------------

def generate_video_timeline(
    audio_path:    str,
    zip_path:      str,
    csv_path:      str,
    output_path:   str,
    temp_dir:      str,
    aspect_ratio:  str = "9:16",
    export_resolution: str = "1080p",
    fit_mode:      str = "cover",
    fill_mode:     str = "loop",   # loop | trim_only | freeze
    render_profile: str = "balanced",
    cancel_event:  Optional[threading.Event] = None,
    progress_callback: Optional[Callable[[int, str], None]] = None,
) -> dict:
    """
    Full Video Timeline generation pipeline.
    Returns:
        {
            'success': bool,
            'warnings': list[str],
            'errors': list[str],
            'timeline': list[dict],
            'cancelled': bool,
        }
    """
    warnings: list[str] = []
    errors:   list[str] = []
    timeline_out: list[dict] = []

    def report(pct: int, step: str):
        if progress_callback:
            progress_callback(pct, step)

    def check_cancel():
        if cancel_event and cancel_event.is_set():
            raise VideoTimelineCancelled()

    try:
        # ── Step 1: Extract ZIP ───────────────────────────────────────────────
        report(5, "Extracting video ZIP")
        check_cancel()

        videos_dir = os.path.join(temp_dir, "videos")
        try:
            video_map = extract_videos_zip(zip_path, videos_dir)
        except Exception as e:
            return {'success': False, 'warnings': warnings, 'errors': [f"Failed to extract videos ZIP: {e}"], 'timeline': [], 'cancelled': False}

        if not video_map:
            return {'success': False, 'warnings': warnings, 'errors': ["No valid video files found in the ZIP. Supported: .mp4, .mov, .webm"], 'timeline': [], 'cancelled': False}

        logger.info("Extracted %d video(s): %s", len(video_map), list(video_map.keys()))
        report(15, "Validating timeline CSV")
        check_cancel()

        # ── Step 2: Parse CSV ─────────────────────────────────────────────────
        try:
            rows, csv_warnings, csv_errors = parse_timeline_csv(csv_path, video_map)
        except Exception as e:
            return {'success': False, 'warnings': warnings, 'errors': [f"Failed to parse CSV: {e}"], 'timeline': [], 'cancelled': False}

        warnings.extend(csv_warnings)
        errors.extend(csv_errors)

        if errors:
            return {'success': False, 'warnings': warnings, 'errors': errors, 'timeline': [], 'cancelled': False}

        if not rows:
            return {'success': False, 'warnings': warnings, 'errors': ["No valid timeline rows found in CSV."], 'timeline': [], 'cancelled': False}

        logger.info("CSV parsed: %d rows, total span %.2fs", len(rows), rows[-1]['end'] - rows[0]['start'])

        # ── Step 3: Resolve output dimensions ────────────────────────────────
        dims = FORMAT_DIMENSIONS.get(aspect_ratio, FORMAT_DIMENSIONS["9:16"])
        target_w, target_h = dims.get(export_resolution, dims["1080p"])
        profile = PROFILE_SETTINGS.get(render_profile, PROFILE_SETTINGS["balanced"])
        fps = profile["fps"]

        logger.info("Target: %dx%d @ %dfps  profile=%s", target_w, target_h, fps, render_profile)

        # ── Step 4: Build video clips per row ─────────────────────────────────
        from moviepy.editor import concatenate_videoclips, ColorClip, AudioFileClip

        all_clips = []
        n = len(rows)

        for idx, row in enumerate(rows):
            check_cancel()
            pct = 20 + int((idx / n) * 45)
            report(pct, f"Preparing clip {idx + 1} of {n}")

            segment_dur = row['end'] - row['start']
            logger.info("Row %d: %s  %.2fs→%.2fs  (%.2fs)", idx + 1, row['video'], row['start'], row['end'], segment_dur)

            # Handle gaps (insert black)
            if idx > 0:
                prev_end = rows[idx - 1]['end']
                gap = row['start'] - prev_end
                if gap > 0.05:
                    black_clip = ColorClip(size=(target_w, target_h), color=(0, 0, 0), duration=gap)
                    black_clip = black_clip.set_fps(fps)
                    all_clips.append(black_clip)
                    logger.info("Inserted %.2fs black gap before row %d", gap, idx + 1)

            try:
                clip = _build_segment_clip(
                    video_path=row['video_path'],
                    segment_duration=segment_dur,
                    fill_mode=fill_mode,
                    target_w=target_w,
                    target_h=target_h,
                    fit_mode=fit_mode,
                )
                clip = clip.set_fps(fps)
                all_clips.append(clip)
            except Exception as e:
                logger.error("Failed to prepare clip for row %d (%s): %s", idx + 1, row['video'], e)
                errors.append(f"Row {idx + 1} ({row['video']}): failed to process clip — {e}")
                # Insert black as fallback so we don't abort the whole job
                black_clip = ColorClip(size=(target_w, target_h), color=(0, 0, 0), duration=segment_dur)
                black_clip = black_clip.set_fps(fps)
                all_clips.append(black_clip)

            # Add to timeline report
            timeline_out.append({
                'image':    row['video'],
                'start':    row['start'],
                'end':      row['end'],
                'duration': segment_dur,
                'text':     '',
                'status':   'error' if errors else 'ok',
            })

        check_cancel()
        report(65, "Building video timeline")

        # ── Step 5: Concatenate clips ─────────────────────────────────────────
        try:
            final_video = concatenate_videoclips(all_clips, method="compose")
        except Exception as e:
            errors.append(f"Failed to concatenate clips: {e}")
            return {'success': False, 'warnings': warnings, 'errors': errors, 'timeline': timeline_out, 'cancelled': False}

        check_cancel()
        report(75, "Adding main audio")

        # ── Step 6: Add main audio ────────────────────────────────────────────
        try:
            main_audio = AudioFileClip(audio_path)
            audio_dur  = main_audio.duration
            video_dur  = final_video.duration

            if video_dur > audio_dur:
                # Trim video to audio duration
                final_video = final_video.subclip(0, audio_dur)
                warnings.append(
                    f"Visual timeline ({video_dur:.2f}s) is longer than audio ({audio_dur:.2f}s). "
                    f"Video trimmed to match audio."
                )
            elif audio_dur > video_dur + 0.5:
                # Pad video with black to match audio
                pad_dur  = audio_dur - video_dur
                black_pad = ColorClip(size=(target_w, target_h), color=(0, 0, 0), duration=pad_dur)
                black_pad = black_pad.set_fps(fps)
                final_video = concatenate_videoclips([final_video, black_pad], method="compose")
                warnings.append(
                    f"Visual timeline ({video_dur:.2f}s) is shorter than audio ({audio_dur:.2f}s). "
                    f"Black padding added at the end."
                )

            # Trim audio to final video duration (ensures sync)
            final_audio = main_audio.subclip(0, min(main_audio.duration, final_video.duration))
            final_video = final_video.set_audio(final_audio)

        except Exception as e:
            errors.append(f"Failed to add main audio: {e}")
            return {'success': False, 'warnings': warnings, 'errors': errors, 'timeline': timeline_out, 'cancelled': False}

        check_cancel()
        report(85, "Encoding video")

        # ── Step 7: Write output ──────────────────────────────────────────────
        codec    = "libx264"
        crf      = profile["crf"]
        preset   = profile["preset"]
        ffmpeg_params = ["-crf", str(crf)]

        try:
            final_video.write_videofile(
                output_path,
                fps=fps,
                codec=codec,
                audio_codec="aac",
                preset=preset,
                ffmpeg_params=ffmpeg_params,
                logger=None,
                verbose=False,
            )
        except Exception as e:
            errors.append(f"Failed to encode video: {e}")
            return {'success': False, 'warnings': warnings, 'errors': errors, 'timeline': timeline_out, 'cancelled': False}

        # ── Cleanup open clips ────────────────────────────────────────────────
        try:
            final_video.close()
            for c in all_clips:
                try: c.close()
                except Exception: pass
        except Exception:
            pass

        report(100, "Finalizing export")
        logger.info("Video timeline generation complete: %s", output_path)

        return {
            'success':   True,
            'warnings':  warnings,
            'errors':    errors,
            'timeline':  timeline_out,
            'cancelled': False,
        }

    except VideoTimelineCancelled:
        logger.info("Video timeline generation cancelled.")
        return {
            'success':   False,
            'warnings':  warnings,
            'errors':    [],
            'timeline':  timeline_out,
            'cancelled': True,
        }

    except Exception as exc:
        logger.exception("Unexpected error in video timeline generation")
        return {
            'success':   False,
            'warnings':  warnings,
            'errors':    [f"Unexpected error: {exc}"],
            'timeline':  timeline_out,
            'cancelled': False,
        }
