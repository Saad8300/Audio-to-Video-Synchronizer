// components/VideoTimelinePage.tsx — Video Timeline workflow (Batch 10B + 10C)

import React, { useState, useCallback, useEffect } from 'react'
import {
  IconMusic,
  IconVideo,
  IconFileText,
  IconFilm,
  IconZap,
  IconLoader,
  IconDownload,
  IconCheck,
  IconAlertTriangle,
  IconX,
} from './icons'
import ProgressOverlay from './ProgressOverlay'
import type {
  VideoTimelineSettings,
  AspectRatio,
  ExportResolution,
  FitMode,
  ClipFillMode,
  RenderProfile,
  Transition,
  TransitionDuration,
  VisualEffect,
  EffectStrength,
  WatermarkPosition,
  WatermarkPositionMode,
  GenerateStatus,
  JobStatus,
  GenerateResponse,
} from '../types'
import { startVideoTimelineJob } from '../utils/api'

// ── Constants ─────────────────────────────────────────────────────────────────

const CSV_TEMPLATE = `start,end,video\n0,5,1.mp4\n5,10,2.mp4\n10,15,1.mp4\n15,20,3.mp4\n`

const DEFAULT_SETTINGS: VideoTimelineSettings = {
  // Core
  aspectRatio:      '9:16',
  exportResolution: '1080p',
  fitMode:          'cover',
  fillMode:         'loop',
  renderProfile:    'balanced',
  outputName:       'video_timeline',
  // Styling
  transition:          'none',
  transitionDuration:  '0.5',
  visualEffect:        'none',
  effectStrength:      'medium',
  // Watermark
  enableWatermark:       false,
  watermarkText:         '',
  watermarkPositionMode: 'preset',
  watermarkPosition:     'bottom_right',
  watermarkX:            50,
  watermarkY:            50,
  watermarkOpacity:      65,
  watermarkSize:         20,
  watermarkMargin:       36,
  // Intro / Outro
  enableIntro: false,
  enableOutro: false,
}

// ── Reusable Select ───────────────────────────────────────────────────────────

function Sel<T extends string>({
  id, label, value, options, onChange, disabled,
}: {
  id: string; label: string; value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void; disabled?: boolean;
}) {
  return (
    <div className="space-y-1">
      <label htmlFor={id} className="form-label">{label}</label>
      <select
        id={id} value={value} disabled={disabled} className="form-select"
        onChange={e => onChange(e.target.value as T)}
      >
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  )
}

// ── File Drop Zone ─────────────────────────────────────────────────────────────

function VideoDropZone({
  id, label, description, accept, icon, file, files = [], onChange, onFilesChange, multiple, disabled, required,
}: {
  id: string; label: string; description: string; accept: string;
  icon: React.ReactNode; file?: File | null; files?: File[];
  onChange?: (f: File | null) => void; onFilesChange?: (f: File[]) => void;
  multiple?: boolean; disabled?: boolean; required?: boolean;
}) {
  const [drag, setDrag] = useState(false)
  const inputRef = React.useRef<HTMLInputElement>(null)
  
  const handleFiles = (droppedFiles: FileList | File[]) => {
    const list = Array.from(droppedFiles)
    if (list.length === 0) {
      if (onChange) onChange(null)
      if (onFilesChange) onFilesChange([])
      return
    }

    // Natural sort by filename
    list.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' }))
    if (multiple && onFilesChange) {
      onFilesChange(list)
    } else if (onChange) {
      onChange(list[0])
    }
  }

  const hasFile = (file !== undefined && file !== null) || files.length > 0

  return (
    <div
      id={id}
      role="button"
      tabIndex={0}
      aria-label={`Upload ${label}`}
      onClick={() => !disabled && inputRef.current?.click()}
      onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); inputRef.current?.click() } }}
      onDragOver={e => { e.preventDefault(); setDrag(true) }}
      onDragLeave={() => setDrag(false)}
      onDrop={e => { e.preventDefault(); setDrag(false); handleFiles(e.dataTransfer.files) }}
      className="relative flex flex-col items-center justify-center gap-2 p-4 rounded-xl text-center cursor-pointer transition-all"
      style={{
        border: `1.5px dashed ${hasFile ? 'var(--color-success-border)' : drag ? 'var(--accent-primary)' : 'var(--border-default)'}`,
        background: hasFile ? 'var(--color-success-bg)' : drag ? 'var(--accent-subtle)' : 'var(--bg-input)',
        minHeight: 88,
        opacity: disabled ? 0.5 : 1,
        cursor: disabled ? 'not-allowed' : 'pointer',
      }}
    >
      <input
        ref={inputRef} type="file" accept={accept} multiple={multiple} className="sr-only" disabled={disabled}
        onChange={e => handleFiles(e.target.files ?? [])}
      />
      <span style={{ color: hasFile ? 'var(--color-success)' : 'var(--accent-primary)' }}>
        {hasFile ? <IconCheck size={16} /> : icon}
      </span>
      <div>
        <p className="text-[11px] font-semibold" style={{ color: hasFile ? 'var(--color-success)' : 'var(--text-primary)' }}>
          {files.length > 1 ? `${files.length} audio parts selected` : (file ? file.name : (files[0]?.name ?? label))}
          {required && !hasFile && <span style={{ color: 'var(--color-error)' }}> *</span>}
        </p>
        {!hasFile && (
          <p className="text-[10px] mt-0.5" style={{ color: 'var(--text-muted)' }}>{description}</p>
        )}
        {hasFile && files.length > 1 && (
          <p className="text-[10px] mt-0.5 truncate" style={{ color: 'var(--text-muted)', maxWidth: 180 }}>
            {files.slice(0, 2).map(f => f.name).join(' → ')}
            {files.length > 2 && ` (+ ${files.length - 2} more)`}
          </p>
        )}
        {hasFile && (
          <button
            type="button"
            onClick={e => {
              e.stopPropagation();
              if (onChange) onChange(null);
              if (onFilesChange) onFilesChange([]);
            }}
            className="text-[10px] mt-0.5"
            style={{ color: 'var(--text-muted)', textDecoration: 'underline', background: 'none', border: 'none', cursor: 'pointer' }}
          >
            Remove
          </button>
        )}
      </div>
    </div>
  )
}

// ── Results strip ──────────────────────────────────────────────────────────────

function VideoTimelineResult({
  result, rowCount, settings,
}: { result: GenerateResponse; rowCount: number; settings: VideoTimelineSettings }) {
  const videoUrl = result.output_video_url
  const hasVideo = result.success && videoUrl
  const filename = result.output_filename ?? 'video_timeline.mp4'

  let chips = result.success ? [
    `Mode: Video Timeline`,
    `Rows: ${rowCount}`,
    `Res: ${settings.exportResolution}`,
    `Profile: ${settings.renderProfile.replace('_', ' ')}`,
    `Fill: ${settings.fillMode}`,
    ...(settings.transition !== 'none' ? [`Trans: ${settings.transition.replace('_', ' ')}`] : []),
    ...(settings.visualEffect !== 'none' ? [`Style: ${settings.visualEffect.replace('_', ' ')}`] : []),
    ...(settings.watermarkText.trim() ? ['Watermark: on'] : []),
    ...(settings.enableIntro ? ['Intro: on'] : []),
    ...(settings.enableOutro ? ['Outro: on'] : []),
    ...(result.visual_duration ? [`Visual: ${result.visual_duration.toFixed(2)}s`] : []),
    ...(result.audio_duration ? [`Audio: ${result.audio_duration.toFixed(2)}s`] : []),
  ] : []

  // Compact display: if too many chips, prioritize key information
  if (chips.length > 9) {
    chips = [
      `Mode: Video Timeline`,
      `Rows: ${rowCount}`,
      `Res: ${settings.exportResolution}`,
      `Profile: ${settings.renderProfile.replace('_', ' ')}`,
      ...(result.visual_duration ? [`Duration: ${result.visual_duration.toFixed(2)}s`] : []),
      ...(settings.transition !== 'none' ? [`Trans: ${settings.transition.replace('_', ' ')}`] : []),
      ...(settings.visualEffect !== 'none' ? [`Style: ${settings.visualEffect.replace('_', ' ')}`] : []),
      ...(settings.watermarkText.trim() || settings.enableIntro || settings.enableOutro ? ['Extras: on'] : []),
    ]
  }

  return (
    <div className="space-y-4 animate-slide-up">
      {/* Banner */}
      <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-default)' }}>
        <div style={{ height: 3, background: result.success ? 'var(--color-success)' : 'var(--color-error)' }} />
        <div style={{ padding: '18px 22px', display: 'flex', alignItems: 'flex-start', gap: 14 }}>
          <div style={{
            width: 42, height: 42, borderRadius: 12, flexShrink: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: result.success ? 'var(--color-success-bg)' : 'var(--color-error-bg)',
            border: `1px solid ${result.success ? 'var(--color-success-border)' : 'var(--color-error-border)'}`,
          }}>
            {result.success
              ? <IconCheck size={18} style={{ color: 'var(--color-success)' }} />
              : <IconX size={18} style={{ color: 'var(--color-error)' }} />
            }
          </div>
          <div style={{ flex: 1 }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
              {result.success ? 'Video Timeline Complete' : 'Generation Failed'}
            </h3>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 3 }}>
              {result.success
                ? 'Your video is ready to preview and download.'
                : 'See error details below.'}
            </p>
            {chips.length > 0 && (
              <div style={{ display: 'flex', gap: 6, marginTop: 10, flexWrap: 'wrap' }}>
                {chips.map(chip => (
                  <span key={chip} style={{
                    fontSize: 10, fontFamily: 'monospace', fontWeight: 600,
                    padding: '2px 8px', borderRadius: 6,
                    background: 'var(--accent-subtle)', border: '1px solid var(--accent-border)',
                    color: 'var(--accent-primary)',
                  }}>{chip}</span>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Errors / warnings */}
      {result.errors.length > 0 && (
        <div className="rounded-xl p-4 space-y-2" style={{ background: 'var(--color-error-bg)', border: '1px solid var(--color-error-border)' }}>
          <p className="text-sm font-bold flex items-center gap-1.5" style={{ color: 'var(--color-error)' }}>
            <IconX size={14} /> Video Timeline Failed
          </p>
          <p className="text-xs font-semibold" style={{ color: 'var(--color-error)', opacity: 0.9 }}>
            {result.errors[0]}
          </p>
          {result.errors.length > 1 && (
            <details className="mt-2 pt-2" style={{ borderTop: '1px solid var(--color-error-border)' }}>
              <summary className="text-[10px] uppercase tracking-wider font-bold opacity-70 cursor-pointer outline-none select-none" style={{ color: 'var(--color-error)' }}>
                Details ({result.errors.length - 1} more)
              </summary>
              <div className="mt-2 space-y-1">
                {result.errors.slice(1).map((e, i) => <p key={i} className="text-xs" style={{ color: 'var(--color-error)', opacity: 0.85 }}>· {e}</p>)}
              </div>
            </details>
          )}
        </div>
      )}
      {result.warnings.length > 0 && (
        <div className="rounded-xl p-3.5 space-y-1.5" style={{ background: 'var(--color-warning-bg)', border: '1px solid var(--color-warning-border)' }}>
          <p className="text-xs font-semibold flex items-center gap-1.5" style={{ color: 'var(--color-warning)' }}>
            <IconAlertTriangle size={12} /> {result.warnings.length} Warning{result.warnings.length > 1 ? 's' : ''}
          </p>
          {result.warnings.map((w, i) => <p key={i} className="text-xs" style={{ color: 'var(--color-warning)', opacity: 0.85 }}>· {w}</p>)}
        </div>
      )}

      {/* Video preview + download */}
      {hasVideo && (
        <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-default)' }}>
          <div style={{ background: '#000', aspectRatio: '16/9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <video src={videoUrl!} controls style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }} aria-label="Generated video timeline preview" />
          </div>
          <div style={{ padding: '14px 18px' }}>
            <a
              href={videoUrl!}
              download={filename}
              id="vt-download-btn"
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                padding: '11px 20px', borderRadius: 10, fontWeight: 700, fontSize: 14, color: '#fff',
                background: 'var(--accent-primary)', textDecoration: 'none',
                transition: 'transform 0.18s ease, box-shadow 0.18s ease',
                boxShadow: '0 4px 16px rgba(79,70,229,0.30)',
              }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.background = 'var(--accent-hover)' }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.background = 'var(--accent-primary)' }}
            >
              <IconDownload size={16} /> Download MP4
            </a>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Section Divider ───────────────────────────────────────────────────────────

function SectionDivider({ label }: { label: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '4px 0' }}>
      <div style={{ flex: 1, height: 1, background: 'var(--border-subtle)' }} />
      <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{label}</span>
      <div style={{ flex: 1, height: 1, background: 'var(--border-subtle)' }} />
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function VideoTimelinePage() {
  // Files
  const [audioFiles, setAudioFiles] = useState<File[]>([])
  const [videosZip, setVideosZip] = useState<File | null>(null)
  const [csvFile,   setCsvFile]   = useState<File | null>(null)
  const [introFile, setIntroFile] = useState<File | null>(null)
  const [outroFile, setOutroFile] = useState<File | null>(null)

  // Settings
  const [settings, setSettings] = useState<VideoTimelineSettings>(DEFAULT_SETTINGS)
  const set = <K extends keyof VideoTimelineSettings>(key: K, val: VideoTimelineSettings[K]) =>
    setSettings(s => ({ ...s, [key]: val }))

  // Auto-enable intro/outro when files uploaded
  const handleIntroChange = (f: File | null) => {
    setIntroFile(f)
    set('enableIntro', !!f)
  }
  const handleOutroChange = (f: File | null) => {
    setOutroFile(f)
    set('enableOutro', !!f)
  }
  // Auto-enable watermark when text typed
  const handleWmTextChange = (text: string) => {
    set('watermarkText', text)
    set('enableWatermark', text.trim().length > 0)
  }

  // Duration warnings
  const [audioDur, setAudioDur] = useState<number | null>(null)
  const [visualDur, setVisualDur] = useState<number | null>(null)
  const [durationWarning, setDurationWarning] = useState<string | null>(null)

  // Calculate audio duration
  useEffect(() => {
    if (audioFiles.length === 0) {
      setAudioDur(null)
      return
    }
    let totalDur = 0
    let loaded = 0
    let hasErr = false

    audioFiles.forEach(f => {
      const url = URL.createObjectURL(f)
      const audio = new Audio(url)
      audio.addEventListener('loadedmetadata', () => {
        if (!hasErr) {
          totalDur += audio.duration
          loaded++
          if (loaded === audioFiles.length) setAudioDur(totalDur)
        }
        URL.revokeObjectURL(url)
      })
      audio.addEventListener('error', () => {
        hasErr = true
        setAudioDur(null)
        URL.revokeObjectURL(url)
      })
    })
  }, [audioFiles])

  // Calculate visual duration from CSV
  useEffect(() => {
    if (!csvFile) {
      setVisualDur(null)
      return
    }
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string
        if (!text) return
        const lines = text.split('\n').map(l => l.trim()).filter(Boolean)
        if (lines.length < 2) return
        
        const header = lines[0].toLowerCase().split(',')
        const startIdx = header.indexOf('start')
        const endIdx = header.indexOf('end')
        
        if (startIdx === -1 || endIdx === -1) return
        
        let minStart = Infinity
        let maxEnd = -Infinity
        
        for (let i = 1; i < lines.length; i++) {
          const parts = lines[i].split(',')
          const s = parseFloat(parts[startIdx])
          const e = parseFloat(parts[endIdx])
          if (!isNaN(s) && !isNaN(e)) {
            if (s < minStart) minStart = s
            if (e > maxEnd) maxEnd = e
          }
        }
        if (minStart !== Infinity && maxEnd !== -Infinity && maxEnd > minStart) {
          setVisualDur(maxEnd - minStart)
        } else {
          setVisualDur(null)
        }
      } catch (err) {
        setVisualDur(null)
      }
    }
    reader.readAsText(csvFile)
  }, [csvFile])

  // Update duration warning
  useEffect(() => {
    if (audioDur !== null && visualDur !== null) {
      if (visualDur < audioDur - 0.5) {
        setDurationWarning(`Visual timeline is shorter than audio. Black padding will be added until the audio ends.`)
      } else if (visualDur > audioDur + 0.5) {
        setDurationWarning(`Visual timeline is longer than audio. Final video will be trimmed to match the main audio.`)
      } else {
        setDurationWarning(null)
      }
    } else {
      setDurationWarning(null)
    }
  }, [audioDur, visualDur])

  // Generation state
  const [status,       setStatus]       = useState<GenerateStatus>('idle')
  const [currentJobId, setCurrentJobId] = useState<string | null>(null)
  const [result,       setResult]       = useState<GenerateResponse | null>(null)
  const [cancelledMsg, setCancelledMsg] = useState<string | null>(null)

  const canGenerate = audioFiles.length > 0 && !!videosZip && !!csvFile
    && status !== 'uploading' && status !== 'generating' && status !== 'cancelling'
  const isLoading   = status === 'uploading' || status === 'generating' || status === 'cancelling'

  // Download CSV template
  const downloadTemplate = () => {
    const blob = new Blob([CSV_TEMPLATE], { type: 'text/csv' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href = url; a.download = 'video_timeline_template.csv'; a.click()
    URL.revokeObjectURL(url)
  }

  // Generate
  const handleGenerate = async () => {
    if (audioFiles.length === 0 || !videosZip || !csvFile) return
    setResult(null); setCancelledMsg(null); setStatus('uploading')
    try {
      const { job_id } = await startVideoTimelineJob(
        audioFiles, videosZip, csvFile, settings,
        introFile, outroFile,
      )
      setCurrentJobId(job_id); setStatus('generating')
    } catch (err) {
      setResult({ success: false, errors: [String(err)], warnings: [], timeline_report: [] })
      setStatus('error')
    }
  }

  const handleJobComplete = useCallback((jobStatus: JobStatus) => {
    setCurrentJobId(null)
    if (jobStatus.status === 'completed') {
      setResult({
        success: true,
        job_id: jobStatus.job_id,
        elapsed_seconds: jobStatus.elapsed_seconds,
        output_video_url: jobStatus.output_video_url ?? undefined,
        output_filename: jobStatus.output_filename ?? undefined,
        timeline_report: jobStatus.timeline_report,
        warnings: jobStatus.warnings,
        errors:   jobStatus.errors,
      })
      setStatus('done')
    } else {
      setResult({
        success: false,
        errors:  jobStatus.errors.length ? jobStatus.errors : ['Video timeline generation failed.'],
        warnings: jobStatus.warnings,
        timeline_report: jobStatus.timeline_report,
      })
      setStatus('error')
    }
  }, [])

  const handleCancelled = useCallback(() => {
    setCurrentJobId(null); setStatus('idle')
    setCancelledMsg('Generation cancelled.')
    setTimeout(() => setCancelledMsg(null), 4000)
  }, [])

  const rowCount = result?.timeline_report?.length ?? 0

  // Summary chips for Generate panel
  const summaryChips = [
    { label: 'Res',     value: settings.exportResolution },
    { label: 'Profile', value: settings.renderProfile.replace('_', ' ') },
    { label: 'Fill',    value: settings.fillMode },
    ...(settings.transition !== 'none' ? [{ label: 'Trans', value: settings.transition.replace('_', ' ') }] : []),
    ...(settings.visualEffect !== 'none' ? [{ label: 'Style', value: settings.visualEffect.replace('_', ' ') }] : []),
    ...(settings.watermarkText.trim() ? [{ label: 'WM', value: 'on' }] : []),
    ...(introFile ? [{ label: 'Intro', value: 'on' }] : []),
    ...(outroFile ? [{ label: 'Outro', value: 'on' }] : []),
  ]

  return (
    <>
      {/* Progress overlay (reused) */}
      {isLoading && currentJobId && (
        <ProgressOverlay
          jobId={currentJobId}
          onJobComplete={handleJobComplete}
          onCancelled={handleCancelled}
          renderSpec={{ resolution: settings.exportResolution, renderProfile: settings.renderProfile }}
        />
      )}

      {/* Upload-only spinner */}
      {status === 'uploading' && !currentJobId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center animate-fade-in" style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)' }}>
          <div className="w-64 text-center space-y-4 p-8 rounded-2xl" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-default)' }}>
            <div className="w-12 h-12 mx-auto rounded-2xl flex items-center justify-center" style={{ background: 'var(--accent-subtle)', border: '1px solid var(--accent-border)' }}>
              <IconLoader size={20} className="animate-spin" style={{ color: 'var(--accent-primary)' }} />
            </div>
            <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Uploading files…</h3>
          </div>
        </div>
      )}

      <main className="max-w-7xl mx-auto w-full px-4 sm:px-6 py-6">
        <div className="flex flex-col xl:flex-row gap-6 items-start">

          {/* ── LEFT COLUMN ── */}
          <div className="flex-1 min-w-0 space-y-5">

            {/* Header */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                style={{ background: 'var(--accent-subtle)', border: '1px solid var(--accent-border)', color: 'var(--accent-primary)' }}>
                <IconFilm size={18} />
              </div>
              <div>
                <h1 className="text-sm font-bold" style={{ color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>Video Timeline</h1>
                <p className="text-[11px] mt-0.5" style={{ color: 'var(--text-muted)' }}>
                  Build videos from reusable clips, main audio, and a timeline CSV.
                </p>
              </div>
            </div>

            {/* Source Files */}
            <div className="card p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>Source Files</h2>
                  <p className="text-[11px] mt-0.5" style={{ color: 'var(--text-muted)' }}>All three files are required to generate a video timeline.</p>
                </div>
                <div className="hidden sm:flex items-center gap-3 text-[11px]">
                  {[{ label: 'Audio', hasFile: audioFiles.length > 0 }, { label: 'Videos', hasFile: !!videosZip }, { label: 'CSV', hasFile: !!csvFile }].map(({ label, hasFile }) => (
                    <span key={label} className="flex items-center gap-1" style={{ color: hasFile ? 'var(--color-success)' : 'var(--text-muted)' }}>
                      <span style={{ fontWeight: 700 }}>{hasFile ? '✓' : '○'}</span> {label}
                    </span>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <VideoDropZone id="vt-audio-upload" label="Main Audio" description="Upload one file or multiple audio parts" accept="audio/*,.mp3,.wav,.m4a,.aac"
                  icon={<IconMusic size={14} />} files={audioFiles} onFilesChange={setAudioFiles} multiple disabled={isLoading} required />
                <VideoDropZone id="vt-videos-upload" label="Videos ZIP" description="ZIP of .mp4, .mov, .webm clips" accept=".zip,application/zip"
                  icon={<IconVideo size={14} />} file={videosZip} onChange={setVideosZip} disabled={isLoading} required />
                <VideoDropZone id="vt-csv-upload" label="Timeline CSV" description="start, end, video columns" accept=".csv,text/csv"
                  icon={<IconFileText size={14} />} file={csvFile} onChange={setCsvFile} disabled={isLoading} required />
              </div>

              {/* CSV Guide */}
              <div className="rounded-xl p-4 space-y-3" style={{ background: 'var(--bg-input)', border: '1px solid var(--border-subtle)' }}>
                <div className="flex items-center justify-between">
                  <p className="text-[11px] font-semibold" style={{ color: 'var(--text-primary)' }}>Timeline CSV Format</p>
                  <button
                    id="vt-download-template-btn"
                    onClick={downloadTemplate}
                    className="flex items-center gap-1.5 text-[10px] font-semibold px-2.5 py-1.5 rounded-lg transition-colors"
                    style={{ background: 'var(--accent-subtle)', border: '1px solid var(--accent-border)', color: 'var(--accent-primary)', cursor: 'pointer' }}
                  >
                    <IconDownload size={11} /> Download Template
                  </button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <p className="text-[10px] font-semibold mb-1.5" style={{ color: 'var(--text-muted)' }}>Required columns</p>
                    <div className="space-y-1">
                      {[
                        { col: 'start', desc: 'Clip start time in seconds' },
                        { col: 'end',   desc: 'Clip end time in seconds' },
                        { col: 'video', desc: 'Filename inside ZIP (e.g. 1.mp4)' },
                      ].map(({ col, desc }) => (
                        <div key={col} className="flex items-center gap-2">
                          <code className="text-[10px] px-1.5 py-0.5 rounded font-mono" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', color: 'var(--accent-primary)' }}>{col}</code>
                          <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{desc}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="text-[10px] font-semibold mb-1.5" style={{ color: 'var(--text-muted)' }}>Example</p>
                    <pre className="text-[10px] leading-relaxed font-mono rounded-lg p-2.5" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', color: 'var(--text-secondary)' }}>
{`start,end,video
0,5,1.mp4
5,10,2.mp4
10,15,1.mp4
15,20,3.mp4`}
                    </pre>
                  </div>
                </div>
                <p className="text-[10px] leading-relaxed" style={{ color: 'var(--text-muted)' }}>
                  <strong style={{ color: 'var(--text-secondary)' }}>Repeat clips:</strong>{' '}
                  Use the same filename multiple times to reuse a clip. The same file can appear at any row.
                </p>
              </div>
            </div>

            {/* Cancelled notice */}
            {cancelledMsg && (
              <div className="alert-warning animate-fade-in">
                <span>ℹ</span>
                <p className="text-xs">{cancelledMsg}</p>
              </div>
            )}

            {/* Generate Panel */}
            <div className="card p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>Generate</h2>
                  <p className="text-[11px] mt-0.5" style={{ color: canGenerate ? 'var(--color-success)' : 'var(--text-muted)' }}>
                    {canGenerate ? 'Ready to generate your video timeline.' : 'Upload all three required files to continue.'}
                  </p>
                </div>
                <div className="hidden sm:flex items-center gap-1 flex-wrap justify-end">
                  {summaryChips.map(({ label, value }) => (
                    <span key={label} className="flex items-center gap-1 px-2 py-1 rounded text-[10px]"
                      style={{ background: 'var(--accent-subtle)', border: '1px solid var(--accent-border)', color: 'var(--accent-primary)' }}>
                      <span className="font-semibold">{label}</span>
                      <span className="opacity-70">·</span>
                      <span>{value}</span>
                    </span>
                  ))}
                </div>
              </div>

              {/* Duration Warning */}
              {durationWarning && !isLoading && (
                <div className="rounded-xl p-3.5 space-y-1" style={{ background: 'var(--color-warning-bg)', border: '1px solid var(--color-warning-border)' }}>
                  <p className="text-xs font-semibold flex items-center gap-1.5" style={{ color: 'var(--color-warning)' }}>
                    <IconAlertTriangle size={12} /> Timeline Duration Mismatch
                  </p>
                  <p className="text-[11px]" style={{ color: 'var(--color-warning)', opacity: 0.85 }}>
                    {durationWarning}
                  </p>
                </div>
              )}

              <button
                id="vt-generate-btn"
                onClick={handleGenerate}
                disabled={!canGenerate}
                aria-label="Generate video timeline"
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  width: '100%', padding: '13px 20px', borderRadius: 12,
                  fontWeight: 700, fontSize: 15, color: '#fff',
                  background: canGenerate ? 'var(--accent-primary)' : 'var(--bg-input)',
                  border: canGenerate ? 'none' : '1px solid var(--border-default)',
                  cursor: canGenerate ? 'pointer' : 'not-allowed',
                  opacity: canGenerate ? 1 : 0.45,
                  transition: 'transform 0.18s ease, box-shadow 0.18s ease',
                  boxShadow: canGenerate ? '0 6px 20px rgba(79,70,229,0.32)' : 'none',
                }}
                onMouseEnter={e => { if (canGenerate) { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.background = 'var(--accent-hover)' } }}
                onMouseLeave={e => { if (canGenerate) { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.background = 'var(--accent-primary)' } }}
              >
                {isLoading ? <><IconLoader size={18} className="animate-spin" />Generating…</> : <><IconZap size={18} />Generate Video Timeline</>}
              </button>

              {/* Missing files */}
              {!canGenerate && !isLoading && (
                <div className="flex items-center gap-3 flex-wrap">
                  {[{ label: 'Audio', hasFile: audioFiles.length > 0 }, { label: 'Videos ZIP', hasFile: !!videosZip }, { label: 'CSV', hasFile: !!csvFile }]
                    .filter(f => !f.hasFile)
                    .map(f => (
                      <span key={f.label} className="flex items-center gap-1 text-[10px]" style={{ color: 'var(--color-error)' }}>
                        <span>✗</span> {f.label} missing
                      </span>
                    ))}
                </div>
              )}
            </div>

            {/* Results */}
            {result && <VideoTimelineResult result={result} rowCount={rowCount} settings={settings} />}
          </div>

          {/* ── RIGHT COLUMN — Settings ── */}
          <div className="w-full xl:w-[300px] shrink-0">
            <div className="card p-5 space-y-5">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>Video Settings</h2>
                <span className="text-[9px] font-bold uppercase tracking-widest px-2 py-1 rounded"
                  style={{ background: 'var(--accent-subtle)', border: '1px solid var(--accent-border)', color: 'var(--accent-primary)' }}>
                  Inspector
                </span>
              </div>

              {/* ── Output ── */}
              <div className="space-y-3">
                <SectionDivider label="Output" />

                <div className="grid grid-cols-2 gap-2">
                  <Sel id="vt-aspect" label="Aspect Ratio" value={settings.aspectRatio}
                    onChange={v => set('aspectRatio', v as AspectRatio)} disabled={isLoading}
                    options={[{ value: '9:16', label: '9:16 — Shorts' }, { value: '16:9', label: '16:9 — YouTube' }, { value: '1:1', label: '1:1 — Square' }]}
                  />
                  <Sel id="vt-resolution" label="Resolution" value={settings.exportResolution}
                    onChange={v => set('exportResolution', v as ExportResolution)} disabled={isLoading}
                    options={[{ value: '720p', label: '720p' }, { value: '1080p', label: '1080p' }, { value: '2K', label: '2K' }, { value: '4K', label: '4K' }]}
                  />
                </div>

                <div className="space-y-1">
                  <label className="form-label">Render Profile</label>
                  <div className="grid grid-cols-3 gap-1.5">
                    {([
                      { value: 'fast_preview', label: 'Preview', desc: '24fps · ultrafast' },
                      { value: 'balanced',     label: 'Balanced', desc: '30fps · medium', badge: '★' },
                      { value: 'high_quality', label: 'HQ',      desc: '30fps · slow' },
                    ] as const).map(p => {
                      const active = settings.renderProfile === p.value
                      return (
                        <button key={p.value} id={`vt-profile-${p.value}`} type="button" disabled={isLoading}
                          onClick={() => !isLoading && set('renderProfile', p.value as RenderProfile)}
                          className="relative flex flex-col items-start gap-0.5 rounded-lg px-2.5 py-2 text-left focus:outline-none"
                          style={{
                            background: active ? 'var(--accent-subtle)' : 'var(--bg-input)',
                            border: `1px solid ${active ? 'var(--accent-border)' : 'var(--border-input)'}`,
                            opacity: isLoading ? 0.5 : 1, cursor: isLoading ? 'not-allowed' : 'pointer',
                          }}
                        >
                          {'badge' in p && p.badge && <span className="absolute top-1 right-1.5 text-[9px] font-bold" style={{ color: 'var(--accent-primary)' }}>{p.badge}</span>}
                          <span className="text-[11px] font-semibold" style={{ color: active ? 'var(--accent-primary)' : 'var(--text-primary)' }}>{p.label}</span>
                          <span className="text-[9px] leading-tight" style={{ color: 'var(--text-muted)' }}>{p.desc}</span>
                        </button>
                      )
                    })}
                  </div>
                </div>

                <Sel id="vt-fitmode" label="Fit Mode" value={settings.fitMode}
                  onChange={v => set('fitMode', v as FitMode)} disabled={isLoading}
                  options={[{ value: 'cover', label: 'Cover (crop to fill)' }, { value: 'contain', label: 'Contain (letterbox)' }]}
                />

                <Sel id="vt-fillmode" label="Clip Fill Mode" value={settings.fillMode}
                  onChange={v => set('fillMode', v as ClipFillMode)} disabled={isLoading}
                  options={[
                    { value: 'loop',      label: 'Loop to Fill' },
                    { value: 'trim_only', label: 'Trim Only' },
                    { value: 'freeze',    label: 'Freeze Last Frame' },
                  ]}
                />
                <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                  {settings.fillMode === 'loop'      ? 'Repeats short clips until the CSV segment is filled.' : ''}
                  {settings.fillMode === 'trim_only' ? 'Uses the clip once. If it is shorter than the segment, remaining time is padded safely.' : ''}
                  {settings.fillMode === 'freeze'    ? 'Plays the clip once, then holds the final frame until the segment ends.' : ''}
                </p>

                <div className="space-y-1">
                  <label htmlFor="vt-output-name" className="form-label">Output Filename</label>
                  <div className="flex items-center gap-2">
                    <input
                      id="vt-output-name" type="text" value={settings.outputName}
                      onChange={e => set('outputName', e.target.value)}
                      placeholder="video_timeline" className="form-input flex-1" disabled={isLoading} maxLength={80}
                    />
                    <span className="text-[10px] font-mono shrink-0 px-2 py-1.5 rounded-md"
                      style={{ background: 'var(--bg-input)', border: '1px solid var(--border-subtle)', color: 'var(--text-muted)' }}>
                      .mp4
                    </span>
                  </div>
                </div>
              </div>

              {/* ── Timeline Styling ── */}
              <div className="space-y-3">
                <SectionDivider label="Timeline Styling" />

                <Sel id="vt-transition" label="Transition" value={settings.transition}
                  onChange={v => set('transition', v as Transition)} disabled={isLoading}
                  options={[
                    { value: 'none',          label: 'None' },
                    { value: 'fade',          label: 'Fade' },
                    { value: 'crossfade',     label: 'Crossfade' },
                    { value: 'fade_black',    label: 'Fade to Black' },
                    { value: 'fade_white',    label: 'Fade to White' },
                    { value: 'slide_left',    label: 'Slide Left' },
                    { value: 'slide_right',   label: 'Slide Right' },
                    { value: 'slide_up',      label: 'Slide Up' },
                    { value: 'slide_down',    label: 'Slide Down' },
                    { value: 'push_left',     label: 'Push Left' },
                    { value: 'push_right',    label: 'Push Right' },
                    { value: 'zoom_in',       label: 'Zoom In' },
                    { value: 'zoom_out',      label: 'Zoom Out' },
                    { value: 'blur_crossfade',label: 'Blur Crossfade' },
                    { value: 'flash',         label: 'Flash' },
                  ]}
                />

                {settings.transition !== 'none' && (
                  <Sel id="vt-transition-dur" label="Transition Duration" value={settings.transitionDuration}
                    onChange={v => set('transitionDuration', v as TransitionDuration)} disabled={isLoading}
                    options={[
                      { value: '0.2', label: '0.2s — Quick' },
                      { value: '0.5', label: '0.5s — Default' },
                      { value: '0.8', label: '0.8s — Smooth' },
                      { value: '1.0', label: '1.0s — Slow' },
                    ]}
                  />
                )}

                <Sel id="vt-visual-effect" label="Visual Style" value={settings.visualEffect}
                  onChange={v => set('visualEffect', v as VisualEffect)} disabled={isLoading}
                  options={[
                    { value: 'none',          label: 'None' },
                    { value: 'cinematic',     label: 'Cinematic' },
                    { value: 'warm',          label: 'Warm' },
                    { value: 'high_contrast', label: 'High Contrast' },
                    { value: 'black_and_white', label: 'Black & White' },
                    { value: 'clean_bright',  label: 'Clean Bright' },
                  ]}
                />

                {settings.visualEffect !== 'none' && (
                  <Sel id="vt-effect-strength" label="Effect Strength" value={settings.effectStrength}
                    onChange={v => set('effectStrength', v as EffectStrength)} disabled={isLoading}
                    options={[
                      { value: 'low',    label: 'Low' },
                      { value: 'medium', label: 'Medium' },
                      { value: 'high',   label: 'High' },
                    ]}
                  />
                )}
              </div>

              {/* ── Enhancements ── */}
              <div className="space-y-3">
                <SectionDivider label="Enhancements" />

                {/* Intro */}
                <div className="space-y-1.5">
                  <p className="text-[11px] font-semibold" style={{ color: 'var(--text-primary)' }}>Intro Video <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(optional)</span></p>
                  <VideoDropZone
                    id="vt-intro-upload"
                    label="Upload Intro"
                    description=".mp4, .mov, .webm"
                    accept="video/*,.mp4,.mov,.webm"
                    icon={<IconFilm size={14} />}
                    file={introFile}
                    onChange={handleIntroChange}
                    disabled={isLoading}
                  />
                </div>

                {/* Outro */}
                <div className="space-y-1.5">
                  <p className="text-[11px] font-semibold" style={{ color: 'var(--text-primary)' }}>Outro Video <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(optional)</span></p>
                  <VideoDropZone
                    id="vt-outro-upload"
                    label="Upload Outro"
                    description=".mp4, .mov, .webm"
                    accept="video/*,.mp4,.mov,.webm"
                    icon={<IconFilm size={14} />}
                    file={outroFile}
                    onChange={handleOutroChange}
                    disabled={isLoading}
                  />
                </div>

                {/* Watermark */}
                <div className="space-y-2">
                  <p className="text-[11px] font-semibold" style={{ color: 'var(--text-primary)' }}>
                    Watermark
                    {settings.watermarkText.trim() && (
                      <span className="ml-2 text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded"
                        style={{ background: 'var(--accent-subtle)', border: '1px solid var(--accent-border)', color: 'var(--accent-primary)' }}>
                        ON
                      </span>
                    )}
                  </p>
                  <input
                    id="vt-watermark-text"
                    type="text"
                    placeholder="Watermark text (leave blank to disable)"
                    value={settings.watermarkText}
                    onChange={e => handleWmTextChange(e.target.value)}
                    className="form-input w-full"
                    disabled={isLoading}
                    maxLength={80}
                  />
                  {settings.watermarkText.trim() && (
                    <div className="space-y-2">
                      <Sel id="vt-wm-pos" label="Position" value={settings.watermarkPosition}
                        onChange={v => set('watermarkPosition', v as WatermarkPosition)} disabled={isLoading}
                        options={[
                          { value: 'bottom_right', label: 'Bottom Right' },
                          { value: 'bottom_left',  label: 'Bottom Left' },
                          { value: 'top_right',    label: 'Top Right' },
                          { value: 'top_left',     label: 'Top Left' },
                          { value: 'center',       label: 'Center' },
                        ]}
                      />
                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1">
                          <label className="form-label">Size</label>
                          <input type="range" min={8} max={60} value={settings.watermarkSize}
                            onChange={e => set('watermarkSize', Number(e.target.value))}
                            className="w-full" disabled={isLoading} />
                          <p className="text-[10px] text-right" style={{ color: 'var(--text-muted)' }}>{settings.watermarkSize}</p>
                        </div>
                        <div className="space-y-1">
                          <label className="form-label">Opacity</label>
                          <input type="range" min={10} max={100} value={settings.watermarkOpacity}
                            onChange={e => set('watermarkOpacity', Number(e.target.value))}
                            className="w-full" disabled={isLoading} />
                          <p className="text-[10px] text-right" style={{ color: 'var(--text-muted)' }}>{settings.watermarkOpacity}%</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Behavior notes */}
              <div className="p-3 rounded-xl space-y-2" style={{ background: 'var(--bg-input)', border: '1px solid var(--border-subtle)' }}>
                <p className="text-[10px] font-semibold" style={{ color: 'var(--text-muted)' }}>Audio Behavior</p>
                <p className="text-[10px] leading-relaxed" style={{ color: 'var(--text-muted)' }}>
                  Clip audio is muted. Main audio is used as the final track. Video is trimmed or padded to match audio length.
                </p>
              </div>

            </div>
          </div>

        </div>
      </main>
    </>
  )
}
