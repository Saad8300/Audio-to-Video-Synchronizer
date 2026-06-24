"""
main.py - FastAPI backend for Audio Image Sync Studio
Handles file uploads, triggers video generation, and serves outputs.
Batch 2: optional outro video and background music.
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
from utils import seconds_to_mmss

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------

BASE_DIR = Path(__file__).parent
UPLOADS_DIR = BASE_DIR / "uploads"
OUTPUTS_DIR = BASE_DIR / "outputs"
TEMP_DIR = BASE_DIR / "temp"

for d in [UPLOADS_DIR, OUTPUTS_DIR, TEMP_DIR]:
    d.mkdir(exist_ok=True)

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  %(levelname)s  %(name)s  %(message)s",
)
logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Allowed file types for optional uploads
# ---------------------------------------------------------------------------

ALLOWED_OUTRO_EXTS = {".mp4", ".mov", ".webm"}
ALLOWED_MUSIC_EXTS = {".mp3", ".wav", ".m4a", ".aac"}

# ---------------------------------------------------------------------------
# In-memory job registry
# ---------------------------------------------------------------------------

# job_id → dict with all job state
_jobs: dict[str, dict] = {}
_jobs_lock = threading.Lock()


def _new_job(job_id: str) -> dict:
    """Create and store a fresh job entry."""
    state = {
        "job_id": job_id,
        "status": "queued",       # queued | running | completed | failed | cancelled
        "progress": 0,
        "current_step": "Queued",
        "started_at": None,
        "finished_at": None,
        "warnings": [],
        "errors": [],
        "output_video_url": None,
        "output_filename": None,
        "timeline_report": [],
        "cancel_event": threading.Event(),
        "temp_dir": None,
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
    version="1.2.0",
)

# Allow local frontend dev server
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

# Serve generated MP4 files
app.mount("/outputs", StaticFiles(directory=str(OUTPUTS_DIR)), name="outputs")


# ---------------------------------------------------------------------------
# Routes — health
# ---------------------------------------------------------------------------

@app.get("/api/health")
async def health_check():
    """Health-check endpoint."""
    return {
        "status": "ok",
        "service": "Audio Image Sync Studio",
        "version": "1.2.0",
    }


# ---------------------------------------------------------------------------
# Routes — job system
# ---------------------------------------------------------------------------

@app.post("/api/jobs/start")
async def jobs_start(
    # Required uploads
    audio_file: UploadFile = File(...),
    images_zip: UploadFile = File(...),
    timestamp_csv: UploadFile = File(...),
    # Required settings
    video_format: str = Form("16:9"),
    fit_mode: str = Form("cover"),
    transition: str = Form("none"),
    zoom_effect: str = Form("none"),
    output_name: Optional[str] = Form(None),
    # Batch 2 — optional outro
    outro_file: Optional[UploadFile] = File(None),
    # Batch 2 — optional background music
    bg_music_file: Optional[UploadFile] = File(None),
    enable_bg_music: str = Form("false"),   # "true" | "false"
    music_volume: float = Form(0.12),       # 0.0–1.0 (frontend divides by 100)
    music_fade: str = Form("true"),         # "true" | "false"
):
    """
    Accept uploaded files, create a background job, return {job_id} immediately.
    The client should poll GET /api/jobs/{job_id}/status for updates.
    """

    # ── Validate optional file types ────────────────────────────────────────
    if outro_file is not None and outro_file.filename:
        ext = Path(outro_file.filename).suffix.lower()
        if ext not in ALLOWED_OUTRO_EXTS:
            raise HTTPException(
                status_code=400,
                detail=f"Unsupported outro file type '{ext}'. Allowed: {', '.join(sorted(ALLOWED_OUTRO_EXTS))}",
            )

    if bg_music_file is not None and bg_music_file.filename:
        ext = Path(bg_music_file.filename).suffix.lower()
        if ext not in ALLOWED_MUSIC_EXTS:
            raise HTTPException(
                status_code=400,
                detail=f"Unsupported music file type '{ext}'. Allowed: {', '.join(sorted(ALLOWED_MUSIC_EXTS))}",
            )

    # ── Normalise settings ───────────────────────────────────────────────────
    enable_music_bool = enable_bg_music.strip().lower() == "true"
    music_fade_bool = music_fade.strip().lower() == "true"
    music_volume_clamped = max(0.0, min(1.0, float(music_volume)))

    job_id = uuid.uuid4().hex
    job_temp = TEMP_DIR / job_id
    job_temp.mkdir(parents=True, exist_ok=True)

    # Save required uploads to temp
    audio_ext = Path(audio_file.filename).suffix if audio_file.filename else ".mp3"
    audio_path = str(job_temp / f"audio{audio_ext}")
    zip_path = str(job_temp / "images.zip")
    csv_path = str(job_temp / "timestamps.csv")

    for upload, dest in [
        (audio_file, audio_path),
        (images_zip, zip_path),
        (timestamp_csv, csv_path),
    ]:
        content = await upload.read()
        with open(dest, "wb") as f:
            f.write(content)

    # Save optional uploads to temp
    outro_path: Optional[str] = None
    if outro_file is not None and outro_file.filename:
        outro_ext = Path(outro_file.filename).suffix.lower()
        outro_path = str(job_temp / f"outro{outro_ext}")
        content = await outro_file.read()
        with open(outro_path, "wb") as f:
            f.write(content)

    bg_music_path: Optional[str] = None
    if bg_music_file is not None and bg_music_file.filename:
        music_ext = Path(bg_music_file.filename).suffix.lower()
        bg_music_path = str(job_temp / f"bgmusic{music_ext}")
        content = await bg_music_file.read()
        with open(bg_music_path, "wb") as f:
            f.write(content)

    # Determine output filename
    safe_name = output_name.strip() if output_name and output_name.strip() else "video"
    safe_name = "".join(c for c in safe_name if c.isalnum() or c in "-_ ")
    safe_name = safe_name.strip().replace(" ", "_") or "video"
    timestamp_str = time.strftime("%Y%m%d_%H%M%S")
    output_filename = f"{safe_name}_{timestamp_str}.mp4"
    output_path = str(OUTPUTS_DIR / output_filename)

    # Register job
    state = _new_job(job_id)
    state["temp_dir"] = str(job_temp)
    state["output_filename"] = output_filename

    # Launch background thread
    def run_job():
        with _jobs_lock:
            state["status"] = "running"
            state["started_at"] = time.time()
            state["current_step"] = "Preparing job"
            state["progress"] = 5

        def progress_callback(pct: int, step: str):
            with _jobs_lock:
                if state["status"] == "running":
                    state["progress"] = pct
                    state["current_step"] = step

        try:
            result = generate_video(
                audio_path=audio_path,
                zip_path=zip_path,
                csv_path=csv_path,
                output_path=output_path,
                temp_dir=str(job_temp),
                video_format=video_format,
                fit_mode=fit_mode,
                transition=transition,
                zoom_effect=zoom_effect,
                # Batch 2 params
                outro_path=outro_path,
                bg_music_path=bg_music_path,
                enable_bg_music=enable_music_bool,
                music_volume=music_volume_clamped,
                music_fade=music_fade_bool,
                # Infra
                cancel_event=state["cancel_event"],
                progress_callback=progress_callback,
            )

            # Format timeline
            timeline_report = []
            for row in result.get("timeline", []):
                timeline_report.append({
                    "image": row.get("image", ""),
                    "start": seconds_to_mmss(row.get("start", 0)),
                    "end": seconds_to_mmss(row.get("end", 0)),
                    "duration": f"{row.get('duration', 0):.3f}s",
                    "text": row.get("text", ""),
                    "status": row.get("status", "ok"),
                })

            with _jobs_lock:
                state["warnings"] = result.get("warnings", [])
                state["errors"] = result.get("errors", [])
                state["timeline_report"] = timeline_report
                state["finished_at"] = time.time()

                if result.get("cancelled"):
                    state["status"] = "cancelled"
                    state["current_step"] = "Cancelled"
                    state["progress"] = 0
                elif result["success"] and os.path.isfile(output_path):
                    state["status"] = "completed"
                    state["current_step"] = "Complete"
                    state["progress"] = 100
                    state["output_video_url"] = f"/outputs/{output_filename}"
                else:
                    state["status"] = "failed"
                    state["current_step"] = "Failed"

        except GenerationCancelled:
            with _jobs_lock:
                state["status"] = "cancelled"
                state["current_step"] = "Cancelled"
                state["progress"] = 0
                state["finished_at"] = time.time()
            # Clean partial output
            if os.path.isfile(output_path):
                try:
                    os.remove(output_path)
                except Exception:
                    pass

        except Exception as exc:
            logger.exception("Unhandled error in job %s", job_id)
            with _jobs_lock:
                state["status"] = "failed"
                state["current_step"] = "Failed"
                state["errors"] = [f"Internal server error: {str(exc)}"]
                state["finished_at"] = time.time()

        finally:
            # Clean temp files
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
    """
    Poll job status. Returns:
        status, progress, current_step, elapsed_seconds,
        estimated_remaining_seconds, warnings, errors,
        output_video_url, timeline_report
    """
    state = _get_job(job_id)
    if state is None:
        raise HTTPException(status_code=404, detail="Job not found")

    with _jobs_lock:
        started_at = state["started_at"]
        finished_at = state["finished_at"]
        progress = state["progress"]
        status = state["status"]

    now = time.time()
    elapsed = round((finished_at or now) - started_at, 1) if started_at else 0.0

    # Estimate remaining time from elapsed + progress
    estimated_remaining: Optional[float] = None
    if started_at and progress and progress > 0 and status == "running":
        elapsed_so_far = now - started_at
        estimated_total = elapsed_so_far / (progress / 100.0)
        estimated_remaining = round(max(estimated_total - elapsed_so_far, 0), 1)

    with _jobs_lock:
        return JSONResponse(content={
            "job_id": job_id,
            "status": state["status"],
            "progress": state["progress"],
            "current_step": state["current_step"],
            "elapsed_seconds": elapsed,
            "estimated_remaining_seconds": estimated_remaining,
            "warnings": state["warnings"],
            "errors": state["errors"],
            "output_video_url": state["output_video_url"],
            "output_filename": state["output_filename"],
            "timeline_report": state["timeline_report"],
        })


@app.post("/api/jobs/{job_id}/cancel")
async def jobs_cancel(job_id: str):
    """Request cancellation of a running job."""
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
# Routes — legacy synchronous generate (backward compat)
# ---------------------------------------------------------------------------

@app.post("/api/generate")
async def generate(
    audio_file: UploadFile = File(...),
    images_zip: UploadFile = File(...),
    timestamp_csv: UploadFile = File(...),
    video_format: str = Form("16:9"),
    fit_mode: str = Form("cover"),
    transition: str = Form("none"),
    zoom_effect: str = Form("none"),
    output_name: Optional[str] = Form(None),
):
    """
    Legacy synchronous endpoint — kept for backward compatibility.
    New clients should use POST /api/jobs/start instead.
    Note: Batch 2 features (outro, background music) are not available
    via this endpoint. Use /api/jobs/start for full functionality.
    """
    job_id = uuid.uuid4().hex
    job_temp = TEMP_DIR / job_id
    job_temp.mkdir(parents=True, exist_ok=True)

    logger.info("Starting legacy job %s", job_id)
    start_ts = time.time()

    try:
        # Save uploads to temp
        audio_ext = Path(audio_file.filename).suffix if audio_file.filename else ".mp3"
        audio_path = str(job_temp / f"audio{audio_ext}")
        zip_path = str(job_temp / "images.zip")
        csv_path = str(job_temp / "timestamps.csv")

        for upload, dest in [
            (audio_file, audio_path),
            (images_zip, zip_path),
            (timestamp_csv, csv_path),
        ]:
            content = await upload.read()
            with open(dest, "wb") as f:
                f.write(content)

        # Determine output filename
        safe_name = output_name.strip() if output_name and output_name.strip() else "video"
        safe_name = "".join(c for c in safe_name if c.isalnum() or c in "-_ ")
        safe_name = safe_name.strip().replace(" ", "_") or "video"
        timestamp_str = time.strftime("%Y%m%d_%H%M%S")
        output_filename = f"{safe_name}_{timestamp_str}.mp4"
        output_path = str(OUTPUTS_DIR / output_filename)

        result = generate_video(
            audio_path=audio_path,
            zip_path=zip_path,
            csv_path=csv_path,
            output_path=output_path,
            temp_dir=str(job_temp),
            video_format=video_format,
            fit_mode=fit_mode,
            transition=transition,
            zoom_effect=zoom_effect,
        )

        elapsed = round(time.time() - start_ts, 2)
        logger.info("Legacy job %s finished in %.2fs  success=%s", job_id, elapsed, result["success"])

        # Format timeline for response
        timeline_report = []
        for row in result.get("timeline", []):
            timeline_report.append({
                "image": row.get("image", ""),
                "start": seconds_to_mmss(row.get("start", 0)),
                "end": seconds_to_mmss(row.get("end", 0)),
                "duration": f"{row.get('duration', 0):.3f}s",
                "text": row.get("text", ""),
                "status": row.get("status", "ok"),
            })

        response: dict = {
            "success": result["success"],
            "job_id": job_id,
            "elapsed_seconds": elapsed,
            "timeline_report": timeline_report,
            "warnings": result.get("warnings", []),
            "errors": result.get("errors", []),
        }

        if result["success"] and os.path.isfile(output_path):
            response["output_video_url"] = f"/outputs/{output_filename}"
            response["output_filename"] = output_filename
        else:
            response["output_video_url"] = None
            response["output_filename"] = None

        return JSONResponse(content=response)

    except Exception as e:
        logger.exception("Unhandled error in legacy job %s", job_id)
        return JSONResponse(
            status_code=500,
            content={
                "success": False,
                "errors": [f"Internal server error: {str(e)}"],
                "warnings": [],
                "timeline_report": [],
            },
        )

    finally:
        try:
            shutil.rmtree(str(job_temp), ignore_errors=True)
            logger.info("Cleaned temp dir for legacy job %s", job_id)
        except Exception:
            pass


@app.get("/outputs/{filename}")
async def serve_output(filename: str):
    """Serve a generated MP4 file."""
    file_path = OUTPUTS_DIR / filename
    if not file_path.is_file():
        raise HTTPException(status_code=404, detail="File not found")
    return FileResponse(str(file_path), media_type="video/mp4")
