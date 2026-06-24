// utils/api.ts – API client for Audio Image Sync Studio backend

import type { GenerateResponse, GenerateSettings } from '../types'

const BASE_URL = '' // Vite dev proxy handles /api → http://127.0.0.1:8000

export async function checkHealth(): Promise<boolean> {
  try {
    const res = await fetch(`${BASE_URL}/api/health`, { signal: AbortSignal.timeout(5000) })
    return res.ok
  } catch {
    return false
  }
}

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
