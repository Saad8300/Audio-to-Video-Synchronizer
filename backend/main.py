"""
main.py - FastAPI backend for Audio Image Sync Studio
Handles file uploads, triggers video generation, and serves outputs.
Batch 2: optional outro video and background music.
Batch 3: export resolution, render profiles, watermark.
"""

import os
import uuid
import shutil
import logging
import time
import threading
from pathlib import Path
from typing import Optional

from fastapi import FastAPI, File, Form, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles

from video_generator import generate_video, GenerationCancelled
from video_timeline_generator import generate_video_timeline, VideoTimelineCancelled
from utils import seconds_to_mmss, FORMAT_DIMENSIONS

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
    # Required uploads
    audio_file:      UploadFile = File(...),
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
    audio_ext   = Path(audio_file.filename).suffix if audio_file.filename else ".mp3"
    audio_path  = str(job_temp / f"audio{audio_ext}")
    zip_path    = str(job_temp / "images.zip")
    csv_path    = str(job_temp / "timestamps.csv")

    for upload, dest in [(audio_file, audio_path), (images_zip, zip_path), (timestamp_csv, csv_path)]:
        content = await upload.read()
        with open(dest, "wb") as f:
            f.write(content)

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
                    state["status"]            = "completed"
                    state["current_step"]      = "Complete"
                    state["progress"]          = 100
                    state["output_video_url"]  = f"/outputs/{output_filename}"
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

@app.post("/api/jobs/start-video-timeline")
async def jobs_start_video_timeline(
    # Required uploads
    audio_file:   UploadFile = File(...),
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
    watermark_position:      str   = Form("bottom_right"),
    watermark_x:             int   = Form(50),
    watermark_y:             int   = Form(50),
    watermark_opacity:       float = Form(0.65),
    watermark_size:          int   = Form(20),
    watermark_margin:        int   = Form(36),
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
    audio_ext  = Path(audio_file.filename).suffix if audio_file.filename else ".mp3"
    audio_path = str(job_temp / f"audio{audio_ext}")
    zip_path   = str(job_temp / "videos.zip")
    csv_path   = str(job_temp / "timeline.csv")

    for upload, dest in [
        (audio_file, audio_path),
        (videos_zip, zip_path),
        (timeline_csv, csv_path),
    ]:
        content = await upload.read()
        with open(dest, "wb") as f:
            f.write(content)

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
                watermark_position=watermark_position,
                watermark_x=watermark_x,
                watermark_y=watermark_y,
                watermark_opacity=watermark_opacity,
                watermark_size=watermark_size,
                watermark_margin=watermark_margin,
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
                    state["status"]           = "completed"
                    state["current_step"]     = "Complete"
                    state["progress"]         = 100
                    state["output_video_url"] = f"/outputs/{output_filename}"
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


@app.get("/outputs/{filename}")
async def serve_output(filename: str):
    file_path = OUTPUTS_DIR / filename
    if not file_path.is_file():
        raise HTTPException(status_code=404, detail="File not found")
    return FileResponse(str(file_path), media_type="video/mp4")
