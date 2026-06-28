import json
import os
import time
import shutil
import uuid
from datetime import datetime
from pathlib import Path
from typing import Dict, Any, List, Optional
import logging

logger = logging.getLogger(__name__)

# Base directories
BASE_DIR = Path(__file__).resolve().parent
DATA_DIR = BASE_DIR / "data" / "batch_jobs"
QUEUE_FILE = DATA_DIR / "queue.json"

def _ensure_data_dir():
    DATA_DIR.mkdir(parents=True, exist_ok=True)

def _load_queue() -> List[Dict[str, Any]]:
    _ensure_data_dir()
    if not QUEUE_FILE.exists():
        return []
    
    try:
        with open(QUEUE_FILE, "r", encoding="utf-8") as f:
            data = json.load(f)
            if not isinstance(data, list):
                raise ValueError("Queue JSON root must be a list")
            return data
    except Exception as e:
        logger.error(f"Error loading queue.json: {e}")
        # Backup corrupted file
        backup_path = QUEUE_FILE.with_suffix(f".corrupt.{int(time.time())}.json")
        try:
            shutil.copy2(QUEUE_FILE, backup_path)
            logger.info(f"Backed up corrupted queue file to {backup_path}")
        except Exception:
            pass
        return []

def _save_queue(records: List[Dict[str, Any]]):
    _ensure_data_dir()
    # Write to a temp file first, then replace for atomicity
    temp_file = QUEUE_FILE.with_suffix(".tmp")
    try:
        with open(temp_file, "w", encoding="utf-8") as f:
            json.dump(records, f, indent=2)
        os.replace(temp_file, QUEUE_FILE)
    except Exception as e:
        logger.error(f"Failed to save queue: {e}")
        try:
            if temp_file.exists():
                os.remove(temp_file)
        except:
            pass

def get_all_jobs() -> List[Dict[str, Any]]:
    """Returns all jobs. For queue logic, might return in creation order."""
    return _load_queue()

def get_job(job_id: str) -> Optional[Dict[str, Any]]:
    records = _load_queue()
    for r in records:
        if r.get("id") == job_id:
            return r
    return None

def add_job(
    source_tool: str,
    source_tool_label: str,
    title: str,
    output_name: str,
    output_type: str = "video",
    export_preset: str = "",
    aspect_ratio: str = "",
    resolution: str = "",
    render_profile: str = "",
    config: Optional[Dict[str, Any]] = None,
    assets: Optional[Dict[str, Any]] = None,
    metadata: Optional[Dict[str, Any]] = None
) -> Dict[str, Any]:
    
    now = datetime.utcnow().isoformat() + "Z"
    
    record = {
        "id": f"batch_{uuid.uuid4().hex[:12]}",
        "created_at": now,
        "updated_at": now,
        "source_tool": source_tool,
        "source_tool_label": source_tool_label,
        "title": title,
        "output_name": output_name,
        "output_type": output_type,
        "status": "queued",
        "progress": 0,
        "message": "Waiting in queue",
        "export_preset": export_preset,
        "aspect_ratio": aspect_ratio,
        "resolution": resolution,
        "render_profile": render_profile,
        "output_url": None,
        "file_extension": "mp4",
        "duration_seconds": None,
        "file_size_bytes": None,
        "error": None,
        "config": config or {},
        "assets": assets or {},
        "metadata": metadata or {}
    }
    
    records = _load_queue()
    records.append(record)
    _save_queue(records)
    return record

def update_job(job_id: str, updates: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    records = _load_queue()
    for r in records:
        if r.get("id") == job_id:
            r.update(updates)
            r["updated_at"] = datetime.utcnow().isoformat() + "Z"
            _save_queue(records)
            return r
    return None

def delete_job(job_id: str) -> bool:
    records = _load_queue()
    initial_count = len(records)
    records = [r for r in records if r.get("id") != job_id]
    if len(records) < initial_count:
        _save_queue(records)
        return True
    return False

def clear_completed_jobs() -> int:
    records = _load_queue()
    initial_count = len(records)
    records = [r for r in records if r.get("status") not in ["completed", "failed", "cancelled"]]
    cleared = initial_count - len(records)
    if cleared > 0:
        _save_queue(records)
    return cleared

def clear_all_jobs() -> int:
    records = _load_queue()
    count = len(records)
    if count > 0:
        _save_queue([])
    return count

def get_stats() -> Dict[str, Any]:
    records = _load_queue()
    
    stats = {
        "total": len(records),
        "queued": 0,
        "running": 0,
        "completed": 0,
        "failed": 0,
        "cancelled": 0
    }
    
    for r in records:
        status = r.get("status", "unknown")
        if status in stats:
            stats[status] += 1
            
    return stats
