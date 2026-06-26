import React, { useState, useCallback, useEffect } from 'react'
import {
  IconGrid,
  IconMusic,
  IconFileText,
  IconSparkles,
  IconLoader,
  IconDownload,
  IconCheck,
  IconAlertTriangle,
  IconX,
  IconFilm,
} from './icons'
import ProgressOverlay from './ProgressOverlay'
import type {
  MediaTimelineSettings,
  GenerateStatus,
  JobStatus,
  GenerateResponse,
} from '../types'
import { startMediaTimelineJob } from '../utils/api'

// ── Constants ─────────────────────────────────────────────────────────────────

const CSV_TEMPLATE = `start,end,asset,text\n0,5,1.png,"Opening image"\n5,10,1.mp4,"First video clip"\n10,15,2.jpg,"Second image"\n15,20,2.mp4,"Second video clip"\n20,25,,"Text-only screen"\n`

const DEFAULT_SETTINGS: MediaTimelineSettings = {
  aspectRatio:      '9:16',
  exportResolution: '1080p',
  fitMode:          'cover',
  fillMode:         'loop',
  renderProfile:    'balanced',
  outputName:       'media_timeline',
  textPosition:     'bottom_center',
  textSize:         'medium',
  textColor:        'white',
  textBackground:   'soft_shadow',
  textWidth:        'wide',
  textAlignment:    'center',
  // Batch 11D
  transition:          'none',
  transitionDuration:  '0.5',
  visualEffect:        'none',
  effectStrength:      'medium',
  enableWatermark:       false,
  watermarkText:         '',
  watermarkPositionMode: 'preset',
  watermarkCoordinateMode: 'design_canvas',
  watermarkPosition:     'white_default',
  watermarkX:            50,
  watermarkY:            50,
  watermarkOpacity:      65,
  watermarkSize:         20,
  watermarkMargin:       36,
  // Batch 12A
  motionStyle:         'none',
  motionIntensity:     'medium',
  // Background Music
  backgroundMusicFile: null as File | null,
  backgroundMusicVolume: 15,
  backgroundMusicLoop: true,
  backgroundMusicFade: true,
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

function MediaDropZone({
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

function MediaTimelineResult({
  result, rowCount, settings,
}: { result: GenerateResponse; rowCount: number; settings: MediaTimelineSettings }) {
  const videoUrl = result.output_video_url
  const hasVideo = result.success && videoUrl
  const filename = result.output_filename ?? 'media_timeline.mp4'

  let imageRows = 0
  let videoRows = 0
  let textRows = 0
  
  // Just count basic extensions from timeline report if available
  result.timeline_report.forEach(r => {
    if (!r.image || r.image.trim() === '') textRows++
    else if (/\.(mp4|mov|webm)$/i.test(r.image)) videoRows++
    else imageRows++
  })

  let chips = result.success ? [
    `Mode: Media Timeline`,
    `Rows: ${rowCount}`,
    `Images: ${imageRows}`,
    `Videos: ${videoRows}`,
    `Text-only: ${textRows}`,
    `Res: ${settings.exportResolution}`,
    `Profile: ${settings.renderProfile.replace('_', ' ')}`,
    `Fit: ${settings.fitMode}`,
    `Fill: ${settings.fillMode}`,
    `Text: ${settings.textPosition.replace('_', ' ')} (${settings.textSize})`,
  ] : ['Generation Failed']

  if (settings.transition !== 'none') chips.push(`Trans: ${settings.transition.replace('_', ' ')}`)
  if (settings.visualEffect !== 'none') chips.push(`Style: ${settings.visualEffect.replace('_', ' ')}`)
  chips.push(
    ...(settings.watermarkText.trim() ? ['Watermark: on'] : []),
    ...(settings.enableIntro ? ['Intro: on'] : []),
    ...(settings.enableOutro ? ['Outro: on'] : []),
    ...(settings.motionStyle !== 'none' ? [`Motion: ${settings.motionStyle.replace(/_/g, ' ')}`] : []),
    ...(settings.backgroundMusicFile ? [`Bg Music: On`, `Vol: ${settings.backgroundMusicVolume}%`, `Loop: ${settings.backgroundMusicLoop ? 'On' : 'Off'}`, `Fade: ${settings.backgroundMusicFade ? 'On' : 'Off'}`] : []),
  )
  if (result.visual_duration) chips.push(`Visual: ${result.visual_duration.toFixed(2)}s`)
  if (result.audio_duration) chips.push(`Audio: ${result.audio_duration.toFixed(2)}s`)

  return (
    <div className="card p-5 space-y-4 animate-fade-in" style={{ border: `1px solid ${result.success ? 'var(--color-success-border)' : 'var(--color-error-border)'}`, background: result.success ? 'var(--color-success-bg)' : 'var(--bg-card)' }}>
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-sm font-bold flex items-center gap-2" style={{ color: result.success ? 'var(--color-success)' : 'var(--color-error)' }}>
            {result.success ? <IconCheck size={16} /> : <IconAlertTriangle size={16} />}
            {result.success ? 'Media Timeline Ready' : 'Generation Failed'}
          </h2>
          {result.success && result.elapsed_seconds && (
            <p className="text-[11px] mt-1" style={{ color: 'var(--text-muted)' }}>
              Completed in {result.elapsed_seconds.toFixed(1)}s
            </p>
          )}
        </div>
        {hasVideo && (
          <a
            href={videoUrl}
            download={filename}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors"
            style={{ background: 'var(--accent-primary)', color: '#fff' }}
          >
            <IconDownload size={14} /> Download MP4
          </a>
        )}
      </div>

      <div className="flex flex-wrap gap-1.5">
        {chips.map(c => (
          <span key={c} className="text-[9px] font-semibold px-2 py-0.5 rounded-full" style={{ background: 'var(--bg-input)', border: '1px solid var(--border-subtle)', color: 'var(--text-secondary)' }}>
            {c}
          </span>
        ))}
      </div>

      {hasVideo && (
        <div className="relative w-full aspect-video rounded-xl overflow-hidden bg-black shadow-inner border border-[var(--border-subtle)]">
          <video src={videoUrl} controls className="absolute inset-0 w-full h-full object-contain" />
        </div>
      )}

      {result.warnings?.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-xs font-bold" style={{ color: 'var(--color-warning)' }}>Warnings</h3>
          <ul className="text-[11px] space-y-1" style={{ color: 'var(--color-warning)' }}>
            {result.warnings.map((w, i) => <li key={i} className="flex items-start gap-1.5"><IconAlertTriangle size={12} className="shrink-0 mt-0.5" /> <span>{w}</span></li>)}
          </ul>
        </div>
      )}

      {result.errors?.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-xs font-bold" style={{ color: 'var(--color-error)' }}>Errors</h3>
          <ul className="text-[11px] space-y-1" style={{ color: 'var(--color-error)' }}>
            {result.errors.map((e, i) => <li key={i} className="flex items-start gap-1.5"><IconX size={12} className="shrink-0 mt-0.5" /> <span>{e}</span></li>)}
          </ul>
        </div>
      )}
    </div>
  )
}

// ── Main Page ──────────────────────────────────────────────────────────────────

export default function MediaTimelinePage() {
  const [audioInputMode, setAudioInputMode] = useState<'single' | 'zip'>('single')
  const [audioFile, setAudioFile] = useState<File | null>(null)
  const [audioZip,  setAudioZip]  = useState<File | null>(null)
  const [mediaZip, setMediaZip] = useState<File | null>(null)
  const [timelineCsv, setTimelineCsv] = useState<File | null>(null)
  const [introFile, setIntroFile] = useState<File | null>(null)
  const [outroFile, setOutroFile] = useState<File | null>(null)
  
  const [settings, setSettings] = useState<MediaTimelineSettings>(DEFAULT_SETTINGS)

  const [status, setStatus] = useState<GenerateStatus>('idle')
  const [jobId, setJobId] = useState<string | null>(null)
  const [jobStatus, setJobStatus] = useState<JobStatus | null>(null)
  const [result, setResult] = useState<GenerateResponse | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const set = useCallback(<K extends keyof MediaTimelineSettings>(k: K, v: MediaTimelineSettings[K]) => {
    setSettings(prev => ({ ...prev, [k]: v }))
  }, [])

  const handleIntroChange = (f: File | null) => {
    setIntroFile(f)
    set('enableIntro', !!f)
  }
  const handleOutroChange = (f: File | null) => {
    setOutroFile(f)
    set('enableOutro', !!f)
  }
  const handleWmTextChange = (text: string) => {
    set('watermarkText', text)
    set('enableWatermark', text.trim().length > 0)
  }

  const disabled = status === 'uploading' || status === 'generating' || status === 'cancelling'
  const isReady  = (audioInputMode === 'single' ? !!audioFile : !!audioZip) && !!mediaZip && !!timelineCsv && !disabled

  const handleJobComplete = useCallback((statusData: JobStatus) => {
    setJobStatus(statusData)
    if (statusData.status === 'completed') {
      setResult({
        success: true,
        job_id: statusData.job_id,
        output_video_url: statusData.output_video_url,
        output_filename: statusData.output_filename ?? undefined,
        timeline_report: statusData.timeline_report,
        warnings: statusData.warnings,
        errors:   statusData.errors,
        visual_duration: statusData.visual_duration,
        audio_duration: statusData.audio_duration,
      })
      setStatus('done')
    } else {
      setResult({
        success: false,
        errors:  statusData.errors.length ? statusData.errors : ['Media timeline generation failed.'],
        warnings: statusData.warnings,
        timeline_report: statusData.timeline_report,
      })
      setStatus('error')
    }
  }, [])

  const handleCancelled = useCallback(() => {
    setJobId(null)
    setStatus('idle')
    setErrorMsg('Generation cancelled.')
    setTimeout(() => setErrorMsg(null), 4000)
  }, [])

  const handleGenerate = async () => {
    if (!isReady) return
    setStatus('uploading')
    setErrorMsg(null)
    setResult(null)
    setJobId(null)
    setJobStatus(null)

    try {
      const res = await startMediaTimelineJob(
        audioInputMode,
        audioFile,
        audioZip,
        mediaZip,
        timelineCsv,
        settings,
        introFile,
        outroFile
      )
      setJobId(res.job_id)
      setStatus('generating')
    } catch (err: any) {
      console.error(err)
      setErrorMsg(err.message || 'Failed to start generation.')
      setStatus('error')
    }
  }

  const handleDownloadCsvTemplate = () => {
    const blob = new Blob([CSV_TEMPLATE], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'media_timeline_template.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <main className="max-w-7xl mx-auto w-full px-4 sm:px-6 py-6 animate-fade-in">
      <div className="flex flex-col xl:flex-row gap-6 items-start">

        {/* ── LEFT COLUMN ── */}
        <div className="flex-1 min-w-0 space-y-6">

          {/* Uploads */}
          <div className="card p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>Media Source Files</h2>
                <p className="text-[11px] mt-0.5" style={{ color: 'var(--text-muted)' }}>Combine audio, images, videos, and text using a CSV timeline.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-3">
                <div className="flex gap-2 p-1 bg-[var(--bg-input)] rounded-lg">
                  <button
                    className={`flex-1 text-[11px] font-medium py-1.5 rounded-md transition-colors ${audioInputMode === 'single' ? 'bg-[var(--bg-elevated)] shadow-sm text-[var(--text-primary)]' : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'}`}
                    onClick={() => setAudioInputMode('single')}
                  >
                    Single File
                  </button>
                  <button
                    className={`flex-1 text-[11px] font-medium py-1.5 rounded-md transition-colors ${audioInputMode === 'zip' ? 'bg-[var(--bg-elevated)] shadow-sm text-[var(--text-primary)]' : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'}`}
                    onClick={() => setAudioInputMode('zip')}
                  >
                    Parts ZIP
                  </button>
                </div>
                {audioInputMode === 'single' ? (
                  <MediaDropZone
                    id="mt-audio-single"
                    label="Main Audio"
                    description="Upload one main audio file."
                    accept="audio/mpeg,audio/wav,audio/aac,audio/x-m4a,audio/mp4,.m4a"
                    icon={<IconMusic size={18} />}
                    file={audioFile}
                    onChange={setAudioFile}
                    required
                    disabled={disabled}
                  />
                ) : (
                  <MediaDropZone
                    id="mt-audio-zip"
                    label="Audio Parts ZIP"
                    description="ZIP of 1.mp3, 2.mp3..."
                    accept="application/zip,application/x-zip-compressed,.zip"
                    icon={<IconFileText size={18} />}
                    file={audioZip}
                    onChange={setAudioZip}
                    required
                    disabled={disabled}
                  />
                )}
              </div>
              <MediaDropZone
                id="media-zip"
                label="Media ZIP"
                description="ZIP with images and videos."
                accept="application/zip,application/x-zip-compressed,.zip"
                icon={<IconGrid size={18} />}
                file={mediaZip}
                onChange={setMediaZip}
                required
                disabled={disabled}
              />
              <MediaDropZone
                id="timeline-csv"
                label="Timeline CSV"
                description="CSV controlling the timeline."
                accept="text/csv,.csv"
                icon={<IconFileText size={18} />}
                file={timelineCsv}
                onChange={setTimelineCsv}
                required
                disabled={disabled}
              />
            </div>
            
            <div>
              <div className="flex items-center gap-2 mt-1 mb-3">
                <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>Optional Appends</span>
                <div className="flex-1 h-px" style={{ background: 'var(--border-subtle)' }} />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <MediaDropZone id="mt-intro-upload" label="Intro Video" description="Appended before timeline" accept="video/mp4,video/quicktime,video/webm"
                  icon={<IconFilm size={14} />} file={introFile} onChange={handleIntroChange} disabled={disabled} />
                <MediaDropZone id="mt-outro-upload" label="Outro Video" description="Appended after timeline" accept="video/mp4,video/quicktime,video/webm"
                  icon={<IconFilm size={14} />} file={outroFile} onChange={handleOutroChange} disabled={disabled} />
              </div>
            </div>
          </div>

          {/* Basic Settings */}
          <div className="card p-5 space-y-4">
            <div>
              <h2 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>Video Settings</h2>
              <p className="text-[11px] mt-0.5" style={{ color: 'var(--text-muted)' }}>Configure core dimensions and playback behaviors.</p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <Sel id="aspect-ratio" label="Aspect Ratio" value={settings.aspectRatio} disabled={disabled} onChange={v => set('aspectRatio', v)}
                options={[ { value: '9:16', label: '9:16 Vertical' }, { value: '16:9', label: '16:9 Landscape' }, { value: '1:1', label: '1:1 Square' } ]} />
              
              <Sel id="export-resolution" label="Resolution" value={settings.exportResolution} disabled={disabled} onChange={v => set('exportResolution', v)}
                options={[ { value: '720p', label: '720p Fast' }, { value: '1080p', label: '1080p HD' }, { value: '2K', label: '2K Sharp' }, { value: '4K', label: '4K Ultra' } ]} />

              <Sel id="fit-mode" label="Fit Mode" value={settings.fitMode} disabled={disabled} onChange={v => set('fitMode', v)}
                options={[ { value: 'cover', label: 'Cover (Crop)' }, { value: 'contain', label: 'Contain (Pad)' } ]} />

              <Sel id="fill-mode" label="Clip Fill Mode" value={settings.fillMode} disabled={disabled} onChange={v => set('fillMode', v)}
                options={[ { value: 'loop', label: 'Loop to Fill' }, { value: 'trim_only', label: 'Trim Only' }, { value: 'freeze', label: 'Freeze Last Frame' } ]} />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <Sel id="render-profile" label="Render Profile" value={settings.renderProfile} disabled={disabled} onChange={v => set('renderProfile', v)}
                options={[ { value: 'fast_preview', label: 'Fast Preview' }, { value: 'balanced', label: 'Balanced' }, { value: 'high_quality', label: 'High Quality' } ]} />

              <div className="space-y-1">
                <label htmlFor="output-name" className="form-label">Output Filename</label>
                <input
                  id="output-name" type="text" value={settings.outputName} disabled={disabled}
                  onChange={e => set('outputName', e.target.value.replace(/[^a-zA-Z0-9_ -]/g, ''))}
                  placeholder="media_timeline"
                  className="form-input"
                />
              </div>
            </div>
          </div>

          {/* Text Style Settings */}
          <div className="card p-5 space-y-4">
            <div>
              <h2 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>Text Style</h2>
              <p className="text-[11px] mt-0.5" style={{ color: 'var(--text-muted)' }}>Configure default appearance for text overlays and text-only rows.</p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <Sel id="text-position" label="Position" value={settings.textPosition} disabled={disabled} onChange={v => set('textPosition', v)}
                options={[
                  { value: 'bottom_center', label: 'Bottom Center' },
                  { value: 'lower_third',   label: 'Lower Third' },
                  { value: 'center',        label: 'Center' },
                  { value: 'top_center',    label: 'Top Center' },
                  { value: 'bottom_left',   label: 'Bottom Left' },
                  { value: 'bottom_right',  label: 'Bottom Right' }
                ]} />
              
              <Sel id="text-size" label="Size" value={settings.textSize} disabled={disabled} onChange={v => set('textSize', v)}
                options={[
                  { value: 'small',       label: 'Small' },
                  { value: 'medium',      label: 'Medium' },
                  { value: 'large',       label: 'Large' },
                  { value: 'extra_large', label: 'Extra Large' }
                ]} />

              <Sel id="text-color" label="Color" value={settings.textColor} disabled={disabled} onChange={v => set('textColor', v)}
                options={[
                  { value: 'white',  label: 'White' },
                  { value: 'yellow', label: 'Yellow' },
                  { value: 'black',  label: 'Black' },
                  { value: 'accent', label: 'Accent' }
                ]} />

              <Sel id="text-background" label="Background" value={settings.textBackground} disabled={disabled} onChange={v => set('textBackground', v)}
                options={[
                  { value: 'none',        label: 'None' },
                  { value: 'soft_shadow', label: 'Soft Shadow' },
                  { value: 'dark_box',    label: 'Dark Box' },
                  { value: 'light_box',   label: 'Light Box' },
                  { value: 'blur_box',    label: 'Blur Box' }
                ]} />

              <Sel id="text-width" label="Width" value={settings.textWidth} disabled={disabled} onChange={v => set('textWidth', v)}
                options={[
                  { value: 'narrow', label: 'Narrow (55%)' },
                  { value: 'medium', label: 'Medium (70%)' },
                  { value: 'wide',   label: 'Wide (85%)' }
                ]} />

              <Sel id="text-alignment" label="Alignment" value={settings.textAlignment} disabled={disabled} onChange={v => set('textAlignment', v)}
                options={[
                  { value: 'left',   label: 'Left' },
                  { value: 'center', label: 'Center' },
                  { value: 'right',  label: 'Right' }
                ]} />
            </div>
          </div>

          {/* ── Motion Style ── */}
          <div className="card p-5 space-y-4">
            <div>
              <h2 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>Motion Style</h2>
              <p className="text-[11px] mt-0.5" style={{ color: 'var(--text-muted)' }}>Apply motion to your media.</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Sel id="mt-motion-style" label="Motion Style" value={settings.motionStyle} disabled={disabled} onChange={v => set('motionStyle', v as any)}
                options={[
                  { value: 'none',             label: 'None' },
                  { value: 'slow_zoom_in',     label: 'Subtle Zoom In' },
                  { value: 'slow_zoom_out',    label: 'Subtle Zoom Out' },
                  { value: 'pan_left',         label: 'Slow Pan Left' },
                  { value: 'pan_right',        label: 'Slow Pan Right' },
                  { value: 'pan_up',           label: 'Slow Pan Up' },
                  { value: 'pan_down',         label: 'Slow Pan Down' },
                  { value: 'ken_burns',        label: 'Ken Burns' },
                  { value: 'dynamic_shorts',   label: 'Dynamic Shorts Motion' },
                  { value: 'subtle_random',    label: 'Gentle Handheld' },
                ]}
              />

              {settings.motionStyle !== 'none' && (
                <Sel id="mt-motion-intensity" label="Intensity" value={settings.motionIntensity} disabled={disabled} onChange={v => set('motionIntensity', v as any)}
                  options={[
                    { value: 'low',    label: 'Low' },
                    { value: 'medium', label: 'Medium' },
                    { value: 'high',   label: 'High' },
                  ]}
                />
              )}
            </div>
          </div>

          {/* ── Background Music ── */}
          <div className="card p-5 space-y-4">
            <div>
              <h2 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>Background Music</h2>
              <p className="text-[11px] mt-0.5" style={{ color: 'var(--text-muted)' }}>Optional music track mixed under the main voice audio.</p>
            </div>
            
            <MediaDropZone
              id="mt-bg-music-upload"
              label="Upload Music"
              description="mp3, wav, m4a, aac"
              accept="audio/mpeg,audio/wav,audio/aac,audio/x-m4a,audio/mp4,.m4a"
              icon={<IconMusic size={14} />}
              file={settings.backgroundMusicFile}
              onChange={(f) => set('backgroundMusicFile', f as any)}
              disabled={disabled}
            />

            {settings.backgroundMusicFile && (
              <div className="space-y-3">
                <div className="flex items-center gap-2 mt-1 mb-3">
                  <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>Music Controls</span>
                  <div className="flex-1 h-px" style={{ background: 'var(--border-subtle)' }} />
                </div>
                <div className="space-y-1 mt-2">
                  <div className="flex justify-between items-center">
                    <label className="form-label mb-0">Music Volume</label>
                    <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{settings.backgroundMusicVolume}%</span>
                  </div>
                  <input type="range" min={0} max={100} value={settings.backgroundMusicVolume}
                    onChange={e => set('backgroundMusicVolume', Number(e.target.value) as any)}
                    className="w-full" disabled={disabled} />
                </div>

                <div className="flex flex-col gap-2">
                  <label className="flex items-center gap-2 text-[12px]" style={{ color: 'var(--text-primary)', cursor: disabled ? 'not-allowed' : 'pointer' }}>
                    <input type="checkbox" checked={settings.backgroundMusicLoop} onChange={e => set('backgroundMusicLoop', e.target.checked as any)} disabled={disabled} />
                    Loop music to full video length
                  </label>
                  <label className="flex items-center gap-2 text-[12px]" style={{ color: 'var(--text-primary)', cursor: disabled ? 'not-allowed' : 'pointer' }}>
                    <input type="checkbox" checked={settings.backgroundMusicFade} onChange={e => set('backgroundMusicFade', e.target.checked as any)} disabled={disabled} />
                    Fade music in/out
                  </label>
                </div>
              </div>
            )}
          </div>

          {/* Advanced Enhancements (Batch 11D) */}
          <div className="card p-5 space-y-4">
            <div>
              <h2 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>Enhancements</h2>
              <p className="text-[11px] mt-0.5" style={{ color: 'var(--text-muted)' }}>Transitions and visual styles.</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Sel id="transition" label="Transition" value={settings.transition} disabled={disabled} onChange={v => set('transition', v)}
                options={[
                  { value: 'none', label: 'None (Hard Cut)' },
                  { value: 'crossfade', label: 'Crossfade' },
                  { value: 'fade_black', label: 'Fade to Black' },
                  { value: 'slide_left', label: 'Slide Left' },
                  { value: 'slide_right', label: 'Slide Right' },
                  { value: 'zoom_in', label: 'Zoom In' }
                ]} />
              <Sel id="transition-duration" label="Transition Duration" value={settings.transitionDuration} disabled={disabled} onChange={v => set('transitionDuration', v)}
                options={[ { value: '0.2', label: '0.2s (Fast)' }, { value: '0.5', label: '0.5s (Medium)' }, { value: '1.0', label: '1.0s (Slow)' } ]} />
              <Sel id="visual-effect" label="Visual Style" value={settings.visualEffect} disabled={disabled} onChange={v => set('visualEffect', v)}
                options={[
                  { value: 'none', label: 'None' },
                  { value: 'cinematic', label: 'Cinematic' },
                  { value: 'high_contrast', label: 'Vintage / Film' },
                  { value: 'black_and_white', label: 'Black & White' },
                  { value: 'clean_bright', label: 'Clean & Bright' },
                  { value: 'warm', label: 'Warm Glow' }
                ]} />
              <Sel id="effect-strength" label="Style Strength" value={settings.effectStrength} disabled={disabled} onChange={v => set('effectStrength', v)}
                options={[ { value: 'low', label: 'Low' }, { value: 'medium', label: 'Medium' }, { value: 'high', label: 'High' } ]} />
            </div>
          </div>

          {/* Watermark (Batch 11D) */}
          <div className="card p-5 space-y-4">
            <div>
              <h2 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>Watermark</h2>
              <p className="text-[11px] mt-0.5" style={{ color: 'var(--text-muted)' }}>Add text over your entire timeline.</p>
            </div>
            <div className="grid grid-cols-1 gap-4">
              <div className="space-y-1">
                <label className="form-label" htmlFor="wm-text">Watermark Text</label>
                <input
                  id="wm-text" type="text" placeholder="e.g. MyBrand" className="form-input" disabled={disabled}
                  value={settings.watermarkText} onChange={(e) => handleWmTextChange(e.target.value)}
                />
              </div>
            </div>
            
            {settings.enableWatermark && (
              <div className="animate-fade-in mt-4">
                <div className="flex items-center gap-2 mt-1 mb-3">
                  <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>Watermark Options</span>
                  <div className="flex-1 h-px" style={{ background: 'var(--border-subtle)' }} />
                </div>
                <div className="grid grid-cols-2 gap-4 mt-4">
                  <Sel id="wm-pos-mode" label="Position Mode" value={settings.watermarkPositionMode} disabled={disabled} onChange={v => set('watermarkPositionMode', v)}
                    options={[ { value: 'preset', label: 'Preset Position' }, { value: 'custom', label: 'Custom (X/Y px)' } ]} />
                  
                  {settings.watermarkPositionMode === 'preset' ? (
                    <Sel id="wm-pos" label="Position" value={settings.watermarkPosition} disabled={disabled} onChange={v => set('watermarkPosition', v)}
                      options={[
                        { value: 'white_default', label: 'White Default (Bottom Center)' },
                        { value: 'bottom_right', label: 'Bottom Right' },
                        { value: 'bottom_left', label: 'Bottom Left' },
                        { value: 'top_right', label: 'Top Right' },
                        { value: 'top_left', label: 'Top Left' },
                        { value: 'center', label: 'Center' }
                      ]} />
                  ) : (
                    <div className="flex flex-col gap-2">
                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1">
                          <label className="form-label" htmlFor="wm-x">X px</label>
                          <input id="wm-x" type="number" className="form-input text-center" value={settings.watermarkX} onChange={e => set('watermarkX', parseInt(e.target.value) || 0)} disabled={disabled} />
                        </div>
                        <div className="space-y-1">
                          <label className="form-label" htmlFor="wm-y">Y px</label>
                          <input id="wm-y" type="number" className="form-input text-center" value={settings.watermarkY} onChange={e => set('watermarkY', parseInt(e.target.value) || 0)} disabled={disabled} />
                        </div>
                      </div>
                      
                      <div className="space-y-1 mt-1">
                        <label className="form-label" htmlFor="wm-coord-mode">Coordinate Mode</label>
                        <select id="wm-coord-mode" value={settings.watermarkCoordinateMode} onChange={e => set('watermarkCoordinateMode', e.target.value as any)} className="form-select" disabled={disabled}>
                          <option value="design_canvas">Design Canvas X/Y</option>
                          <option value="final_pixels">Final Export Pixels</option>
                        </select>
                      </div>
                      
                      <div className="text-[10px] mt-1" style={{ color: 'var(--text-muted)' }}>
                        {settings.watermarkCoordinateMode === 'design_canvas' ? (
                          <>
                            {settings.aspectRatio === '9:16' && "X/Y are based on a 1080x1920 design canvas and automatically scale to 720p, 1080p, 2K, and 4K."}
                            {settings.aspectRatio === '16:9' && "X/Y are based on a 1920x1080 design canvas and automatically scale to 720p, 1080p, 2K, and 4K."}
                            {settings.aspectRatio === '1:1' && "X/Y are based on a 1080x1080 design canvas and automatically scale to 720p, 1080p, 2K, and 4K."}
                          </>
                        ) : (
                          <>
                            X/Y use the final export resolution directly. You may need different values for 720p, 1080p, 2K, and 4K.
                            <br/><br/>
                            <span style={{ color: 'var(--text-primary)' }}>Recommended: Use Design Canvas X/Y for consistent placement across resolutions.</span>
                          </>
                        )}
                      </div>
                    </div>
                  )}
                  
                  <div className="space-y-1">
                    <div className="flex justify-between">
                      <label className="form-label">Opacity ({settings.watermarkOpacity}%)</label>
                    </div>
                    <input type="range" min="10" max="100" className="w-full mt-2" value={settings.watermarkOpacity} onChange={e => set('watermarkOpacity', parseInt(e.target.value))} disabled={disabled} />
                  </div>
                  
                  <div className="space-y-1">
                    <div className="flex justify-between">
                      <label className="form-label">Size ({settings.watermarkSize}px base)</label>
                    </div>
                    <input type="range" min="10" max="80" className="w-full mt-2" value={settings.watermarkSize} onChange={e => set('watermarkSize', parseInt(e.target.value))} disabled={disabled} />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Error display */}
          {errorMsg && (
            <div className="alert-error animate-fade-in">
              <IconAlertTriangle size={14} className="shrink-0 mt-0.5" />
              <p className="text-xs">{errorMsg}</p>
            </div>
          )}

          {/* Results display */}
          {status === 'done' && result && (
            <MediaTimelineResult result={result} rowCount={jobStatus?.timeline_report?.length ?? 0} settings={settings} />
          )}

        </div>

        {/* ── RIGHT COLUMN ── */}
        <div className="xl:w-[320px] shrink-0 space-y-6">

          {/* Generate Button */}
          <div className="card p-5 space-y-4">
            <h2 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>Action</h2>
            <button
              onClick={handleGenerate}
              disabled={!isReady}
              className={`w-full relative overflow-hidden transition-all duration-300 flex items-center justify-center gap-2 rounded-xl text-sm font-bold active:scale-[0.98] ${
                isReady
                  ? 'active:brightness-95'
                  : 'opacity-50 cursor-not-allowed'
              }`}
              style={{
                height: 52,
                background: isReady ? 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)' : 'var(--bg-elevated)',
                boxShadow: isReady ? '0 4px 16px rgba(99,102,241,0.35)' : 'none',
                color: isReady ? '#fff' : 'var(--text-muted)',
                border: isReady ? 'none' : '1px solid var(--border-default)'
              }}
              onMouseEnter={e => { if (isReady) (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 10px 28px rgba(99,102,241,0.55)' }}
              onMouseLeave={e => { if (isReady) (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 4px 16px rgba(99,102,241,0.35)' }}
            >
              {status === 'uploading' ? (
                <><IconLoader size={16} /> Uploading...</>
              ) : status === 'generating' ? (
                <><IconLoader size={16} /> Generating...</>
              ) : (
                <><IconSparkles size={16} /> {isReady ? 'Generate Media Timeline' : 'Waiting for files...'}</>
              )}
            </button>
            {isReady && status === 'idle' && (
              <div className="space-y-1 mt-2">
                <p className="text-[10px] text-center" style={{ color: 'var(--color-success)' }}>
                  Ready to generate media timeline.
                </p>
                <p className="text-[10px] text-center px-2" style={{ color: 'var(--text-muted)' }}>
                  Large Media Timeline projects may take longer to render depending on video clips, text overlays, and transitions.
                </p>
              </div>
            )}
          </div>

          {/* CSV Guide */}
          <div className="card p-5 space-y-4">
            <h2 className="text-sm font-bold flex items-center justify-between" style={{ color: 'var(--text-primary)' }}>
              CSV Format Guide
            </h2>
            
            <div className="p-3 rounded-lg font-mono text-[10px] overflow-x-auto whitespace-pre" style={{ background: 'var(--bg-input)', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)' }}>
              start,end,asset,text<br/>
              0,5,1.png,"Opening image"<br/>
              5,10,1.mp4,"First video clip"<br/>
              10,15,2.jpg,"Second image"<br/>
              15,20,2.mp4,"Second video clip"<br/>
              20,25,,"Text-only screen"
            </div>

            <button
              onClick={handleDownloadCsvTemplate}
              className="w-full flex items-center justify-center gap-2 py-2 rounded text-xs font-semibold transition-colors"
              style={{ background: 'var(--bg-input)', color: 'var(--text-secondary)', border: '1px solid var(--border-default)' }}
            >
              <IconDownload size={14} /> Download CSV Template
            </button>

            <div className="space-y-2 pt-2">
              <p className="text-[11px] font-semibold" style={{ color: 'var(--text-secondary)' }}>Columns:</p>
              <ul className="text-[10px] space-y-1.5" style={{ color: 'var(--text-muted)' }}>
                <li><code className="px-1 py-0.5 rounded bg-black/10 dark:bg-white/10 text-[9px] text-accent">start</code> = row start time in seconds</li>
                <li><code className="px-1 py-0.5 rounded bg-black/10 dark:bg-white/10 text-[9px] text-accent">end</code> = row end time in seconds</li>
                <li className="space-y-1">
                  <code className="px-1 py-0.5 rounded bg-black/10 dark:bg-white/10 text-[9px] text-accent">asset</code> = exact filename inside Media ZIP.<br/>
                  <div className="mt-1 p-2 rounded bg-[var(--bg-card)] border border-[var(--border-subtle)]">
                    <span className="font-semibold block mb-1" style={{ color: 'var(--text-primary)' }}>Note: The asset value must exactly match the filename inside your Media ZIP.</span>
                    <ul className="list-disc pl-4 space-y-0.5 text-[9px]">
                      <li>Images and videos can both use simple numbered filenames (e.g., <code>1.png</code>, <code>2.jpg</code>, <code>1.mp4</code>, <code>2.mp4</code>).</li>
                      <li>The app decides media type from the file extension.</li>
                      <li><code>.png</code>, <code>.jpg</code>, <code>.jpeg</code>, <code>.webp</code> are treated as images.</li>
                      <li><code>.mp4</code>, <code>.mov</code>, <code>.webm</code> are treated as videos.</li>
                      <li>Old names like <code>clip_1.mp4</code> still work if that exact filename exists in the ZIP.</li>
                    </ul>
                  </div>
                </li>
                <li><code className="px-1 py-0.5 rounded bg-black/10 dark:bg-white/10 text-[9px] text-accent">text</code> = optional text overlay or text-only screen</li>
              </ul>
              
              <div className="mt-2 p-2 rounded border border-[var(--border-subtle)] bg-[var(--bg-card)]">
                <p className="text-[10px] font-semibold" style={{ color: 'var(--text-primary)' }}>Advanced Optional Columns</p>
                <p className="text-[9px] mt-1" style={{ color: 'var(--text-muted)' }}>
                  Override global text styles per-row with these optional columns: <br/>
                  <code className="text-accent">text_position</code>, <code className="text-accent">text_size</code>, <code className="text-accent">text_color</code>, <code className="text-accent">text_background</code>, <code className="text-accent">text_alignment</code>
                </p>
              </div>
            </div>

            <div className="space-y-2 pt-2">
              <p className="text-[11px] font-semibold" style={{ color: 'var(--text-secondary)' }}>Row Behavior:</p>
              <div className="text-[10px] space-y-2" style={{ color: 'var(--text-muted)' }}>
                <p><strong>Image row:</strong> If asset is an image, it stays on screen for the CSV duration.</p>
                <p><strong>Video row:</strong> If asset is a video, it plays during the CSV time range.</p>
                <p><strong>Text-only row:</strong> If asset is empty but text exists, the app will create a text-only screen.</p>
                <p><strong>Repeat behavior:</strong> Use the same asset filename multiple times to reuse it later in the timeline.</p>
              </div>
            </div>
          </div>

        </div>
      </div>

      {jobId && (
        <ProgressOverlay
          jobId={jobId}
          onJobComplete={handleJobComplete}
          onCancelled={handleCancelled}
          onClose={() => setJobId(null)}
          renderSpec={{ resolution: settings.exportResolution, renderProfile: settings.renderProfile }}
        />
      )}
    </main>
  )
}
