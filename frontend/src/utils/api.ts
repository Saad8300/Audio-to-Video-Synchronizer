// utils/api.ts – API client for Audio Image Sync Studio backend

import type { GenerateResponse, GenerateSettings, JobStatus } from '../types'

const BASE_URL = '' // Vite dev proxy handles /api → http://127.0.0.1:8000

export async function checkHealth(): Promise<boolean> {
  try {
    const res = await fetch(`${BASE_URL}/api/health`, { signal: AbortSignal.timeout(5000) })
    return res.ok
  } catch {
    return false
  }
}

// ---------------------------------------------------------------------------
// Job-based API (preferred)
// ---------------------------------------------------------------------------

/**
 * Start a background generation job.
 * Returns immediately with a job_id; poll getJobStatus() for updates.
 *
 * @param outroFile   Optional outro video to append (mp4/mov/webm)
 * @param bgMusicFile Optional background music (mp3/wav/m4a/aac)
 */
export async function startJob(
  audioFile: File,
  imagesZip: File,
  timestampCsv: File,
  settings: GenerateSettings,
  outroFile?: File | null,
  bgMusicFile?: File | null,
): Promise<{ job_id: string }> {
  const form = new FormData()

  // Required fields
  form.append('audio_file', audioFile)
  form.append('images_zip', imagesZip)
  form.append('timestamp_csv', timestampCsv)
  form.append('video_format', settings.videoFormat)
  form.append('fit_mode', settings.fitMode)
  form.append('transition', settings.transition)
  form.append('zoom_effect', settings.zoomEffect)
  form.append('output_name', settings.outputName || 'video')

  // Batch 2 — background music
  form.append('enable_bg_music', settings.enableBgMusic ? 'true' : 'false')
  form.append('music_volume', (settings.musicVolume / 100).toFixed(4))
  form.append('music_fade', settings.musicFade ? 'true' : 'false')

  // Batch 2 — optional file uploads
  if (outroFile) form.append('outro_file', outroFile)
  if (bgMusicFile) form.append('bg_music_file', bgMusicFile)

  const res = await fetch(`${BASE_URL}/api/jobs/start`, {
    method: 'POST',
    body: form,
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Server error ${res.status}: ${text}`)
  }

  return res.json() as Promise<{ job_id: string }>
}

/** Poll a job's current status. */
export async function getJobStatus(jobId: string): Promise<JobStatus> {
  const res = await fetch(`${BASE_URL}/api/jobs/${jobId}/status`, {
    signal: AbortSignal.timeout(8000),
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Status error ${res.status}: ${text}`)
  }
  return res.json() as Promise<JobStatus>
}

/** Request cancellation of a running job. */
export async function cancelJob(jobId: string): Promise<void> {
  const res = await fetch(`${BASE_URL}/api/jobs/${jobId}/cancel`, {
    method: 'POST',
    signal: AbortSignal.timeout(8000),
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Cancel error ${res.status}: ${text}`)
  }
}

// ---------------------------------------------------------------------------
// Legacy synchronous API (kept for backward compat — not used by main UI)
// ---------------------------------------------------------------------------

export async function generateVideo(
  audioFile: File,
  imagesZip: File,
  timestampCsv: File,
  settings: GenerateSettings,
): Promise<GenerateResponse> {
  const form = new FormData()
  form.append('audio_file', audioFile)
  form.append('images_zip', imagesZip)
  form.append('timestamp_csv', timestampCsv)
  form.append('video_format', settings.videoFormat)
  form.append('fit_mode', settings.fitMode)
  form.append('transition', settings.transition)
  form.append('zoom_effect', settings.zoomEffect)
  form.append('output_name', settings.outputName || 'video')

  const res = await fetch(`${BASE_URL}/api/generate`, {
    method: 'POST',
    body: form,
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Server error ${res.status}: ${text}`)
  }

  return res.json() as Promise<GenerateResponse>
}
