"""
main.py - FastAPI backend for Audio Image Sync Studio
Handles file uploads, triggers video generation, and serves outputs.
Batch 2: optional outro video and background music.
Batch 3: export resolution, render profiles, watermark.
"""

import os
import uuid

import subprocess

def _verify_mp4_audio(filepath: str) -> bool:
    try:
        cmd = [
            "ffprobe", "-v", "error",
            "-select_streams", "a:0",
            "-show_entries", "stream=codec_type",
            "-of", "csv=p=0",
            filepath
        ]
        result = subprocess.run(cmd, capture_output=True, text=True, check=True)
        return result.stdout.strip().lower() == "audio"
    except Exception as e:
        logger.error(f"FFprobe check failed for {filepath}: {e}")
        return False

import shutil
import logging
import time
import threading
import re
from pathlib import Path
from typing import Optional, List

from fastapi import FastAPI, File, Form, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles

from video_generator import generate_video, GenerationCancelled
from video_timeline_generator import generate_video_timeline, VideoTimelineCancelled
from media_timeline_generator import generate_media_timeline, MediaTimelineCancelled
from utils import seconds_to_mmss, FORMAT_DIMENSIONS
from audio_helpers import prepare_single_audio, prepare_zip_audio, merge_audio_parts_in_order
from transcription_helpers import transcribe_audio_backend, format_output

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------

BASE_DIR    = Path(__file__).parent
UPLOADS_DIR = BASE_DIR / "uploads"
OUTPUTS_DIR = BASE_DIR / "outputs"
TEMP_DIR    = BASE_DIR / "temp"

for d in [UPLOADS_DIR, OUTPUTS_DIR, TEMP_DIR]:
    d.mkdir(exist_ok=True)

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  %(levelname)s  %(name)s  %(message)s",
)
logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Allowed values
# ---------------------------------------------------------------------------

ALLOWED_INTRO_EXTS      = {".mp4", ".mov", ".webm"}
ALLOWED_OUTRO_EXTS      = {".mp4", ".mov", ".webm"}
ALLOWED_MUSIC_EXTS      = {".mp3", ".wav", ".m4a", ".aac"}
VALID_ASPECT_RATIOS     = {"9:16", "16:9", "1:1"}
VALID_EXPORT_RESOLUTIONS = {"720p", "1080p", "2K", "4K"}
VALID_RENDER_PROFILES   = {"fast_preview", "balanced", "high_quality"}
VALID_WM_POSITIONS      = {"top_left", "top_right", "bottom_left", "bottom_right", "center"}
VALID_WM_SIZES          = {"small", "medium", "large"}
VALID_FILL_MODES        = {"loop", "trim_only", "freeze"}
ALLOWED_VIDEO_EXTS      = {".mp4", ".mov", ".webm"}

# ---------------------------------------------------------------------------
# In-memory job registry
# ---------------------------------------------------------------------------

_jobs: dict[str, dict] = {}
_jobs_lock = threading.Lock()


def _new_job(job_id: str) -> dict:
    state = {
        "job_id":          job_id,
        "status":          "queued",
        "progress":        0,
        "current_step":    "Queued",
        "started_at":      None,
        "finished_at":     None,
        "warnings":        [],
        "errors":          [],
        "output_video_url": None,
        "output_filename": None,
        "timeline_report": [],
        "cancel_event":    threading.Event(),
        "temp_dir":        None,
    }
    with _jobs_lock:
        _jobs[job_id] = state
    return state


def _get_job(job_id: str) -> Optional[dict]:
    with _jobs_lock:
        return _jobs.get(job_id)


# ---------------------------------------------------------------------------
# FastAPI app
# ---------------------------------------------------------------------------

app = FastAPI(
    title="Audio Image Sync Studio",
    description="Generate perfectly timed videos from audio, ordered images, and timestamps.",
    version="1.3.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.mount("/outputs", StaticFiles(directory=str(OUTPUTS_DIR)), name="outputs")


# ---------------------------------------------------------------------------
# Routes — health
# ---------------------------------------------------------------------------

@app.get("/api/health")
async def health_check():
    return {"status": "ok", "service": "Audio Image Sync Studio", "version": "1.3.0"}


# ---------------------------------------------------------------------------
# Routes — job system
# ---------------------------------------------------------------------------

@app.post("/api/jobs/start")
async def jobs_start(
    # Audio — mode selector + two upload slots
    audio_input_mode: str = Form("single"),          # 'single' | 'zip'
    audio_file:       Optional[UploadFile] = File(None),   # for mode=single
    audio_zip:        Optional[UploadFile] = File(None),   # for mode=zip
    audio_files:      Optional[List[UploadFile]] = File(None), # backward compatibility
    # Required uploads
    images_zip:      UploadFile = File(...),
    timestamp_csv:   UploadFile = File(...),
    # Core video settings
    aspect_ratio:      str   = Form("9:16"),
    export_resolution: str   = Form("1080p"),
    fit_mode:          str   = Form("cover"),
    transition:        str   = Form("fade"),
    transition_duration: float = Form(0.5),
    zoom_effect:       str   = Form("none"),
    render_profile:    str   = Form("balanced"),
    output_name:       Optional[str] = Form(None),
    # Batch 9A — motion & style
    motion_effect:    str = Form("slow_zoom_in"),
    motion_intensity: str = Form("medium"),
    visual_effect:    str = Form("none"),
    effect_strength:  str = Form("medium"),
    style_preset:     str = Form("clean_default"),
    # Watermark (Batch 3)
    enable_watermark:        str   = Form("false"),
    watermark_text:          str   = Form(""),
    watermark_position_mode: str   = Form("preset"),
    watermark_coordinate_mode: str = Form("design_canvas"),
    watermark_position:      str   = Form("bottom_right"),
    watermark_x:             int   = Form(50),
    watermark_y:             int   = Form(50),
    watermark_opacity:       float = Form(0.65),
    watermark_size:          int   = Form(20),
    watermark_margin:        int   = Form(36),
    # Optional intro/outro (Batch 2/6)
    intro_file:    Optional[UploadFile] = File(None),
    outro_file:    Optional[UploadFile] = File(None),
    # Optional background music (Batch 2)
    bg_music_file:     Optional[UploadFile] = File(None),
    enable_bg_music:   str   = Form("false"),
    music_volume:      float = Form(0.12),
    music_fade:        str   = Form("true"),
):
    """
    Accept uploaded files and settings, create a background job, return {job_id}.
    Client polls GET /api/jobs/{job_id}/status for progress.
    """

    # ── Validate core settings ────────────────────────────────────
    if aspect_ratio not in VALID_ASPECT_RATIOS:
        raise HTTPException(400, f"Invalid aspect_ratio '{aspect_ratio}'. Valid: {sorted(VALID_ASPECT_RATIOS)}")
    if export_resolution not in VALID_EXPORT_RESOLUTIONS:
        raise HTTPException(400, f"Invalid export_resolution '{export_resolution}'. Valid: {sorted(VALID_EXPORT_RESOLUTIONS)}")
    if render_profile not in VALID_RENDER_PROFILES:
        raise HTTPException(400, f"Invalid render_profile '{render_profile}'. Valid: {sorted(VALID_RENDER_PROFILES)}")

    # ── Normalise Batch 9A params ─────────────────────────────────
    valid_motion_effects   = {"none","slow_zoom_in","slow_zoom_out","ken_burns","pan_left","pan_right","pan_up","pan_down","subtle_random","dynamic_shorts"}
    valid_motion_intensity = {"low", "medium", "high"}
    valid_visual_effects   = {"none","cinematic","warm","high_contrast","black_and_white","clean_bright"}
    valid_effect_strength  = {"low", "medium", "high"}

    motion_effect_safe    = motion_effect    if motion_effect    in valid_motion_effects   else "slow_zoom_in"
    motion_intensity_safe = motion_intensity if motion_intensity in valid_motion_intensity else "medium"
    visual_effect_safe    = visual_effect    if visual_effect    in valid_visual_effects   else "none"
    effect_strength_safe  = effect_strength  if effect_strength  in valid_effect_strength  else "medium"
    transition_dur_safe   = max(0.1, min(float(transition_duration), 2.0))

    # ── Validate optional file types ────────────────────────────────────────
    if intro_file is not None and intro_file.filename:
        ext = Path(intro_file.filename).suffix.lower()
        if ext not in ALLOWED_INTRO_EXTS:
            raise HTTPException(400, f"Unsupported intro file type '{ext}'. Allowed: {', '.join(sorted(ALLOWED_INTRO_EXTS))}")

    if outro_file is not None and outro_file.filename:
        ext = Path(outro_file.filename).suffix.lower()
        if ext not in ALLOWED_OUTRO_EXTS:
            raise HTTPException(400, f"Unsupported outro file type '{ext}'. Allowed: {', '.join(sorted(ALLOWED_OUTRO_EXTS))}")

    if bg_music_file is not None and bg_music_file.filename:
        ext = Path(bg_music_file.filename).suffix.lower()
        if ext not in ALLOWED_MUSIC_EXTS:
            raise HTTPException(400, f"Unsupported music file type '{ext}'. Allowed: {', '.join(sorted(ALLOWED_MUSIC_EXTS))}")

    # ── Validate / normalise watermark ──────────────────────────────────────
    wm_text     = watermark_text.strip()[:100]           # cap at 100 chars
    wm_mode     = watermark_position_mode.strip().lower()
    wm_coord_mode = watermark_coordinate_mode.strip().lower()
    if wm_mode not in {"preset", "custom"}:
        wm_mode = "preset"
    wm_position = watermark_position.lower().replace("-", "_")
    if wm_position not in VALID_WM_POSITIONS:
        wm_position = "bottom_right"
    wm_x = int(watermark_x)
    wm_y = int(watermark_y)
    wm_size = max(1, min(100, int(watermark_size)))
    wm_opacity = max(0.0, min(1.0, float(watermark_opacity)))
    wm_margin  = max(5, min(int(watermark_margin), 200))
    wm_enabled = enable_watermark.strip().lower() == "true"

    # ── Normalise other settings ─────────────────────────────────────────────
    enable_music_bool  = enable_bg_music.strip().lower() == "true"
    music_fade_bool    = music_fade.strip().lower() == "true"
    music_vol_clamped  = max(0.0, min(1.0, float(music_volume)))

    # ── Set up job ────────────────────────────────────────────────────────────
    job_id   = uuid.uuid4().hex
    job_temp = TEMP_DIR / job_id
    job_temp.mkdir(parents=True, exist_ok=True)

    # Save required uploads
    zip_path    = str(job_temp / "images.zip")
    csv_path    = str(job_temp / "timestamps.csv")

    for upload, dest in [(images_zip, zip_path), (timestamp_csv, csv_path)]:
        content = await upload.read()
        with open(dest, "wb") as f:
            f.write(content)

    # ── Prepare main audio via shared helper ──────────────────────────────
    mode = audio_input_mode.strip().lower()
    
    if mode == "single" and audio_file is not None and audio_file.filename:
        try:
            audio_path, _audio_meta = prepare_single_audio(
                await audio_file.read(), audio_file.filename, job_temp
            )
        except ValueError as e:
            raise HTTPException(400, str(e))
    elif mode == "zip" and audio_zip is not None and audio_zip.filename:
        try:
            audio_path, _audio_meta = prepare_zip_audio(
                await audio_zip.read(), job_temp
            )
        except ValueError as e:
            raise HTTPException(400, str(e))
    elif audio_files is not None and len(audio_files) > 0 and audio_files[0].filename:
        try:
            audio_path, _audio_meta = await prepare_multiple_audio(
                audio_files, job_temp
            )
        except ValueError as e:
            raise HTTPException(400, str(e))
    else:
        if mode == "single":
            raise HTTPException(400, "Please upload a main audio file.")
        elif mode == "zip":
            raise HTTPException(400, "Please upload an Audio Parts ZIP.")
        else:
            raise HTTPException(400, "Invalid audio input mode.")

    # Save optional uploads
    intro_path: Optional[str] = None
    if intro_file is not None and intro_file.filename:
        intro_ext  = Path(intro_file.filename).suffix.lower()
        intro_path = str(job_temp / f"intro{intro_ext}")
        content    = await intro_file.read()
        with open(intro_path, "wb") as f:
            f.write(content)

    outro_path: Optional[str] = None
    if outro_file is not None and outro_file.filename:
        outro_ext  = Path(outro_file.filename).suffix.lower()
        outro_path = str(job_temp / f"outro{outro_ext}")
        content    = await outro_file.read()
        with open(outro_path, "wb") as f:
            f.write(content)

    bg_music_path: Optional[str] = None
    if bg_music_file is not None and bg_music_file.filename:
        music_ext     = Path(bg_music_file.filename).suffix.lower()
        bg_music_path = str(job_temp / f"bgmusic{music_ext}")
        content       = await bg_music_file.read()
        with open(bg_music_path, "wb") as f:
            f.write(content)

    # Determine output filename
    safe_name       = output_name.strip() if output_name and output_name.strip() else "video"
    safe_name       = "".join(c for c in safe_name if c.isalnum() or c in "-_ ")
    safe_name       = safe_name.strip().replace(" ", "_") or "video"
    timestamp_str   = time.strftime("%Y%m%d_%H%M%S")
    output_filename = f"{safe_name}_{timestamp_str}.mp4"
    output_path     = str(OUTPUTS_DIR / output_filename)

    # Register job
    state = _new_job(job_id)
    state["temp_dir"]        = str(job_temp)
    state["output_filename"] = output_filename

    def run_job():
        with _jobs_lock:
            state["status"]       = "running"
            state["started_at"]   = time.time()
            state["current_step"] = "Preparing job"
            state["progress"]     = 5

        def progress_callback(pct: int, step: str):
            with _jobs_lock:
                if state["status"] == "running":
                    state["progress"]     = pct
                    state["current_step"] = step

        try:
            result = generate_video(
                audio_path=audio_path,
                zip_path=zip_path,
                csv_path=csv_path,
                output_path=output_path,
                temp_dir=str(job_temp),
                # Core
                aspect_ratio=aspect_ratio,
                export_resolution=export_resolution,
                fit_mode=fit_mode,
                transition=transition,
                transition_duration=transition_dur_safe,
                zoom_effect=zoom_effect,
                render_profile=render_profile,
                # Batch 9A
                motion_effect=motion_effect_safe,
                motion_intensity=motion_intensity_safe,
                visual_effect=visual_effect_safe,
                effect_strength=effect_strength_safe,
                # Watermark
                enable_watermark=wm_enabled,
                watermark_text=wm_text,
                watermark_position_mode=wm_mode,
                watermark_coordinate_mode=wm_coord_mode,
                watermark_position=wm_position,
                watermark_x=wm_x,
                watermark_y=wm_y,
                watermark_opacity=wm_opacity,
                watermark_size=wm_size,
                watermark_margin=wm_margin,
                # Batch 2/6
                intro_path=intro_path,
                outro_path=outro_path,
                bg_music_path=bg_music_path,
                enable_bg_music=enable_music_bool,
                music_volume=music_vol_clamped,
                music_fade=music_fade_bool,
                # Infra
                cancel_event=state["cancel_event"],
                progress_callback=progress_callback,
            )

            timeline_report = _format_timeline(result.get("timeline", []))

            with _jobs_lock:
                state["warnings"]       = result.get("warnings", [])
                state["errors"]         = result.get("errors", [])
                state["timeline_report"] = timeline_report
                state["finished_at"]    = time.time()

                if result.get("cancelled"):
                    state["status"]       = "cancelled"
                    state["current_step"] = "Cancelled"
                    state["progress"]     = 0
                elif result["success"] and os.path.isfile(output_path):
                    if not _verify_mp4_audio(output_path):
                        state["status"]       = "failed"
                        state["current_step"] = "Failed"
                        state["errors"].append("Final video was created without an audio track. Please check the audio pipeline.")
                        logger.error(f"Job failed audio verification: {output_path}")
                    else:
                        state["status"]            = "completed"
                        state["current_step"]      = "Complete"
                        state["progress"]          = 100
                        state["output_video_url"]  = f"/outputs/{output_filename}"
                        logger.info(f"Final MP4 audio stream verified: true")
                else:
                    state["status"]       = "failed"
                    state["current_step"] = "Failed"

        except GenerationCancelled:
            with _jobs_lock:
                state["status"]       = "cancelled"
                state["current_step"] = "Cancelled"
                state["progress"]     = 0
                state["finished_at"]  = time.time()
            if os.path.isfile(output_path):
                try:
                    os.remove(output_path)
                except Exception:
                    pass

        except Exception as exc:
            logger.exception("Unhandled error in job %s", job_id)
            with _jobs_lock:
                state["status"]       = "failed"
                state["current_step"] = "Failed"
                state["errors"]       = [f"Internal server error: {str(exc)}"]
                state["finished_at"]  = time.time()

        finally:
            try:
                shutil.rmtree(str(job_temp), ignore_errors=True)
            except Exception:
                pass
            logger.info("Job %s finished → status=%s", job_id, state["status"])

    thread = threading.Thread(target=run_job, daemon=True, name=f"job-{job_id[:8]}")
    thread.start()

    logger.info("Job %s queued", job_id)
    return JSONResponse(content={"job_id": job_id})


@app.get("/api/jobs/{job_id}/status")
async def jobs_status(job_id: str):
    state = _get_job(job_id)
    if state is None:
        raise HTTPException(status_code=404, detail="Job not found")

    with _jobs_lock:
        started_at  = state["started_at"]
        finished_at = state["finished_at"]
        progress    = state["progress"]
        status      = state["status"]

    now     = time.time()
    elapsed = round((finished_at or now) - started_at, 1) if started_at else 0.0

    estimated_remaining: Optional[float] = None
    if started_at and progress and progress > 0 and status == "running":
        elapsed_so_far   = now - started_at
        estimated_total  = elapsed_so_far / (progress / 100.0)
        estimated_remaining = round(max(estimated_total - elapsed_so_far, 0), 1)

    with _jobs_lock:
        return JSONResponse(content={
            "job_id":                      job_id,
            "status":                      state["status"],
            "progress":                    state["progress"],
            "current_step":                state["current_step"],
            "elapsed_seconds":             elapsed,
            "estimated_remaining_seconds": estimated_remaining,
            "warnings":                    state["warnings"],
            "errors":                      state["errors"],
            "output_video_url":            state["output_video_url"],
            "output_filename":             state["output_filename"],
            "timeline_report":             state["timeline_report"],
        })


@app.post("/api/jobs/{job_id}/cancel")
async def jobs_cancel(job_id: str):
    state = _get_job(job_id)
    if state is None:
        raise HTTPException(status_code=404, detail="Job not found")

    with _jobs_lock:
        if state["status"] not in ("queued", "running"):
            return JSONResponse(content={"ok": False, "reason": f"Job is already {state['status']}"})
        state["cancel_event"].set()
        state["current_step"] = "Cancelling…"

    logger.info("Cancel requested for job %s", job_id)
    return JSONResponse(content={"ok": True})


# ---------------------------------------------------------------------------
# Routes — Video Timeline job
# ---------------------------------------------------------------------------

@app.post("/api/jobs/start-script-timestamp")
async def jobs_start_script_timestamp(
    audio_file: UploadFile = File(...),
    model_name: str = Form("base"),
    language: str = Form("auto"),
    output_style: str = Form("standard"),
    segmentation_intensity: str = Form("detailed"),
    output_format: str = Form("simple"),
    original_script: Optional[str] = Form(None),
    target_segment_length: Optional[str] = Form(None),
    max_words_per_line: Optional[str] = Form(None),
    split_on_punctuation: Optional[bool] = Form(True),
    avoid_very_short_lines: Optional[bool] = Form(True)
):
    job_id = f"st_{uuid.uuid4().hex[:8]}"
    state = _new_job(job_id)

    job_temp = TEMP_DIR / job_id
    job_temp.mkdir(parents=True, exist_ok=True)
    state["temp_dir"] = str(job_temp)
    
    # Save uploaded file
    ext = Path(audio_file.filename).suffix.lower() if audio_file.filename else ".mp3"
    audio_path = str(job_temp / f"input{ext}")
    
    with open(audio_path, "wb") as f:
        f.write(await audio_file.read())

    def _worker():
        try:
            with _jobs_lock:
                state["status"] = "running"
                state["started_at"] = time.time()
                state["current_step"] = "Queued for transcription"
                state["progress"] = 0

            def _progress_cb(step: str, pct: int):
                with _jobs_lock:
                    if state["cancel_event"].is_set():
                        raise GenerationCancelled("Job cancelled by user.")
                    state["current_step"] = step
                    state["progress"] = pct

            advanced = {
                "target_segment_length": target_segment_length,
                "max_words_per_line": max_words_per_line,
                "split_on_punctuation": split_on_punctuation,
                "avoid_very_short_lines": avoid_very_short_lines
            }

            res = transcribe_audio_backend(
                audio_path=audio_path,
                model_name=model_name,
                language=language if language != "auto" else None,
                output_style=output_style,
                segmentation_intensity=segmentation_intensity,
                original_script=original_script,
                advanced_settings=advanced,
                progress_callback=_progress_cb
            )

            with _jobs_lock:
                state["current_step"] = "Formatting output…"
                state["progress"] = 98

            final_text = format_output(res["segments"], output_format)
            
            with _jobs_lock:
                state["status"] = "completed"
                state["progress"] = 100
                state["current_step"] = "Complete"
                state["finished_at"] = time.time()
                # Store results in timeline_report for now so frontend can read it via status
                state["timeline_report"] = [
                    {
                        "type": "script_timestamp_result",
                        "text": final_text,
                        "format": output_format,
                        "duration": res["duration"],
                        "language": res["language"],
                        "model": res["model"],
                        "segments_count": res["segments_count"]
                    }
                ]

        except GenerationCancelled as e:
            logger.info(f"Job {job_id} cancelled.")
            with _jobs_lock:
                state["status"] = "cancelled"
                state["current_step"] = str(e)
                state["finished_at"] = time.time()
        except Exception as e:
            logger.exception(f"Job {job_id} failed.")
            with _jobs_lock:
                state["status"] = "error"
                state["current_step"] = f"Error: {str(e)}"
                state["errors"].append(str(e))
                state["finished_at"] = time.time()
        finally:
            # Cleanup temp
            try:
                shutil.rmtree(state["temp_dir"], ignore_errors=True)
            except:
                pass

    threading.Thread(target=_worker, daemon=True).start()
    return JSONResponse(content={"job_id": job_id})


@app.post("/api/jobs/start-video-timeline")
async def jobs_start_video_timeline(
    # Audio — mode selector + two upload slots
    audio_input_mode: str = Form("single"),          # 'single' | 'zip'
    audio_file:       Optional[UploadFile] = File(None),
    audio_zip:        Optional[UploadFile] = File(None),
    audio_files:      Optional[List[UploadFile]] = File(None),
    # Required uploads
    videos_zip:   UploadFile = File(...),
    timeline_csv: UploadFile = File(...),
    # Optional uploads
    intro_file:   Optional[UploadFile] = File(None),
    outro_file:   Optional[UploadFile] = File(None),
    # Core settings
    aspect_ratio:      str = Form("9:16"),
    export_resolution: str = Form("1080p"),
    fit_mode:          str = Form("cover"),
    fill_mode:         str = Form("loop"),
    render_profile:    str = Form("balanced"),
    output_name:       Optional[str] = Form(None),
    # Batch 10C — styling
    transition:          str   = Form("none"),
    transition_duration: float = Form(0.5),
    visual_effect:       str   = Form("none"),
    effect_strength:     str   = Form("medium"),
    # Batch 10C — watermark
    watermark_text:          str   = Form(""),
    watermark_position_mode: str   = Form("preset"),
    watermark_coordinate_mode: str = Form("design_canvas"),
    watermark_position:      str   = Form("bottom_right"),
    watermark_x:             int   = Form(50),
    watermark_y:             int   = Form(50),
    watermark_opacity:       float = Form(0.65),
    watermark_size:          int   = Form(20),
    watermark_margin:        int   = Form(36),
    # Batch 12A — motion
    motion_style:            str   = Form("none"),
    motion_intensity:        str   = Form("medium"),
    # Background Music
    background_music_file:   Optional[UploadFile] = File(None),
    background_music_volume: float = Form(15.0),
    background_music_loop:   bool  = Form(True),
    background_music_fade:   bool  = Form(True),
):
    """
    Accept uploaded files and settings for Video Timeline mode (Batch 10B + 10C).
    Creates a background job; client polls GET /api/jobs/{job_id}/status.
    """
    # Validate
    if aspect_ratio not in VALID_ASPECT_RATIOS:
        raise HTTPException(400, f"Invalid aspect_ratio '{aspect_ratio}'.")
    if export_resolution not in VALID_EXPORT_RESOLUTIONS:
        raise HTTPException(400, f"Invalid export_resolution '{export_resolution}'.")
    if render_profile not in VALID_RENDER_PROFILES:
        raise HTTPException(400, f"Invalid render_profile '{render_profile}'.")
    fill_mode_safe = fill_mode if fill_mode in VALID_FILL_MODES else "loop"

    # Set up job temp dir
    job_id   = uuid.uuid4().hex
    job_temp = TEMP_DIR / job_id
    job_temp.mkdir(parents=True, exist_ok=True)

    # Save required uploads
    zip_path   = str(job_temp / "videos.zip")
    csv_path   = str(job_temp / "timeline.csv")

    for upload, dest in [
        (videos_zip, zip_path),
        (timeline_csv, csv_path),
    ]:
        content = await upload.read()
        with open(dest, "wb") as f:
            f.write(content)

    # ── Prepare main audio via shared helper ──────────────────────────────
    vt_mode = audio_input_mode.strip().lower()

    if vt_mode == "single" and audio_file is not None and audio_file.filename:
        try:
            audio_path, _audio_meta = prepare_single_audio(
                await audio_file.read(), audio_file.filename, job_temp
            )
        except ValueError as e:
            raise HTTPException(400, str(e))
    elif vt_mode == "zip" and audio_zip is not None and audio_zip.filename:
        try:
            audio_path, _audio_meta = prepare_zip_audio(
                await audio_zip.read(), job_temp
            )
        except ValueError as e:
            raise HTTPException(400, str(e))
    elif audio_files is not None and len(audio_files) > 0 and audio_files[0].filename:
        try:
            audio_path, _audio_meta = await prepare_multiple_audio(
                audio_files, job_temp
            )
        except ValueError as e:
            raise HTTPException(400, str(e))
    else:
        if vt_mode == "single":
            raise HTTPException(400, "Please upload a main audio file.")
        elif vt_mode == "zip":
            raise HTTPException(400, "Please upload an Audio Parts ZIP.")
        else:
            raise HTTPException(400, "Invalid audio input mode.")

    # Save optional intro/outro
    intro_path: Optional[str] = None
    outro_path: Optional[str] = None

    if intro_file and intro_file.filename:
        intro_ext  = Path(intro_file.filename).suffix or ".mp4"
        intro_path = str(job_temp / f"intro{intro_ext}")
        intro_data = await intro_file.read()
        if intro_data:
            with open(intro_path, "wb") as f:
                f.write(intro_data)
        else:
            intro_path = None

    if outro_file and outro_file.filename:
        outro_ext  = Path(outro_file.filename).suffix or ".mp4"
        outro_path = str(job_temp / f"outro{outro_ext}")
        outro_data = await outro_file.read()
        if outro_data:
            with open(outro_path, "wb") as f:
                f.write(outro_data)
        else:
            outro_path = None

    # Save optional background music
    bg_music_path: Optional[str] = None
    if background_music_file and background_music_file.filename:
        bg_ext = Path(background_music_file.filename).suffix or ".mp3"
        bg_music_path = str(job_temp / f"bg_music{bg_ext}")
        bg_data = await background_music_file.read()
        if bg_data:
            with open(bg_music_path, "wb") as f:
                f.write(bg_data)
        else:
            bg_music_path = None

    # Output filename
    safe_name       = output_name.strip() if output_name and output_name.strip() else "video_timeline"
    safe_name       = "".join(c for c in safe_name if c.isalnum() or c in "-_ ")
    safe_name       = safe_name.strip().replace(" ", "_") or "video_timeline"
    timestamp_str   = time.strftime("%Y%m%d_%H%M%S")
    output_filename = f"{safe_name}_{timestamp_str}.mp4"
    output_path     = str(OUTPUTS_DIR / output_filename)

    # Register job
    state = _new_job(job_id)
    state["temp_dir"]        = str(job_temp)
    state["output_filename"] = output_filename

    def run_job():
        with _jobs_lock:
            state["status"]       = "running"
            state["started_at"]   = time.time()
            state["current_step"] = "Starting video timeline job"
            state["progress"]     = 3

        def progress_callback(pct: int, step: str):
            with _jobs_lock:
                if state["status"] == "running":
                    state["progress"]     = pct
                    state["current_step"] = step

        try:
            result = generate_video_timeline(
                audio_path=audio_path,
                zip_path=zip_path,
                csv_path=csv_path,
                output_path=output_path,
                temp_dir=str(job_temp),
                aspect_ratio=aspect_ratio,
                export_resolution=export_resolution,
                fit_mode=fit_mode,
                fill_mode=fill_mode_safe,
                render_profile=render_profile,
                transition=transition,
                transition_duration=transition_duration,
                visual_effect=visual_effect,
                effect_strength=effect_strength,
                watermark_text=watermark_text,
                watermark_position_mode=watermark_position_mode,
                watermark_coordinate_mode=watermark_coordinate_mode,
                watermark_position=watermark_position,
                watermark_x=watermark_x,
                watermark_y=watermark_y,
                watermark_opacity=watermark_opacity,
                watermark_size=watermark_size,
                watermark_margin=watermark_margin,
                motion_style=motion_style,
                motion_intensity=motion_intensity,
                background_music_path=bg_music_path,
                background_music_volume=background_music_volume,
                background_music_loop=background_music_loop,
                background_music_fade=background_music_fade,
                intro_path=intro_path,
                outro_path=outro_path,
                cancel_event=state["cancel_event"],
                progress_callback=progress_callback,
            )

            timeline_report = _format_timeline(result.get("timeline", []))

            with _jobs_lock:
                state["warnings"]        = result.get("warnings", [])
                state["errors"]          = result.get("errors", [])
                state["timeline_report"] = timeline_report
                state["finished_at"]     = time.time()

                if result.get("cancelled"):
                    state["status"]       = "cancelled"
                    state["current_step"] = "Cancelled"
                    state["progress"]     = 0
                elif result["success"] and os.path.isfile(output_path):
                    if not _verify_mp4_audio(output_path):
                        state["status"]       = "failed"
                        state["current_step"] = "Failed"
                        state["errors"].append("Final video was created without an audio track. Please check the audio pipeline.")
                        logger.error(f"Job failed audio verification: {output_path}")
                    else:
                        state["status"]           = "completed"
                        state["current_step"]     = "Complete"
                        state["progress"]         = 100
                        state["output_video_url"] = f"/outputs/{output_filename}"
                        logger.info(f"Final MP4 audio stream verified: true")
                else:
                    state["status"]       = "failed"
                    state["current_step"] = "Failed"

        except VideoTimelineCancelled:
            with _jobs_lock:
                state["status"]       = "cancelled"
                state["current_step"] = "Cancelled"
                state["progress"]     = 0
                state["finished_at"]  = time.time()
            if os.path.isfile(output_path):
                try: os.remove(output_path)
                except Exception: pass

        except Exception as exc:
            logger.exception("Unhandled error in video timeline job %s", job_id)
            with _jobs_lock:
                state["status"]       = "failed"
                state["current_step"] = "Failed"
                state["errors"]       = [f"Internal server error: {str(exc)}"]
                state["finished_at"]  = time.time()

        finally:
            try:
                shutil.rmtree(str(job_temp), ignore_errors=True)
            except Exception:
                pass
            logger.info("Video timeline job %s finished → status=%s", job_id, state["status"])

    thread = threading.Thread(target=run_job, daemon=True, name=f"vtl-{job_id[:8]}")
    thread.start()

    logger.info("Video timeline job %s queued", job_id)
    return JSONResponse(content={"job_id": job_id})


# ---------------------------------------------------------------------------
# Route — Media Timeline (Batch 11B)
# ---------------------------------------------------------------------------

@app.post("/api/jobs/start-media-timeline")
async def jobs_start_media_timeline(
    # Audio — mode selector + two upload slots
    audio_input_mode: str = Form("single"),          # 'single' | 'zip'
    audio_file:       Optional[UploadFile] = File(None),
    audio_zip:        Optional[UploadFile] = File(None),
    audio_files:      Optional[List[UploadFile]] = File(None),
    # Required uploads
    media_zip:    UploadFile = File(...),
    timeline_csv: UploadFile = File(...),
    # Core settings
    aspect_ratio:      str = Form("9:16"),
    export_resolution: str = Form("1080p"),
    fit_mode:          str = Form("cover"),
    fill_mode:         str = Form("loop"),
    render_profile:    str = Form("balanced"),
    output_name:       Optional[str] = Form(None),
    # Batch 11C — Text Styling
    text_position:     str = Form("bottom_center"),
    text_size:         str = Form("medium"),
    text_color:        str = Form("white"),
    text_background:   str = Form("soft_shadow"),
    text_width:        str = Form("wide"),
    text_alignment:    str = Form("center"),
    # Batch 11D — Enhancements
    transition:              str   = Form("none"),
    transition_duration:     float = Form(0.5),
    visual_effect:           str   = Form("none"),
    effect_strength:         str   = Form("medium"),
    # Batch 11D — Watermark
    watermark_text:          str   = Form(""),
    watermark_position_mode: str   = Form("preset"),
    watermark_coordinate_mode: str = Form("design_canvas"),
    watermark_position:      str   = Form("bottom_right"),
    watermark_x:             int   = Form(50),
    watermark_y:             int   = Form(50),
    watermark_opacity:       float = Form(0.65),
    watermark_size:          int   = Form(20),
    watermark_margin:        int   = Form(36),
    # Batch 12A — motion
    motion_style:            str   = Form("none"),
    motion_intensity:        str   = Form("medium"),
    # Background Music
    background_music_file:   Optional[UploadFile] = File(None),
    background_music_volume: float = Form(15.0),
    background_music_loop:   bool  = Form(True),
    background_music_fade:   bool  = Form(True),
    # Batch 11D — Intro / Outro
    intro_file:              Optional[UploadFile] = File(None),
    outro_file:              Optional[UploadFile] = File(None),
):
    """
    Accept uploaded files and settings for Media Timeline mode (Batch 11B).
    Creates a background job; client polls GET /api/jobs/{job_id}/status.
    """
    # Validate
    if aspect_ratio not in VALID_ASPECT_RATIOS:
        raise HTTPException(400, f"Invalid aspect_ratio '{aspect_ratio}'.")
    if export_resolution not in VALID_EXPORT_RESOLUTIONS:
        raise HTTPException(400, f"Invalid export_resolution '{export_resolution}'.")
    if render_profile not in VALID_RENDER_PROFILES:
        raise HTTPException(400, f"Invalid render_profile '{render_profile}'.")
    fill_mode_safe = fill_mode if fill_mode in VALID_FILL_MODES else "loop"

    # Set up job temp dir
    job_id   = uuid.uuid4().hex
    job_temp = TEMP_DIR / job_id
    job_temp.mkdir(parents=True, exist_ok=True)

    # Save required uploads
    zip_path   = str(job_temp / "media.zip")
    csv_path   = str(job_temp / "timeline.csv")

    for upload, dest in [
        (media_zip, zip_path),
        (timeline_csv, csv_path),
    ]:
        content = await upload.read()
        with open(dest, "wb") as f:
            f.write(content)

    # ── Prepare main audio via shared helper ──────────────────────────────
    mt_mode = audio_input_mode.strip().lower()

    if mt_mode == "single" and audio_file is not None and audio_file.filename:
        try:
            audio_path, _audio_meta = prepare_single_audio(
                await audio_file.read(), audio_file.filename, job_temp
            )
        except ValueError as e:
            raise HTTPException(400, str(e))
    elif mt_mode == "zip" and audio_zip is not None and audio_zip.filename:
        try:
            audio_path, _audio_meta = prepare_zip_audio(
                await audio_zip.read(), job_temp
            )
        except ValueError as e:
            raise HTTPException(400, str(e))
    elif audio_files is not None and len(audio_files) > 0 and audio_files[0].filename:
        try:
            audio_path, _audio_meta = await prepare_multiple_audio(
                audio_files, job_temp
            )
        except ValueError as e:
            raise HTTPException(400, str(e))
    else:
        if mt_mode == "single":
            raise HTTPException(400, "Please upload a main audio file.")
        elif mt_mode == "zip":
            raise HTTPException(400, "Please upload an Audio Parts ZIP.")
        else:
            raise HTTPException(400, "Invalid audio input mode.")

    # Save optional intro/outro
    intro_path, outro_path = None, None
    if intro_file and intro_file.filename:
        intro_ext  = Path(intro_file.filename).suffix or ".mp4"
        intro_path = str(job_temp / f"intro{intro_ext}")
        with open(intro_path, "wb") as f:
            f.write(await intro_file.read())

    if outro_file and outro_file.filename:
        outro_ext  = Path(outro_file.filename).suffix or ".mp4"
        outro_path = str(job_temp / f"outro{outro_ext}")
        with open(outro_path, "wb") as f:
            f.write(await outro_file.read())

    # Save optional background music
    bg_music_path: Optional[str] = None
    if background_music_file and background_music_file.filename:
        bg_ext = Path(background_music_file.filename).suffix or ".mp3"
        bg_music_path = str(job_temp / f"bg_music{bg_ext}")
        bg_data = await background_music_file.read()
        if bg_data:
            with open(bg_music_path, "wb") as f:
                f.write(bg_data)
        else:
            bg_music_path = None

    # Output filename
    safe_name       = output_name.strip() if output_name and output_name.strip() else "media_timeline"
    safe_name       = "".join(c for c in safe_name if c.isalnum() or c in "-_ ")
    safe_name       = safe_name.strip().replace(" ", "_") or "media_timeline"
    timestamp_str   = time.strftime("%Y%m%d_%H%M%S")
    output_filename = f"{safe_name}_{timestamp_str}.mp4"
    output_path     = str(OUTPUTS_DIR / output_filename)

    # Register job
    state = _new_job(job_id)
    state["temp_dir"]        = str(job_temp)
    state["output_filename"] = output_filename

    def run_job():
        with _jobs_lock:
            state["status"]       = "running"
            state["started_at"]   = time.time()
            state["current_step"] = "Starting media timeline job"
            state["progress"]     = 3

        def progress_callback(pct: int, step: str):
            with _jobs_lock:
                if state["status"] == "running":
                    state["progress"]     = pct
                    state["current_step"] = step

        try:
            result = generate_media_timeline(
                audio_path=audio_path,
                zip_path=zip_path,
                csv_path=csv_path,
                output_path=output_path,
                temp_dir=str(job_temp),
                aspect_ratio=aspect_ratio,
                export_resolution=export_resolution,
                fit_mode=fit_mode,
                fill_mode=fill_mode_safe,
                render_profile=render_profile,
                text_position=text_position,
                text_size=text_size,
                text_color=text_color,
                text_background=text_background,
                text_width=text_width,
                text_alignment=text_alignment,
                transition=transition,
                transition_duration=transition_duration,
                visual_effect=visual_effect,
                effect_strength=effect_strength,
                watermark_text=watermark_text.strip(),
                watermark_position_mode=watermark_position_mode.strip().lower(),
                watermark_coordinate_mode=watermark_coordinate_mode.strip().lower(),
                watermark_position=watermark_position.lower().replace("-", "_"),
                watermark_x=int(watermark_x),
                watermark_y=int(watermark_y),
                watermark_opacity=max(0.0, min(1.0, float(watermark_opacity))),
                watermark_size=max(1, min(100, int(watermark_size))),
                watermark_margin=max(5, min(int(watermark_margin), 200)),
                motion_style=motion_style,
                motion_intensity=motion_intensity,
                background_music_path=bg_music_path,
                background_music_volume=background_music_volume,
                background_music_loop=background_music_loop,
                background_music_fade=background_music_fade,
                intro_path=intro_path,
                outro_path=outro_path,
                cancel_event=state["cancel_event"],
                progress_callback=progress_callback,
            )

            timeline_report = _format_timeline(result.get("timeline", []))

            with _jobs_lock:
                state["warnings"]        = result.get("warnings", [])
                state["errors"]          = result.get("errors", [])
                state["timeline_report"] = timeline_report
                state["finished_at"]     = time.time()

                if result.get("cancelled"):
                    state["status"]       = "cancelled"
                    state["current_step"] = "Cancelled"
                    state["progress"]     = 0
                elif result["success"] and os.path.isfile(output_path):
                    if not _verify_mp4_audio(output_path):
                        state["status"]       = "failed"
                        state["current_step"] = "Failed"
                        state["errors"].append("Final video was created without an audio track. Please check the audio pipeline.")
                        logger.error(f"Job failed audio verification: {output_path}")
                    else:
                        state["status"]           = "completed"
                        state["current_step"]     = "Complete"
                        state["progress"]         = 100
                        state["output_video_url"] = f"/outputs/{output_filename}"
                        logger.info(f"Final MP4 audio stream verified: true")
                else:
                    state["status"]       = "failed"
                    state["current_step"] = "Failed"

        except MediaTimelineCancelled:
            with _jobs_lock:
                state["status"]       = "cancelled"
                state["current_step"] = "Cancelled"
                state["progress"]     = 0
                state["finished_at"]  = time.time()
            if os.path.isfile(output_path):
                try: os.remove(output_path)
                except Exception: pass

        except Exception as exc:
            logger.exception("Unhandled error in media timeline job %s", job_id)
            with _jobs_lock:
                state["status"]       = "failed"
                state["current_step"] = "Failed"
                state["errors"]       = [f"Internal server error: {str(exc)}"]
                state["finished_at"]  = time.time()

        finally:
            try:
                shutil.rmtree(str(job_temp), ignore_errors=True)
            except Exception:
                pass
            logger.info("Media timeline job %s finished → status=%s", job_id, state["status"])

    thread = threading.Thread(target=run_job, daemon=True, name=f"mtl-{job_id[:8]}")
    thread.start()

    logger.info("Media timeline job %s queued", job_id)
    return JSONResponse(content={"job_id": job_id})


# ---------------------------------------------------------------------------
# Helper
# ---------------------------------------------------------------------------

def _format_timeline(rows: list[dict]) -> list[dict]:
    result = []
    for row in rows:
        result.append({
            "image":    row.get("image", ""),
            "start":    seconds_to_mmss(row.get("start", 0)),
            "end":      seconds_to_mmss(row.get("end", 0)),
            "duration": f"{row.get('duration', 0):.3f}s",
            "text":     row.get("text", ""),
            "status":   row.get("status", "ok"),
        })
    return result


# ---------------------------------------------------------------------------
# Routes — legacy synchronous generate (backward compat)
# ---------------------------------------------------------------------------

@app.post("/api/generate")
async def generate(
    audio_file:    UploadFile = File(...),
    images_zip:    UploadFile = File(...),
    timestamp_csv: UploadFile = File(...),
    video_format:  str   = Form("16:9"),
    fit_mode:      str   = Form("cover"),
    transition:    str   = Form("none"),
    zoom_effect:   str   = Form("none"),
    output_name:   Optional[str] = Form(None),
):
    """
    Legacy synchronous endpoint — kept for backward compatibility.
    Uses 1080p resolution and balanced profile.
    New clients should use POST /api/jobs/start for full Batch 3 features.
    """
    job_id   = uuid.uuid4().hex
    job_temp = TEMP_DIR / job_id
    job_temp.mkdir(parents=True, exist_ok=True)
    start_ts = time.time()
    logger.info("Starting legacy job %s", job_id)

    try:
        audio_ext  = Path(audio_file.filename).suffix if audio_file.filename else ".mp3"
        audio_path = str(job_temp / f"audio{audio_ext}")
        zip_path   = str(job_temp / "images.zip")
        csv_path   = str(job_temp / "timestamps.csv")

        for upload, dest in [(audio_file, audio_path), (images_zip, zip_path), (timestamp_csv, csv_path)]:
            content = await upload.read()
            with open(dest, "wb") as f:
                f.write(content)

        safe_name       = output_name.strip() if output_name and output_name.strip() else "video"
        safe_name       = "".join(c for c in safe_name if c.isalnum() or c in "-_ ")
        safe_name       = safe_name.strip().replace(" ", "_") or "video"
        timestamp_str   = time.strftime("%Y%m%d_%H%M%S")
        output_filename = f"{safe_name}_{timestamp_str}.mp4"
        output_path     = str(OUTPUTS_DIR / output_filename)

        # Map old video_format → aspect_ratio; always use 1080p
        aspect = video_format if video_format in ("9:16", "16:9", "1:1") else "16:9"

        result = generate_video(
            audio_path=audio_path,
            zip_path=zip_path,
            csv_path=csv_path,
            output_path=output_path,
            temp_dir=str(job_temp),
            aspect_ratio=aspect,
            export_resolution="1080p",
            fit_mode=fit_mode,
            transition=transition,
            zoom_effect=zoom_effect,
            render_profile="balanced",
        )

        elapsed = round(time.time() - start_ts, 2)
        logger.info("Legacy job %s finished in %.2fs  success=%s", job_id, elapsed, result["success"])

        timeline_report = _format_timeline(result.get("timeline", []))

        response: dict = {
            "success":          result["success"],
            "job_id":           job_id,
            "elapsed_seconds":  elapsed,
            "timeline_report":  timeline_report,
            "warnings":         result.get("warnings", []),
            "errors":           result.get("errors", []),
        }
        if result["success"] and os.path.isfile(output_path):
            response["output_video_url"]  = f"/outputs/{output_filename}"
            response["output_filename"]   = output_filename
        else:
            response["output_video_url"]  = None
            response["output_filename"]   = None

        return JSONResponse(content=response)

    except Exception as e:
        logger.exception("Unhandled error in legacy job %s", job_id)
        return JSONResponse(
            status_code=500,
            content={"success": False, "errors": [f"Internal server error: {str(e)}"], "warnings": [], "timeline_report": []},
        )
    finally:
        try:
            shutil.rmtree(str(job_temp), ignore_errors=True)
        except Exception:
            pass



# ---------------------------------------------------------------------------
# Audio Merger Route
# ---------------------------------------------------------------------------

@app.post("/api/tools/audio-merge")
async def audio_merge(
    audio_parts: List[UploadFile] = File(...),
    output_format: str = Form("wav"),
    output_filename: str = Form("merged_audio")
):
    import time
    job_id = f"audio_merge_{uuid.uuid4().hex[:8]}"
    job_temp = TEMP_DIR / job_id
    job_temp.mkdir(parents=True, exist_ok=True)
    
    try:
        # Save parts in exact array order
        audio_paths = []
        for i, part in enumerate(audio_parts):
            content = await part.read()
            ext = Path(part.filename).suffix.lower() if part.filename else ".mp3"
            if ext not in {".mp3", ".wav", ".m4a", ".aac"}:
                ext = ".mp3"
            
            # Save safely
            part_path = str(job_temp / f"part_{i:03d}{ext}")
            with open(part_path, "wb") as f:
                f.write(content)
            audio_paths.append(part_path)
            
        safe_name = output_filename.strip() if output_filename and output_filename.strip() else "merged_audio"
        safe_name = "".join(c for c in safe_name if c.isalnum() or c in "-_ ")
        safe_name = safe_name.strip().replace(" ", "_") or "merged_audio"
        
        fmt = "wav" if output_format.lower() == "wav" else "mp3"
        timestamp_str = time.strftime("%Y%m%d_%H%M%S")
        final_filename = f"{safe_name}_{timestamp_str}.{fmt}"
        
        output_dir = OUTPUTS_DIR / "audio"
        output_dir.mkdir(exist_ok=True)
        final_path = str(output_dir / final_filename)
        
        duration, meta = merge_audio_parts_in_order(audio_paths, final_path, fmt)
        
        return JSONResponse({
            "url": f"/outputs/audio/{final_filename}",
            "filename": final_filename,
            "duration": duration,
            "parts_merged": meta["parts_merged"],
            "output_format": fmt.upper()
        })
        
    except Exception as e:
        logger.exception(f"Audio merge failed for {job_id}")
        return JSONResponse(status_code=500, content={"detail": str(e)})
    finally:
        try:
            shutil.rmtree(str(job_temp), ignore_errors=True)
        except:
            pass

@app.get("/outputs/{path:path}")
async def serve_output(path: str):
    import mimetypes
    file_path = OUTPUTS_DIR / path
    if not file_path.is_file():
        raise HTTPException(status_code=404, detail="File not found")
        
    mime_type, _ = mimetypes.guess_type(str(file_path))
    if not mime_type:
        mime_type = "video/mp4" if path.endswith(".mp4") else "audio/wav"
        
    return FileResponse(str(file_path), media_type=mime_type)
