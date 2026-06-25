"""
media_timeline_generator.py
Generates a final video from:
  - Main audio track
  - ZIP of media files (images and videos)
  - Timeline CSV (start, end, asset, text)

Batch 11B. Uses MoviePy 1.0.3 + Pillow + NumPy.
"""

import csv
import io
import os
import shutil
import threading
import logging
import zipfile
import textwrap
from pathlib import Path
from typing import Optional, Callable, Any, Dict, List, Tuple

import numpy as np
from moviepy.editor import (
    VideoFileClip,
    ImageClip,
    CompositeVideoClip,
    concatenate_videoclips,
    AudioFileClip
)
from moviepy.video.fx.all import resize

logger = logging.getLogger(__name__)

# Pillow compatibility shim
try:
    from PIL import Image, ImageDraw, ImageFont, ImageFilter
    if not hasattr(Image, "ANTIALIAS"):
        try:
            Image.ANTIALIAS = Image.Resampling.LANCZOS
        except AttributeError:
            try:
                Image.ANTIALIAS = Image.LANCZOS
            except AttributeError:
                Image.ANTIALIAS = Image.BICUBIC
except ImportError:
    pass

# ---------------------------------------------------------------------------
# Tables & Constants
# ---------------------------------------------------------------------------

FORMAT_DIMENSIONS: Dict[str, Dict[str, Tuple[int, int]]] = {
    "9:16":  {"720p": (720,  1280), "1080p": (1080, 1920), "2K": (1440, 2560), "4K": (2160, 3840)},
    "16:9": {"720p": (1280, 720),  "1080p": (1920, 1080), "2K": (2560, 1440), "4K": (3840, 2160)},
    "1:1":  {"720p": (720,  720),  "1080p": (1080, 1080), "2K": (1440, 1440), "4K": (2160, 2160)},
}

ALLOWED_EXTS = {".mp4", ".mov", ".webm", ".png", ".jpg", ".jpeg"}
VIDEO_EXTS = {".mp4", ".mov", ".webm"}
IMAGE_EXTS = {".png", ".jpg", ".jpeg"}

PROFILE_SETTINGS = {
    "fast_preview": {"fps": 24, "preset": "ultrafast", "crf": 28, "audio_bitrate": "128k"},
    "balanced":     {"fps": 30, "preset": "medium",    "crf": 23, "audio_bitrate": "192k"},
    "high_quality": {"fps": 30, "preset": "slow",      "crf": 18, "audio_bitrate": "256k"},
}

class MediaTimelineCancelled(Exception):
    pass

class MediaTimelineError(Exception):
    pass

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _make_black_clip(width: int, height: int, duration: float, fps: int):
    frame = np.zeros((height, width, 3), dtype=np.uint8)
    clip = ImageClip(frame, duration=duration)
    clip = clip.set_fps(fps)
    return clip

def _make_text_overlay_frame(
    width: int, height: int, text: str,
    pos: str, size: str, color: str, bg: str, width_mode: str, align: str
) -> np.ndarray:
    """Create a transparent image with styled text overlay."""
    img = Image.new("RGBA", (width, height), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    
    # 1. Font Size
    pct = {"small": 0.03, "medium": 0.04, "large": 0.05, "extra_large": 0.06}.get(size, 0.04)
    fs = max(16, int(height * pct))
    
    # Simple default font
    try:
        # standard fallback on mac/linux
        font_path = "/System/Library/Fonts/Supplemental/Arial.ttf" if os.path.exists("/System/Library/Fonts/Supplemental/Arial.ttf") else "Arial.ttf"
        font = ImageFont.truetype(font_path, fs)
    except Exception:
        font = ImageFont.load_default()
        if hasattr(font, 'size') and font.size < 20: fs = 20
        
    # 2. Colors
    c_map = {"white": (255,255,255), "yellow": (255,215,0), "black": (0,0,0), "accent": (139,92,246)}
    txt_col = c_map.get(color, (255,255,255))
    
    # 3. Text Wrapping
    w_map = {"narrow": 0.55, "medium": 0.70, "wide": 0.85}
    max_w = int(width * w_map.get(width_mode, 0.85))
    
    avg_char_w = draw.textlength("a", font=font) if hasattr(draw, "textlength") else fs * 0.6
    chars_per_line = max(10, int(max_w / avg_char_w))
    lines = textwrap.wrap(text, width=chars_per_line)
    
    try:
        lh = draw.textbbox((0,0), "A", font=font)[3] - draw.textbbox((0,0), "A", font=font)[1]
    except Exception:
        lh = fs
    
    line_spacing = int(lh * 1.3)
    total_h = line_spacing * len(lines)
    
    # 4. Box dimensions
    pad_x = int(width * 0.03)
    pad_y = int(height * 0.02)
    
    box_w = 0
    for line in lines:
        try:
            lw = draw.textlength(line, font=font)
        except Exception:
            lw = len(line) * fs * 0.6
        box_w = max(box_w, int(lw))
        
    box_w = min(box_w + pad_x*2, width)
    box_h = total_h + pad_y*2
    
    # 5. Positioning
    safe_x = int(width * 0.05)
    safe_y = int(height * 0.05)
    
    if pos == "center":
        box_x = (width - box_w) // 2
        box_y = (height - box_h) // 2
    elif pos == "top_center":
        box_x = (width - box_w) // 2
        box_y = safe_y
    elif pos == "bottom_left":
        box_x = safe_x
        box_y = height - box_h - safe_y
    elif pos == "bottom_right":
        box_x = width - box_w - safe_x
        box_y = height - box_h - safe_y
    elif pos == "lower_third":
        box_x = (width - box_w) // 2
        box_y = int(height * 0.66) - (box_h // 2)
    else: # bottom_center
        box_x = (width - box_w) // 2
        box_y = height - box_h - safe_y
        
    # 6. Draw Background
    if bg in ("dark_box", "light_box", "blur_box"):
        bg_col = (0, 0, 0, 180)
        if bg == "light_box":
            bg_col = (255, 255, 255, 200)
            if txt_col == (255, 255, 255): txt_col = (0, 0, 0)
        elif bg == "blur_box":
            bg_col = (20, 20, 20, 150) # softer translucent dark box fallback
            
        draw.rounded_rectangle([box_x, box_y, box_x+box_w, box_y+box_h], radius=int(height*0.015), fill=bg_col)
    
    # 7. Draw Text
    y = box_y + pad_y
    for line in lines:
        try:
            lw = draw.textlength(line, font=font)
        except Exception:
            lw = len(line) * fs * 0.6
            
        if align == "left":
            x = box_x + pad_x
        elif align == "right":
            x = box_x + box_w - pad_x - lw
        else: # center
            x = box_x + (box_w - lw) / 2
            
        if bg == "soft_shadow":
            shadow_offset = max(2, int(height * 0.003))
            draw.text((x + shadow_offset, y + shadow_offset), line, font=font, fill=(0,0,0,180))
            
        draw.text((x, y), line, font=font, fill=txt_col + (255,))
        y += line_spacing
        
    return np.array(img)

def _make_text_clip(
    width: int, height: int, text: str, duration: float, fps: int,
    pos: str, size: str, color: str, bg: str, width_mode: str, align: str
):
    rgba_frame = _make_text_overlay_frame(width, height, text, pos, size, color, bg, width_mode, align)
    rgb_frame = rgba_frame[:, :, :3]
    alpha_frame = rgba_frame[:, :, 3] / 255.0
    
    clip = ImageClip(rgb_frame, duration=duration).set_fps(fps)
    mask = ImageClip(alpha_frame, duration=duration, ismask=True).set_fps(fps)
    clip = clip.set_mask(mask)
    return clip

def _validate_clip(clip: Any, label: str) -> None:
    if clip is None:
        raise MediaTimelineError(f"Invalid clip at {label}: clip is None.")
    if not hasattr(clip, "get_frame"):
        raise MediaTimelineError(f"Invalid clip at {label}: no get_frame.")
    dur = getattr(clip, "duration", None)
    if dur is None or dur <= 0:
        raise MediaTimelineError(f"Invalid clip at {label}: duration is {dur!r}.")
    try:
        clip.get_frame(0.0)
    except Exception as e:
        raise MediaTimelineError(f"Invalid clip at {label}: get_frame(0) failed — {e}.")

# ---------------------------------------------------------------------------
# Extraction & Parsing
# ---------------------------------------------------------------------------

def extract_media_zip(zip_path: str, dest_dir: str) -> dict[str, str]:
    media_map: dict[str, str] = {}
    dest = Path(dest_dir)
    dest.mkdir(parents=True, exist_ok=True)
    
    with zipfile.ZipFile(zip_path, "r") as zf:
        for member in zf.infolist():
            name = member.filename
            if member.is_dir(): continue
            basename = Path(name).name
            if not basename or basename.startswith(".") or "__MACOSX" in name: continue
            ext = Path(basename).suffix.lower()
            
            if ext not in ALLOWED_EXTS:
                continue
                
            target_path = (dest / basename).resolve()
            if not str(target_path).startswith(str(dest.resolve())): continue
                
            if basename.lower() in media_map:
                raise MediaTimelineError(f"Duplicate filename in ZIP: {basename}")
                
            with zf.open(member) as src, open(target_path, "wb") as dst:
                shutil.copyfileobj(src, dst)
            media_map[basename.lower()] = str(target_path)
            
    return media_map

def parse_media_csv(csv_path: str, media_map: dict[str, str]) -> tuple[list[dict], list[str], list[str]]:
    rows: list[dict] = []
    warnings: list[str] = []
    errors: list[str] = []

    with open(csv_path, newline="", encoding="utf-8-sig") as f:
        content = f.read()

    reader = csv.DictReader(io.StringIO(content))
    if reader.fieldnames is None:
        errors.append("CSV is empty or has no header row.")
        return rows, warnings, errors

    lower_fields = [f.lower().strip() for f in reader.fieldnames]
    
    start_col = next((f for f in lower_fields if f == "start"), None)
    end_col   = next((f for f in lower_fields if f == "end"), None)
    asset_col = next((f for f in lower_fields if "asset" in f or "image" in f or "video" in f), None)
    text_col  = next((f for f in lower_fields if f == "text"), None)
    
    # Optional styling columns
    pos_col   = next((f for f in lower_fields if f == "text_position"), None)
    size_col  = next((f for f in lower_fields if f == "text_size"), None)
    color_col = next((f for f in lower_fields if f == "text_color"), None)
    bg_col    = next((f for f in lower_fields if f == "text_background"), None)
    align_col = next((f for f in lower_fields if f == "text_alignment"), None)

    if not start_col or not end_col or not asset_col:
        errors.append("CSV must have 'start', 'end', and 'asset' columns.")
        return rows, warnings, errors

    reader.fieldnames = lower_fields

    prev_end = 0.0
    for idx, row in enumerate(reader, start=2):
        s_str = row.get(start_col, "").strip()
        e_str = row.get(end_col, "").strip()
        asset_str = row.get(asset_col, "").strip()
        text_str = row.get(text_col, "").strip() if text_col else ""
        
        # Override styles
        t_pos   = row.get(pos_col, "").strip() if pos_col else ""
        t_size  = row.get(size_col, "").strip() if size_col else ""
        t_col   = row.get(color_col, "").strip() if color_col else ""
        t_bg    = row.get(bg_col, "").strip() if bg_col else ""
        t_align = row.get(align_col, "").strip() if align_col else ""

        if not s_str and not e_str and not asset_str and not text_str:
            continue

        try:
            start_sec = float(s_str)
            end_sec   = float(e_str)
        except ValueError:
            errors.append(f"Row {idx}: Invalid start/end times ('{s_str}', '{e_str}'). Must be numbers.")
            continue

        if start_sec >= end_sec:
            errors.append(f"Row {idx}: Start time ({start_sec}) must be < end time ({end_sec}).")
            continue

        if start_sec < prev_end:
            errors.append(f"Row {idx}: Overlaps previous row. Expected start >= {prev_end}, got {start_sec}.")
            continue

        asset_path = None
        asset_type = "none"
        if asset_str:
            asset_path = media_map.get(asset_str.lower())
            if not asset_path:
                errors.append(f"Row {idx}: Asset '{asset_str}' not found in ZIP.")
                continue
            ext = Path(asset_path).suffix.lower()
            if ext in VIDEO_EXTS:
                asset_type = "video"
            elif ext in IMAGE_EXTS:
                asset_type = "image"
        else:
            if not text_str:
                warnings.append(f"Row {idx}: No asset and no text. Wil be a black screen.")

        if start_sec > prev_end:
            gap = start_sec - prev_end
            rows.append({
                "type": "gap",
                "start": prev_end,
                "end": start_sec,
                "duration": gap,
            })

        rows.append({
            "type": "content",
            "start": start_sec,
            "end": end_sec,
            "duration": end_sec - start_sec,
            "asset_name": asset_str,
            "asset_path": asset_path,
            "asset_type": asset_type,
            "text": text_str,
            "text_position": t_pos,
            "text_size": t_size,
            "text_color": t_col,
            "text_background": t_bg,
            "text_alignment": t_align,
            "row_idx": idx,
        })
        prev_end = end_sec

    if not any(r["type"] == "content" for r in rows):
        errors.append("No valid content rows found in CSV.")

    return rows, warnings, errors

# ---------------------------------------------------------------------------
# Core Generator
# ---------------------------------------------------------------------------

def generate_media_timeline(
    audio_path: str,
    zip_path: str,
    csv_path: str,
    output_path: str,
    temp_dir: str,
    aspect_ratio: str = "9:16",
    export_resolution: str = "1080p",
    fit_mode: str = "cover",
    fill_mode: str = "loop",
    render_profile: str = "balanced",
    text_position: str = "bottom_center",
    text_size: str = "medium",
    text_color: str = "white",
    text_background: str = "soft_shadow",
    text_width: str = "wide",
    text_alignment: str = "center",
    cancel_event: threading.Event = None,
    progress_callback: Callable[[int, str], None] = None,
) -> dict:
    
    def report(pct, msg):
        logger.info(f"MediaTimeline: {msg} ({pct}%)")
        if progress_callback:
            progress_callback(pct, msg)
            
    def check_cancel():
        if cancel_event and cancel_event.is_set():
            raise MediaTimelineCancelled("Job cancelled by user.")

    report(5, "Extracting media files from ZIP...")
    media_map = extract_media_zip(zip_path, temp_dir)
    check_cancel()

    report(10, "Parsing timeline CSV...")
    rows, warnings, errors = parse_media_csv(csv_path, media_map)
    if errors:
        return {"success": False, "warnings": warnings, "errors": errors, "timeline": []}
        
    check_cancel()
    report(15, "Loading main audio...")
    
    main_audio = AudioFileClip(audio_path)
    audio_dur = main_audio.duration
    
    width, height = FORMAT_DIMENSIONS.get(aspect_ratio, {}).get(export_resolution, (1080, 1920))
    prof = PROFILE_SETTINGS.get(render_profile, PROFILE_SETTINGS["balanced"])
    fps = prof["fps"]

    report(20, "Building timeline clips...")
    
    final_clips = []
    _raw_clips = []
    
    try:
        timeline_report = []
        visual_dur = 0.0
        
        for idx, row in enumerate(rows):
            check_cancel()
            
            dur = row["duration"]
            c_type = row["type"]
            
            if c_type == "gap":
                clip = _make_black_clip(width, height, dur, fps)
                final_clips.append(clip)
                visual_dur += dur
                continue
                
            # It's a content row
            asset_type = row["asset_type"]
            asset_path = row["asset_path"]
            text_str = row["text"]
            
            base_clip = None
            
            if asset_type == "video":
                raw = VideoFileClip(asset_path)
                _raw_clips.append(raw)
                
                v_dur = raw.duration
                if v_dur <= 0.1:
                    warnings.append(f"Row {row['row_idx']}: video too short ({v_dur}s).")
                    base_clip = _make_black_clip(width, height, dur, fps)
                else:
                    if dur > v_dur:
                        if fill_mode == "loop":
                            from moviepy.video.fx.all import loop
                            base_clip = raw.fx(loop, duration=dur)
                        elif fill_mode == "freeze":
                            freeze = raw.to_ImageClip(t=v_dur - 0.1).set_duration(dur - v_dur)
                            from moviepy.editor import concatenate_videoclips
                            base_clip = concatenate_videoclips([raw, freeze], method="chain")
                        else: # trim_only -> leaves black
                            padding = _make_black_clip(raw.w, raw.h, dur - v_dur, fps)
                            from moviepy.editor import concatenate_videoclips
                            base_clip = concatenate_videoclips([raw, padding], method="chain")
                    else:
                        base_clip = raw.subclip(0, dur)
                        
            elif asset_type == "image":
                base_clip = ImageClip(asset_path).set_duration(dur)
            else: # none / text only
                # For text-only rows, we want a nice background
                # We will create a dark gradient or neutral surface
                # A simple dark gray works nicely and looks premium
                bg_frame = np.full((height, width, 3), (18, 18, 20), dtype=np.uint8)
                base_clip = ImageClip(bg_frame, duration=dur).set_fps(fps)
                
            # Resize
            if asset_type in ("video", "image"):
                base_clip = base_clip.without_audio()
                bw, bh = base_clip.w, base_clip.h
                if bw != width or bh != height:
                    target_ratio = width / height
                    src_ratio = bw / bh
                    
                    if fit_mode == "cover":
                        if src_ratio > target_ratio: # wider, crop sides
                            new_w = int(bh * target_ratio)
                            x_center = bw / 2
                            base_clip = base_clip.crop(x1=x_center - new_w/2, width=new_w)
                        else: # taller, crop top/bottom
                            new_h = int(bw / target_ratio)
                            y_center = bh / 2
                            base_clip = base_clip.crop(y1=y_center - new_h/2, height=new_h)
                        base_clip = base_clip.resize((width, height))
                    else: # contain
                        base_clip = base_clip.resize(width=width) if src_ratio > target_ratio else base_clip.resize(height=height)
                        if base_clip.w != width or base_clip.h != height:
                            from moviepy.editor import CompositeVideoClip
                            bg = _make_black_clip(width, height, dur, fps)
                            base_clip = CompositeVideoClip([bg, base_clip.set_position("center")])
                            
            # Overlay Text
            if text_str:
                row_pos = row.get("text_position") or text_position
                row_sz  = row.get("text_size") or text_size
                row_col = row.get("text_color") or text_color
                row_bg  = row.get("text_background") or text_background
                row_wid = row.get("text_width") or text_width
                row_aln = row.get("text_alignment") or text_alignment
                
                txt_clip = _make_text_clip(
                    width, height, text_str, dur, fps,
                    pos=row_pos, size=row_sz, color=row_col, bg=row_bg, width_mode=row_wid, align=row_aln
                )
                base_clip = CompositeVideoClip([base_clip, txt_clip])
                
            base_clip = base_clip.set_fps(fps)
            _validate_clip(base_clip, f"Row {row['row_idx']}")
            final_clips.append(base_clip)
            visual_dur += dur
            
            timeline_report.append({
                "image": row["asset_name"],
                "start": row["start"],
                "end": row["end"],
                "duration": dur,
                "text": text_str,
                "status": "ok",
            })
            
        report(60, "Padding audio/video to match durations...")
        
        # Match audio and visual duration
        if visual_dur < audio_dur:
            warnings.append(f"Visual timeline ({visual_dur:.2f}s) is shorter than audio ({audio_dur:.2f}s). Black padding added at the end.")
            pad = _make_black_clip(width, height, audio_dur - visual_dur, fps)
            final_clips.append(pad)
            visual_dur = audio_dur
            
        final_video = concatenate_videoclips(final_clips, method="chain")
        
        if visual_dur > audio_dur:
            warnings.append(f"Visual timeline ({visual_dur:.2f}s) is longer than audio ({audio_dur:.2f}s). Audio padded with silence.")
            # moviepy automatically handles shorter audio by padding or we can just set it
            # set_audio on a clip with longer duration automatically pads audio with silence in moviepy 1.0.3 usually
            pass
            
        final_video = final_video.set_audio(main_audio.set_duration(visual_dur))

        report(70, "Encoding final MP4...")
        
        logger_func = "bar" if not progress_callback else None
        
        final_video.write_videofile(
            output_path,
            fps=fps,
            codec="libx264",
            preset=prof["preset"],
            ffmpeg_params=["-crf", str(prof["crf"]), "-pix_fmt", "yuv420p"],
            audio_codec="aac",
            audio_bitrate=prof["audio_bitrate"],
            threads=max(1, os.cpu_count() - 1),
            logger=logger_func
        )
        
        report(100, "Done.")
        
        return {
            "success": True,
            "timeline": timeline_report,
            "warnings": warnings,
            "errors": [],
            "visual_duration": visual_dur,
            "audio_duration": audio_dur,
        }
        
    finally:
        main_audio.close()
        for raw in _raw_clips:
            try: raw.close()
            except Exception: pass

