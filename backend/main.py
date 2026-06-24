"""
main.py - FastAPI backend for Audio Image Sync Studio
Handles file uploads, triggers video generation, and serves outputs.
"""

import os
import uuid
import shutil
import logging
import time
from pathlib import Path
from typing import Optional

from fastapi import FastAPI, File, Form, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles

from video_generator import generate_video
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
# FastAPI app
# ---------------------------------------------------------------------------

app = FastAPI(
    title="Audio Image Sync Studio",
    description="Generate perfectly timed videos from audio, ordered images, and timestamps.",
    version="1.0.0",
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
# Routes
# ---------------------------------------------------------------------------

@app.get("/api/health")
async def health_check():
    """Health-check endpoint."""
    return {
        "status": "ok",
        "service": "Audio Image Sync Studio",
        "version": "1.0.0",
    }


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
    Accept uploaded files and settings, generate an MP4, return JSON result.
    """
    job_id = uuid.uuid4().hex
    job_temp = TEMP_DIR / job_id
    job_temp.mkdir(parents=True, exist_ok=True)

    logger.info("Starting job %s", job_id)
    start_ts = time.time()

    try:
        # ----------------------------------------------------------------
        # Save uploads to temp
        # ----------------------------------------------------------------
        audio_path = str(job_temp / f"audio{Path(audio_file.filename).suffix}")
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

        # ----------------------------------------------------------------
        # Determine output filename
        # ----------------------------------------------------------------
        safe_name = output_name.strip() if output_name and output_name.strip() else "video"
        # Strip disallowed filesystem characters
        safe_name = "".join(c for c in safe_name if c.isalnum() or c in "-_ ")
        safe_name = safe_name.strip().replace(" ", "_") or "video"
        timestamp_str = time.strftime("%Y%m%d_%H%M%S")
        output_filename = f"{safe_name}_{timestamp_str}.mp4"
        output_path = str(OUTPUTS_DIR / output_filename)

        # ----------------------------------------------------------------
        # Generate video
        # ----------------------------------------------------------------
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
        logger.info("Job %s finished in %.2fs  success=%s", job_id, elapsed, result["success"])

        # ----------------------------------------------------------------
        # Format timeline for response
        # ----------------------------------------------------------------
        timeline_report = []
        for row in result.get("timeline", []):
            timeline_report.append(
                {
                    "image": row.get("image", ""),
                    "start": seconds_to_mmss(row.get("start", 0)),
                    "end": seconds_to_mmss(row.get("end", 0)),
                    "duration": f"{row.get('duration', 0):.3f}s",
                    "text": row.get("text", ""),
                    "status": row.get("status", "ok"),
                }
            )

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
        logger.exception("Unhandled error in job %s", job_id)
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
        # Clean up temp files after generation
        try:
            shutil.rmtree(str(job_temp), ignore_errors=True)
            logger.info("Cleaned temp dir for job %s", job_id)
        except Exception:
            pass


@app.get("/outputs/{filename}")
async def serve_output(filename: str):
    """Serve a generated MP4 file."""
    file_path = OUTPUTS_DIR / filename
    if not file_path.is_file():
        raise HTTPException(status_code=404, detail="File not found")
    return FileResponse(str(file_path), media_type="video/mp4")
