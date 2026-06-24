// types/index.ts – shared TypeScript types for Audio Image Sync Studio

export type VideoFormat = '9:16' | '16:9' | '1:1'
export type FitMode = 'cover' | 'contain'
export type Transition = 'none' | 'fade'
export type ZoomEffect = 'none' | 'slow_zoom_in'

export interface GenerateSettings {
  videoFormat: VideoFormat
  fitMode: FitMode
  transition: Transition
  zoomEffect: ZoomEffect
  outputName: string
  // Batch 2
  enableBgMusic: boolean
  musicVolume: number    // 0–100 (integer percentage shown in UI)
  musicFade: boolean
}

export interface TimelineRow {
  image: string
  start: string
  end: string
  duration: string
  text: string
  status: 'ok' | 'error' | 'missing'
}

export interface GenerateResponse {
  success: boolean
  job_id?: string
  elapsed_seconds?: number
  output_video_url?: string | null
  output_filename?: string | null
  timeline_report: TimelineRow[]
  warnings: string[]
  errors: string[]
}

export type GenerateStatus = 'idle' | 'uploading' | 'generating' | 'cancelling' | 'done' | 'error'

/** Shape returned by GET /api/jobs/{job_id}/status */
export interface JobStatus {
  job_id: string
  status: 'queued' | 'running' | 'completed' | 'failed' | 'cancelled'
  progress: number
  current_step: string
  elapsed_seconds: number
  estimated_remaining_seconds: number | null
  warnings: string[]
  errors: string[]
  output_video_url: string | null
  output_filename: string | null
  timeline_report: TimelineRow[]
}
