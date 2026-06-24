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

export type GenerateStatus = 'idle' | 'uploading' | 'generating' | 'done' | 'error'
