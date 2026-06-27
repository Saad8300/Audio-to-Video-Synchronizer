import re
from pathlib import Path

main_path = Path("backend/main.py")
content = main_path.read_text()

# Add import for transcription helpers
import_block = """from audio_helpers import prepare_single_audio, prepare_zip_audio, merge_audio_parts_in_order
from transcription_helpers import transcribe_audio_backend, format_output"""
content = content.replace("from audio_helpers import prepare_single_audio, prepare_zip_audio, merge_audio_parts_in_order", import_block)


# Add the new route right before @app.post("/api/jobs/start-video-timeline")
route_code = """@app.post("/api/jobs/start-script-timestamp")
async def jobs_start_script_timestamp(
    audio_file: UploadFile = File(...),
    model_name: str = Form("base"),
    language: str = Form("auto"),
    output_style: str = Form("standard"),
    segmentation_intensity: str = Form("detailed"),
    output_format: str = Form("simple")
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

            res = transcribe_audio_backend(
                audio_path=audio_path,
                model_name=model_name,
                language=language if language != "auto" else None,
                output_style=output_style,
                segmentation_intensity=segmentation_intensity,
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

"""

content = content.replace('@app.post("/api/jobs/start-video-timeline")', route_code + '\n@app.post("/api/jobs/start-video-timeline")')

main_path.write_text(content)
print("backend/main.py updated")
