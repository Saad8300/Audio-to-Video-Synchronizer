// components/VideoTimelinePage.tsx — Functional Video Timeline workflow (Batch 10B)

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
  GenerateStatus,
  JobStatus,
  GenerateResponse,
} from '../types'
import { startVideoTimelineJob } from '../utils/api'

// ── Constants ─────────────────────────────────────────────────────────────────

const CSV_TEMPLATE = `start,end,video\n0,5,1.mp4\n5,10,2.mp4\n10,15,3.mp4\n15,20,1.mp4\n`

const DEFAULT_SETTINGS: VideoTimelineSettings = {
  aspectRatio:      '9:16',
  exportResolution: '1080p',
  fitMode:          'cover',
  fillMode:         'loop',
  renderProfile:    'balanced',
  outputName:       'video_timeline',
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
  id, label, description, accept, icon, file, onChange, disabled, required,
}: {
  id: string; label: string; description: string; accept: string;
  icon: React.ReactNode; file: File | null;
  onChange: (f: File | null) => void; disabled?: boolean; required?: boolean;
}) {
  const [drag, setDrag] = useState(false)
  const inputRef = React.useRef<HTMLInputElement>(null)

  const handleFile = (f: File | null) => { if (f) onChange(f) }

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
      onDrop={e => { e.preventDefault(); setDrag(false); handleFile(e.dataTransfer.files[0] ?? null) }}
      className="relative flex flex-col items-center justify-center gap-2 p-4 rounded-xl text-center cursor-pointer transition-all"
      style={{
        border: `1.5px dashed ${file ? 'var(--color-success-border)' : drag ? 'var(--accent-primary)' : 'var(--border-default)'}`,
        background: file ? 'var(--color-success-bg)' : drag ? 'var(--accent-subtle)' : 'var(--bg-input)',
        minHeight: 88,
        opacity: disabled ? 0.5 : 1,
        cursor: disabled ? 'not-allowed' : 'pointer',
      }}
    >
      <input
        ref={inputRef} type="file" accept={accept} className="sr-only" disabled={disabled}
        onChange={e => handleFile(e.target.files?.[0] ?? null)}
      />
      <span style={{ color: file ? 'var(--color-success)' : 'var(--accent-primary)' }}>
        {file ? <IconCheck size={16} /> : icon}
      </span>
      <div>
        <p className="text-[11px] font-semibold" style={{ color: file ? 'var(--color-success)' : 'var(--text-primary)' }}>
          {file ? file.name : label}
          {required && !file && <span style={{ color: 'var(--color-error)' }}> *</span>}
        </p>
        {!file && (
          <p className="text-[10px] mt-0.5" style={{ color: 'var(--text-muted)' }}>{description}</p>
        )}
        {file && (
          <button
            type="button"
            onClick={e => { e.stopPropagation(); onChange(null) }}
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
  result, rowCount,
}: { result: GenerateResponse; rowCount: number }) {
  const videoUrl  = result.output_video_url
  const hasVideo  = result.success && videoUrl
  const filename  = result.output_filename ?? 'video_timeline.mp4'

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
                ? `Your video is ready to preview and download.${result.elapsed_seconds ? ` Completed in ${result.elapsed_seconds}s.` : ''}`
                : 'See error details below.'}
            </p>
            {result.success && (
              <div style={{ display: 'flex', gap: 6, marginTop: 10, flexWrap: 'wrap' }}>
                {[
                  'Mode: Video Timeline',
                  `Rows: ${rowCount}`,
                  ...(result.elapsed_seconds ? [`Time: ${result.elapsed_seconds}s`] : []),
                ].map(chip => (
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
        <div className="rounded-xl p-3.5 space-y-1.5" style={{ background: 'var(--color-error-bg)', border: '1px solid var(--color-error-border)' }}>
          <p className="text-xs font-semibold flex items-center gap-1.5" style={{ color: 'var(--color-error)' }}>
            <IconX size={12} /> {result.errors.length} Error{result.errors.length > 1 ? 's' : ''}
          </p>
          {result.errors.map((e, i) => <p key={i} className="text-xs" style={{ color: 'var(--color-error)', opacity: 0.85 }}>· {e}</p>)}
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

// ── Main page ─────────────────────────────────────────────────────────────────

export default function VideoTimelinePage() {
  // Files
  const [audioFile, setAudioFile] = useState<File | null>(null)
  const [videosZip, setVideosZip] = useState<File | null>(null)
  const [csvFile,   setCsvFile]   = useState<File | null>(null)

  // Settings
  const [settings, setSettings] = useState<VideoTimelineSettings>(DEFAULT_SETTINGS)
  const set = <K extends keyof VideoTimelineSettings>(key: K, val: VideoTimelineSettings[K]) =>
    setSettings(s => ({ ...s, [key]: val }))

  // Generation state
  const [status,       setStatus]       = useState<GenerateStatus>('idle')
  const [currentJobId, setCurrentJobId] = useState<string | null>(null)
  const [result,       setResult]       = useState<GenerateResponse | null>(null)
  const [cancelledMsg, setCancelledMsg] = useState<string | null>(null)

  const canGenerate = !!audioFile && !!videosZip && !!csvFile
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
    if (!audioFile || !videosZip || !csvFile) return
    setResult(null); setCancelledMsg(null); setStatus('uploading')
    try {
      const { job_id } = await startVideoTimelineJob(audioFile, videosZip, csvFile, settings)
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
                  {[{ label: 'Audio', file: audioFile }, { label: 'Videos', file: videosZip }, { label: 'CSV', file: csvFile }].map(({ label, file }) => (
                    <span key={label} className="flex items-center gap-1" style={{ color: file ? 'var(--color-success)' : 'var(--text-muted)' }}>
                      <span style={{ fontWeight: 700 }}>{file ? '✓' : '○'}</span> {label}
                    </span>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <VideoDropZone id="vt-audio-upload" label="Main Audio" description="MP3, WAV, M4A, AAC" accept="audio/*,.mp3,.wav,.m4a,.aac"
                  icon={<IconMusic size={14} />} file={audioFile} onChange={setAudioFile} disabled={isLoading} required />
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
10,15,3.mp4
15,20,1.mp4`}
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
                  {[
                    { label: 'Res',     value: settings.exportResolution },
                    { label: 'Profile', value: settings.renderProfile.replace('_', ' ') },
                    { label: 'Fill',    value: settings.fillMode },
                  ].map(({ label, value }) => (
                    <span key={label} className="flex items-center gap-1 px-2 py-1 rounded text-[10px]"
                      style={{ background: 'var(--accent-subtle)', border: '1px solid var(--accent-border)', color: 'var(--accent-primary)' }}>
                      <span className="font-semibold">{label}</span>
                      <span className="opacity-70">·</span>
                      <span>{value}</span>
                    </span>
                  ))}
                </div>
              </div>

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
                  {[{ label: 'Audio', file: audioFile }, { label: 'Videos ZIP', file: videosZip }, { label: 'CSV', file: csvFile }]
                    .filter(f => !f.file)
                    .map(f => (
                      <span key={f.label} className="flex items-center gap-1 text-[10px]" style={{ color: 'var(--color-error)' }}>
                        <span>✗</span> {f.label} missing
                      </span>
                    ))}
                </div>
              )}
            </div>

            {/* Results */}
            {result && <VideoTimelineResult result={result} rowCount={rowCount} />}
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

              <div className="space-y-3">
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
                  {settings.fillMode === 'loop'      ? 'Loops the clip to fill the full segment duration.' : ''}
                  {settings.fillMode === 'trim_only' ? 'Uses only the available clip length; pads remainder with black.' : ''}
                  {settings.fillMode === 'freeze'    ? 'Plays clip once then holds the last frame.' : ''}
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
                      _YYYYMMDD.mp4
                    </span>
                  </div>
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
