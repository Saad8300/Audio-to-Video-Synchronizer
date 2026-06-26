// utils/api.ts – API client for Audio Image Sync Studio backend

import type { GenerateResponse, GenerateSettings, JobStatus, VideoTimelineSettings } from '../types'

const BASE_URL = '' // Vite dev proxy handles /api → http://127.0.0.1:8000


function parseErrorResponse(status: number, text: string): string {
  try {
    const data = JSON.parse(text)
    if (data.detail) {
      if (typeof data.detail === 'string') return data.detail
      if (Array.isArray(data.detail)) {
        const msgs = data.detail.map((err: any) => {
          if (err.type === "missing" && err.loc) {
            const field = err.loc[err.loc.length - 1]
            if (field === "audio_zip") return "Please upload an Audio Parts ZIP."
            if (field === "audio_file") return "Please upload a main audio file."
            return `Missing required field: ${field}`
          }
          const loc = err.loc ? err.loc.join('.') : 'Field'
          return `${loc}: ${err.msg}`
        })
        return msgs.join(' | ')
      }
    }
  } catch (e) {
    // ignore
  }
  if (status === 413) return "Payload too large. Please upload smaller files."
  if (status >= 500) return "Internal server error. Please check backend logs."
  return `Server error ${status}: ${text}`
}


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
 */
export async function startJob(
  audioInputMode: 'single' | 'zip',
  audioFile:    File | null,
  audioZip:     File | null,
  imagesZip:    File,
  timestampCsv: File,
  settings:     GenerateSettings,
  introFile?:   File | null,
  outroFile?:   File | null,
  bgMusicFile?: File | null,
): Promise<{ job_id: string }> {
  const form = new FormData()

  // Required
  form.append('audio_input_mode', audioInputMode)
  if (audioInputMode === 'single' && audioFile) {
    form.append('audio_file', audioFile)
  } else if (audioInputMode === 'zip' && audioZip) {
    form.append('audio_zip', audioZip)
  }
  
  form.append('images_zip',     imagesZip)
  form.append('timestamp_csv',  timestampCsv)

  // Core video settings
  form.append('aspect_ratio',      settings.aspectRatio)
  form.append('export_resolution', settings.exportResolution)
  form.append('fit_mode',          settings.fitMode)
  form.append('transition',        settings.transition)
  form.append('transition_duration', settings.transitionDuration)
  form.append('render_profile',    settings.renderProfile)
  form.append('output_name',       settings.outputName || 'video')

  // Batch 9A — motion & style
  form.append('motion_effect',    settings.motionEffect)
  form.append('motion_intensity', settings.motionIntensity)
  form.append('visual_effect',    settings.visualEffect)
  form.append('effect_strength',  settings.effectStrength)
  form.append('style_preset',     settings.stylePreset)

  // Watermark (Batch 3)
  const watermarkActive = settings.watermarkText.trim().length > 0
  form.append('enable_watermark',        watermarkActive ? 'true' : 'false')
  form.append('watermark_text',          settings.watermarkText)
  form.append('watermark_position_mode', settings.watermarkPositionMode)
  form.append('watermark_coordinate_mode', settings.watermarkCoordinateMode)
  form.append('watermark_position',      settings.watermarkPosition)
  form.append('watermark_x',             String(settings.watermarkX))
  form.append('watermark_y',             String(settings.watermarkY))
  form.append('watermark_opacity',       (settings.watermarkOpacity / 100).toFixed(4))
  form.append('watermark_size',          String(settings.watermarkSize))
  form.append('watermark_margin',        String(settings.watermarkMargin))

  // Background music (Batch 2)
  const musicActive = !!bgMusicFile
  form.append('enable_bg_music', musicActive ? 'true' : 'false')
  form.append('music_volume',    (settings.musicVolume / 100).toFixed(4))
  form.append('music_fade',      settings.musicFade ? 'true' : 'false')

  // Optional file uploads
  if (introFile)   form.append('intro_file',    introFile)
  if (outroFile)   form.append('outro_file',    outroFile)
  if (bgMusicFile) form.append('bg_music_file', bgMusicFile)

  const res = await fetch(`${BASE_URL}/api/jobs/start`, {
    method: 'POST',
    body: form,
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(parseErrorResponse(res.status, text))
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
    throw new Error(parseErrorResponse(res.status, text))
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
    throw new Error(parseErrorResponse(res.status, text))
  }
}

// ---------------------------------------------------------------------------
// Video Timeline job API (Batch 10B)
// ---------------------------------------------------------------------------

/**
 * Start a Video Timeline background job (Batch 10B + 10C).
 * Returns immediately with a job_id; poll getJobStatus() for updates.
 */
export async function startVideoTimelineJob(
  audioInputMode: 'single' | 'zip',
  audioFile:   File | null,
  audioZip:    File | null,
  videosZip:   File,
  timelineCsv: File,
  settings:    VideoTimelineSettings,
  introFile?:  File | null,
  outroFile?:  File | null,
): Promise<{ job_id: string }> {
  const form = new FormData()

  // Required uploads
  form.append('audio_input_mode', audioInputMode)
  if (audioInputMode === 'single' && audioFile) {
    form.append('audio_file', audioFile)
  } else if (audioInputMode === 'zip' && audioZip) {
    form.append('audio_zip', audioZip)
  }

  form.append('videos_zip',   videosZip)
  form.append('timeline_csv', timelineCsv)

  // Optional uploads
  if (introFile) form.append('intro_file', introFile)
  if (outroFile) form.append('outro_file', outroFile)

  // Core settings
  form.append('aspect_ratio',      settings.aspectRatio)
  form.append('export_resolution', settings.exportResolution)
  form.append('fit_mode',          settings.fitMode)
  form.append('fill_mode',         settings.fillMode)
  form.append('render_profile',    settings.renderProfile)
  form.append('output_name',       settings.outputName || 'video_timeline')

  // Batch 10C — styling
  form.append('transition',          settings.transition)
  form.append('transition_duration', settings.transitionDuration)
  form.append('visual_effect',       settings.visualEffect)
  form.append('effect_strength',     settings.effectStrength)

  // Batch 12A — Motion
  form.append('motion_style',         settings.motionStyle)
  form.append('motion_intensity',     settings.motionIntensity)

  // Background Music
  if (settings.backgroundMusicFile) {
    form.append('background_music_file', settings.backgroundMusicFile)
  }
  form.append('background_music_volume', String(settings.backgroundMusicVolume))
  form.append('background_music_loop',   String(settings.backgroundMusicLoop))
  form.append('background_music_fade',   String(settings.backgroundMusicFade))

  // Batch 10C — watermark (auto-enable when text exists)
  const wmActive = settings.watermarkText.trim().length > 0
  if (wmActive) {
    form.append('watermark_text',          settings.watermarkText)
    form.append('watermark_position_mode', settings.watermarkPositionMode)
    form.append('watermark_coordinate_mode', settings.watermarkCoordinateMode)
    form.append('watermark_position',      settings.watermarkPosition)
    form.append('watermark_x',             String(settings.watermarkX))
    form.append('watermark_y',             String(settings.watermarkY))
    form.append('watermark_opacity',       (settings.watermarkOpacity / 100).toFixed(4))
    form.append('watermark_size',          String(settings.watermarkSize))
    form.append('watermark_margin',        String(settings.watermarkMargin))
  }

  const res = await fetch(`${BASE_URL}/api/jobs/start-video-timeline`, {
    method: 'POST',
    body: form,
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(parseErrorResponse(res.status, text))
  }

  return res.json() as Promise<{ job_id: string }>
}


// ---------------------------------------------------------------------------
// Legacy synchronous API (kept for backward compat — not used by main UI)
// ---------------------------------------------------------------------------

export async function generateVideo(
  audioFile:    File,
  imagesZip:    File,
  timestampCsv: File,
  settings:     GenerateSettings,
): Promise<GenerateResponse> {
  const form = new FormData()
  form.append('audio_file',    audioFile)
  form.append('images_zip',    imagesZip)
  form.append('timestamp_csv', timestampCsv)
  form.append('video_format',  settings.aspectRatio)
  form.append('fit_mode',      settings.fitMode)
  form.append('transition',    settings.transition)
  form.append('zoom_effect',   settings.zoomEffect)
  form.append('output_name',   settings.outputName || 'video')

  const res = await fetch(`${BASE_URL}/api/generate`, {
    method: 'POST',
    body: form,
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(parseErrorResponse(res.status, text))
  }

  return res.json() as Promise<GenerateResponse>
}

// ---------------------------------------------------------------------------
// Media Timeline job API (Batch 11B)
// ---------------------------------------------------------------------------

/**
 * Start a Media Timeline background job (Batch 11B).
 * Returns immediately with a job_id; poll getJobStatus() for updates.
 */
export async function startMediaTimelineJob(
  audioInputMode: 'single' | 'zip',
  audioFile:   File | null,
  audioZip:    File | null,
  mediaZip:    File,
  timelineCsv: File,
  settings:    {
    aspectRatio:      string
    exportResolution: string
    fitMode:          string
    fillMode:         string
    renderProfile:    string
    outputName:       string
    textPosition:     string
    textSize:         string
    textColor:        string
    textBackground:   string
    textWidth:        string
    textAlignment:    string
    transition:       string
    transitionDuration: string
    visualEffect:     string
    effectStrength:   string
    enableWatermark:       boolean
    watermarkText:         string
    watermarkPositionMode: string
    watermarkCoordinateMode: string
    watermarkPosition:     string
    watermarkX:            number
    watermarkY:            number
    watermarkOpacity:      number
    watermarkSize:         number
    watermarkMargin:       number
    enableIntro:           boolean
    enableOutro:           boolean
    motionStyle:           string
    motionIntensity:       string
    backgroundMusicFile:   File | null
    backgroundMusicVolume: number
    backgroundMusicLoop:   boolean
    backgroundMusicFade:   boolean
  },
  introFile?:  File | null,
  outroFile?:  File | null,
): Promise<{ job_id: string }> {
  const form = new FormData()

  form.append('audio_input_mode', audioInputMode)
  if (audioInputMode === 'single' && audioFile) {
    form.append('audio_file', audioFile)
  } else if (audioInputMode === 'zip' && audioZip) {
    form.append('audio_zip', audioZip)
  }
  
  form.append('media_zip',    mediaZip)
  form.append('timeline_csv', timelineCsv)

  form.append('aspect_ratio',      settings.aspectRatio)
  form.append('export_resolution', settings.exportResolution)
  form.append('fit_mode',          settings.fitMode)
  form.append('fill_mode',         settings.fillMode)
  form.append('render_profile',    settings.renderProfile)
  form.append('output_name',       settings.outputName || 'media_timeline')

  form.append('text_position',   settings.textPosition)
  form.append('text_size',       settings.textSize)
  form.append('text_color',      settings.textColor)
  form.append('text_background', settings.textBackground)
  form.append('text_width',      settings.textWidth)
  form.append('text_alignment',  settings.textAlignment)

  // Batch 11D — styling & enhancements
  form.append('transition',          settings.transition)
  form.append('transition_duration', settings.transitionDuration)
  form.append('visual_effect',       settings.visualEffect)
  form.append('effect_strength',     settings.effectStrength)

  // Batch 12A — Motion
  form.append('motion_style',         settings.motionStyle)
  form.append('motion_intensity',     settings.motionIntensity)

  // Background Music
  if (settings.backgroundMusicFile) {
    form.append('background_music_file', settings.backgroundMusicFile)
  }
  form.append('background_music_volume', String(settings.backgroundMusicVolume))
  form.append('background_music_loop',   String(settings.backgroundMusicLoop))
  form.append('background_music_fade',   String(settings.backgroundMusicFade))

  if (introFile) form.append('intro_file', introFile)
  if (outroFile) form.append('outro_file', outroFile)

  const wmActive = settings.watermarkText.trim().length > 0
  if (wmActive) {
    form.append('watermark_text',          settings.watermarkText)
    form.append('watermark_position_mode', settings.watermarkPositionMode)
    form.append('watermark_coordinate_mode', settings.watermarkCoordinateMode)
    form.append('watermark_position',      settings.watermarkPosition)
    form.append('watermark_x',             String(settings.watermarkX))
    form.append('watermark_y',             String(settings.watermarkY))
    form.append('watermark_opacity',       (settings.watermarkOpacity / 100).toFixed(4))
    form.append('watermark_size',          String(settings.watermarkSize))
    form.append('watermark_margin',        String(settings.watermarkMargin))
  }

  const res = await fetch(`${BASE_URL}/api/jobs/start-media-timeline`, {
    method: 'POST',
    body: form,
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(parseErrorResponse(res.status, text))
  }

  return res.json() as Promise<{ job_id: string }>
}
