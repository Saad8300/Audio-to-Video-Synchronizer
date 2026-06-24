// types/index.ts – shared TypeScript types for Audio Image Sync Studio

export type AspectRatio    = '9:16' | '16:9' | '1:1'
export type ExportResolution = '720p' | '1080p' | '2K' | '4K'
export type FitMode        = 'cover' | 'contain'
export type Transition     = 'none' | 'fade'
export type ZoomEffect     = 'none' | 'slow_zoom_in'
export type RenderProfile  = 'fast_preview' | 'balanced' | 'high_quality'
export type WatermarkPosition = 'top_left' | 'top_right' | 'bottom_left' | 'bottom_right' | 'center'
export type WatermarkSize  = 'small' | 'medium' | 'large'

export interface GenerateSettings {
  // Core video
  aspectRatio:      AspectRatio
  exportResolution: ExportResolution
  fitMode:          FitMode
  transition:       Transition
  zoomEffect:       ZoomEffect
  renderProfile:    RenderProfile
  outputName:       string
  // Batch 2 — background music
  enableBgMusic: boolean
  musicVolume:   number    // 0–100 (integer percentage)
  musicFade:     boolean
  // Batch 3 — watermark
  enableWatermark:    boolean
  watermarkText:      string
  watermarkPosition:  WatermarkPosition
  watermarkOpacity:   number   // 10–100 (integer percentage in UI, /100 before sending)
  watermarkSize:      WatermarkSize
  watermarkMargin:    number   // 10–100 px
}

export interface TimelineRow {
  image:    string
  start:    string
  end:      string
  duration: string
  text:     string
  status:   'ok' | 'error' | 'missing'
}

export interface GenerateResponse {
  success:            boolean
  job_id?:            string
  elapsed_seconds?:   number
  output_video_url?:  string | null
  output_filename?:   string | null
  timeline_report:    TimelineRow[]
  warnings:           string[]
  errors:             string[]
}

export type GenerateStatus = 'idle' | 'uploading' | 'generating' | 'cancelling' | 'done' | 'error'

/** Shape returned by GET /api/jobs/{job_id}/status */
export interface JobStatus {
  job_id:                      string
  status:                      'queued' | 'running' | 'completed' | 'failed' | 'cancelled'
  progress:                    number
  current_step:                string
  elapsed_seconds:             number
  estimated_remaining_seconds: number | null
  warnings:                    string[]
  errors:                      string[]
  output_video_url:            string | null
  output_filename:             string | null
  timeline_report:             TimelineRow[]
}
