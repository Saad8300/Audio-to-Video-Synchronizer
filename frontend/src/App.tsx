// App.tsx – SyncFrame Studio — Professional creator dashboard

import React, { useState, useEffect, useCallback } from 'react'
import FileDropZone from './components/FileDropZone'
import CsvGuide from './components/CsvGuide'
import ToolPageHeader from './components/ToolPageHeader'
import ResultsPanel from './components/ResultsPanel'
import ProgressOverlay from './components/ProgressOverlay'
import { type AppMode } from './components/AppModeSwitcher'
import VideoTimelinePage from './components/VideoTimelinePage'
import MediaTimelinePage from './components/MediaTimelinePage'
import StudioHomePage from './components/StudioHomePage'
import AudioMergerPage from './components/AudioMergerPage'
import ScriptTimestampPage from './components/ScriptTimestampPage'
import {
  IconMusic,
  IconImage,
  IconFileText,
  IconLoader,
  IconSun,
  IconMoon,
  IconZap,
  IconSparkles,
  IconVideo,
} from './components/icons'
import type { GenerateSettings, GenerateResponse, GenerateStatus, JobStatus } from './types'
import { checkHealth, startJob } from './utils/api'

// ── Default settings ────────────────────────────────────────────────────────

const DEFAULT_SETTINGS: GenerateSettings = {
  aspectRatio:      '9:16',
  exportResolution: '1080p',
  fitMode:          'cover',
  transition:       'none',
  zoomEffect:       'none',
  renderProfile:    'balanced',
  outputName:       'my_video',
  // Batch 9A — motion & style
  stylePreset:         'clean_default',
  motionEffect:        'none',
  motionIntensity:     'medium',
  transitionDuration:  '0.5',
  visualEffect:        'none',
  effectStrength:      'medium',
  // Batch 2 — background music
  enableBgMusic:    false,
  musicVolume:      12,
  musicFade:        true,
  // Batch 3 — watermark
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
}

// ── Theme helpers ───────────────────────────────────────────────────────────

function getInitialDark(): boolean {
  try {
    const saved = localStorage.getItem('theme')
    if (saved === 'light') return false
    if (saved === 'dark')  return true
  } catch { /* noop */ }
  return true
}

function applyTheme(dark: boolean) {
  const root = document.documentElement
  if (dark) { root.classList.add('dark'); root.classList.remove('light') }
  else       { root.classList.remove('dark'); root.classList.add('light') }
  try { localStorage.setItem('theme', dark ? 'dark' : 'light') } catch { /* noop */ }
}


// ── Reusable select ─────────────────────────────────────────────────────────

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

// ── Workflow step indicator ─────────────────────────────────────────────────

type WorkflowStep = 1 | 2 | 3 | 4 | 5

const STEPS = [
  { n: 1, label: 'Upload'    },
  { n: 2, label: 'Configure' },
  { n: 3, label: 'Enhance'   },
  { n: 4, label: 'Generate'  },
  { n: 5, label: 'Export'    },
]

function WorkflowBar({ step }: { step: WorkflowStep }) {
  return (
    <div className="flex items-center gap-1">
      {STEPS.map((s, i) => {
        const done    = s.n < step
        const current = s.n === step
        return (
          <React.Fragment key={s.n}>
            <div className="flex items-center gap-1">
              <div
                className="w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-black transition-all"
                style={{
                  background: done    ? 'var(--color-success)'
                             : current ? 'var(--accent-primary)'
                             : 'var(--border-default)',
                  color: (done || current) ? '#fff' : 'var(--text-muted)',
                }}
              >
                {done ? '✓' : s.n}
              </div>
              <span
                className="text-[10px] font-semibold hidden sm:inline"
                style={{ color: current ? 'var(--text-primary)' : 'var(--text-muted)' }}
              >
                {s.label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div
                className="hidden sm:block h-px flex-1 min-w-[12px]"
                style={{ background: done ? 'var(--color-success)' : 'var(--border-subtle)' }}
              />
            )}
          </React.Fragment>
        )
      })}
    </div>
  )
}

// ── Status dot ──────────────────────────────────────────────────────────────

function StatusDot({ ok }: { ok: boolean | null }) {
  if (ok === null) return (
    <span className="flex items-center gap-1.5 text-[11px] font-medium" style={{ color: 'var(--text-muted)' }}>
      <IconLoader size={11} className="animate-spin" />
      Connecting
    </span>
  )
  if (ok) return (
    <span className="flex items-center gap-1.5 text-[11px] font-semibold" style={{ color: 'var(--color-success)' }}>
      <span className="relative flex h-1.5 w-1.5">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" style={{ background: 'var(--color-success)' }} />
        <span className="relative inline-flex rounded-full h-1.5 w-1.5" style={{ background: 'var(--color-success)' }} />
      </span>
      Backend live
    </span>
  )
  return (
    <span className="flex items-center gap-1.5 text-[11px] font-semibold" style={{ color: 'var(--color-error)' }}>
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: 'var(--color-error)' }} />
      Offline
    </span>
  )
}

// ── Summary chip row ────────────────────────────────────────────────────────

function SummaryChip({ label, value, active }: { label: string; value: string; active: boolean }) {
  return (
    <div
      className="flex items-center gap-1 px-2 py-1 rounded text-[10px]"
      style={{
        background: active ? 'var(--accent-subtle)' : 'var(--bg-input)',
        border: `1px solid ${active ? 'var(--accent-border)' : 'var(--border-subtle)'}`,
        color: active ? 'var(--accent-primary)' : 'var(--text-muted)',
        opacity: active ? 1 : 0.7,
      }}
    >
      <span className="font-semibold">{label}</span>
      <span className="opacity-70">·</span>
      <span>{value}</span>
    </div>
  )
}


// ── App ─────────────────────────────────────────────────────────────────────

export type ViewMode = 'home' | 'audio_merger' | 'script_timestamp' | AppMode


export default function App() {
  // Theme
  const [isDark, setIsDark] = useState<boolean>(getInitialDark)
  useEffect(() => { applyTheme(isDark) }, [isDark])
  useEffect(() => { applyTheme(getInitialDark()) }, [])
  const toggleTheme = () => setIsDark(d => !d)



  const [activeView, setActiveView] = useState<ViewMode>('home')

  // Reset scroll position when navigating between tools or returning to home
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' })
  }, [activeView])


  const handleModeChange = (mode: ViewMode) => {
    setActiveView(mode)
    if (mode !== 'home') {
      try { localStorage.setItem('appMode', mode) } catch { /* noop */ }
    }
  }

  // Required files
  const [audioInputMode, setAudioInputMode] = useState<'single' | 'zip'>('single')
  const [audioFile, setAudioFile] = useState<File | null>(null)
  const [audioZip,  setAudioZip]  = useState<File | null>(null)
  const [imagesZip, setImagesZip]   = useState<File | null>(null)
  const [csvFile,   setCsvFile]     = useState<File | null>(null)
  const [audioDuration, setAudioDuration] = useState<number | null>(null)

  // Optional files
  const [introFile,    setIntroFile]    = useState<File | null>(null)
  const [outroFile,    setOutroFile]    = useState<File | null>(null)
  const [bgMusicFile,  setBgMusicFile]  = useState<File | null>(null)

  // Settings
  const [settings, setSettings] = useState<GenerateSettings>(DEFAULT_SETTINGS)

  // Generation state
  const [status,          setStatus]          = useState<GenerateStatus>('idle')
  const [currentJobId,    setCurrentJobId]    = useState<string | null>(null)
  const [result,          setResult]          = useState<GenerateResponse | null>(null)
  const [healthOk,        setHealthOk]        = useState<boolean | null>(null)
  const [cancelledMsg,    setCancelledMsg]    = useState<string | null>(null)

  // Health check
  useEffect(() => { checkHealth().then(setHealthOk) }, [])

  // Audio duration detection (single file only)
  useEffect(() => {
    if (audioInputMode !== 'single' || !audioFile) { setAudioDuration(null); return }
    const url = URL.createObjectURL(audioFile);
    const audio = new Audio(url);
    audio.onloadedmetadata = () => {
      setAudioDuration(audio.duration);
      URL.revokeObjectURL(url);
    };
    audio.onerror = () => {
      setAudioDuration(null);
      URL.revokeObjectURL(url);
    };
  }, [audioFile, audioInputMode])

  const canGenerate = (audioInputMode === 'single' ? audioFile !== null : audioZip !== null) && imagesZip !== null && csvFile !== null
    && status !== 'uploading' && status !== 'generating' && status !== 'cancelling'
  const isLoading   = status === 'uploading' || status === 'generating' || status === 'cancelling'

  // Determine current workflow step
  const workflowStep: WorkflowStep =
    result     ? 5 :
    isLoading  ? 4 :
    canGenerate? 4 :
    (audioInputMode === 'single' ? !!audioFile : !!audioZip) || imagesZip || csvFile ? 2 : 1

  // Generate
  const handleGenerate = async () => {
    if ((audioInputMode === 'single' ? !audioFile : !audioZip) || !imagesZip || !csvFile) return
    setStatus('uploading')
    try {
      const { job_id } = await startJob(audioInputMode, audioFile, audioZip, imagesZip, csvFile, settings, introFile, outroFile, bgMusicFile)
      setCurrentJobId(job_id); setStatus('generating')
    } catch (err) {
      setResult({ success: false, errors: [String(err)], warnings: [], timeline_report: [] })
      setStatus('error')
    }
  }

  const handleJobComplete = useCallback((jobStatus: JobStatus) => {
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
        errors:  jobStatus.errors.length ? jobStatus.errors : ['Video generation failed.'],
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

  // Derived
  const hasEnhancements = introFile || outroFile || bgMusicFile || settings.watermarkText.trim()

  return (
    <div className="min-h-screen flex flex-col">

      {/* ── Progress overlay ── */}
      {currentJobId && (
        <ProgressOverlay
          jobId={currentJobId}
          onJobComplete={handleJobComplete}
          onCancelled={handleCancelled}
          onClose={() => setCurrentJobId(null)}
          renderSpec={{
            resolution:    settings.exportResolution,
            renderProfile: settings.renderProfile,
          }}
        />
      )}

      {/* ── Upload-only overlay ── */}
      {status === 'uploading' && !currentJobId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center animate-fade-in" style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)' }}>
          <div
            className="w-72 text-center space-y-4 p-8 rounded-2xl"
            style={{ background: 'var(--bg-card)', border: '1px solid var(--border-default)' }}
          >
            <div
              className="w-14 h-14 mx-auto rounded-2xl flex items-center justify-center"
              style={{ background: 'var(--accent-subtle)', border: '1px solid var(--accent-border)' }}
            >
              <IconLoader size={22} className="animate-spin" style={{ color: 'var(--accent-primary)' }} />
            </div>
            <div>
              <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Uploading files…</h3>
              <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>Sending to server</p>
            </div>
            <div className="w-full h-1 rounded-full overflow-hidden" style={{ background: 'var(--bg-input)' }}>
              <div className="h-full rounded-full" style={{ background: 'var(--accent-primary)', animation: 'progressIndeterminate 1.8s ease-in-out infinite' }} />
            </div>
          </div>
          <style>{`
            @keyframes progressIndeterminate {
              0%   { width: 0%;   margin-left: 0%; }
              50%  { width: 60%;  margin-left: 20%; }
              100% { width: 0%;   margin-left: 100%; }
            }
          `}</style>
        </div>
      )}

      {/* ── Header ── */}
      <header className="sticky top-0 z-40 header-bar">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-6">

          {/* Logo + branding */}
          <div className="flex items-center gap-3 shrink-0">
            <div
              className="w-8 h-8 rounded-xl overflow-hidden flex items-center justify-center shrink-0"
              style={{
                background: 'linear-gradient(135deg, var(--accent-primary), #8b5cf6)',
                border: '1px solid var(--accent-border)',
              }}
            >
              <img
                src="/automist-labs-logo.png"
                alt="Automist Labs"
                className="w-full h-full object-contain p-1"
                onError={e => {
                  e.currentTarget.style.display = 'none'
                  const sib = e.currentTarget.nextElementSibling as HTMLElement | null
                  if (sib) sib.classList.remove('hidden')
                }}
              />
              <IconSparkles size={14} className="hidden" style={{ color: 'white' }} />
            </div>
            <div className="leading-tight">
              <h1 className="text-sm font-extrabold" style={{ color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
                SyncFrame Studio
              </h1>
              <p className="text-[10px] font-medium" style={{ color: 'var(--text-muted)', letterSpacing: '0.02em' }}>
                by Automist Labs
              </p>
            </div>
          </div>

          {/* Centre space */}
          <div className="flex-1" />

          {/* Right: status + theme */}
          <div className="flex items-center gap-2.5 shrink-0">
            <div
              className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl"
              style={{
                background: 'var(--bg-elevated)',
                border: `1px solid ${healthOk === false ? 'var(--color-error-border)' : healthOk === true ? 'var(--color-success-border)' : 'var(--border-subtle)'}`,
              }}
            >
              <StatusDot ok={healthOk} />
            </div>
            <button
              id="theme-toggle-btn"
              onClick={toggleTheme}
              aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
              className="w-8 h-8 rounded-xl flex items-center justify-center transition-all"
              style={{
                background: 'var(--bg-elevated)',
                border: '1px solid var(--border-default)',
                color: 'var(--text-muted)',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.borderColor = 'var(--accent-border)'
                e.currentTarget.style.color = 'var(--accent-primary)'
                e.currentTarget.style.background = 'var(--accent-subtle)'
              }}
              onMouseLeave={e => {
                e.currentTarget.style.borderColor = 'var(--border-default)'
                e.currentTarget.style.color = 'var(--text-muted)'
                e.currentTarget.style.background = 'var(--bg-elevated)'
              }}
            >
              {isDark ? <IconSun size={14} /> : <IconMoon size={14} />}
            </button>
          </div>

        </div>
      </header>

      {/* ── Alerts (always visible regardless of mode) ── */}
      {healthOk === false && (
        <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 pt-4">
          <div className="alert-error">
            <span className="text-sm">⚠</span>
            <div className="text-xs">
              <p className="font-semibold">Backend server is not running</p>
              <p className="mt-0.5 opacity-80">
                Start the app with <strong>./start_app.command</strong> or run the backend manually.
              </p>
            </div>
          </div>
        </div>
      )}

      {cancelledMsg && (
        <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 pt-4">
          <div className="alert-warning animate-fade-in">
            <span>ℹ</span>
            <p className="text-xs">{cancelledMsg}</p>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════
          PAGE CONTENT — switches between modes
      ════════════════════════════════════════════════════════════ */}
      {activeView === 'home' ? (
        <StudioHomePage onSelectTool={handleModeChange} healthOk={healthOk} />
      ) : (
        <>

      {/* ── Back Navigation ── */}
      <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 pt-5 pb-1">
        <button
          onClick={() => handleModeChange('home')}
          className="inline-flex items-center gap-1.5 text-xs font-medium transition-colors cursor-pointer rounded-lg px-2.5 py-1.5"
          style={{
            color: 'var(--text-secondary)',
            background: 'var(--bg-elevated)',
            border: '1px solid var(--border-subtle)'
          }}
          onMouseEnter={e => {
            e.currentTarget.style.color = 'var(--accent-primary)'
            e.currentTarget.style.borderColor = 'var(--accent-border)'
            e.currentTarget.style.background = 'var(--accent-subtle)'
          }}
          onMouseLeave={e => {
            e.currentTarget.style.color = 'var(--text-secondary)'
            e.currentTarget.style.borderColor = 'var(--border-subtle)'
            e.currentTarget.style.background = 'var(--bg-elevated)'
          }}
        >
          <span aria-hidden="true">&larr;</span> Back
        </button>
      </div>

      {activeView === 'audio_merger' ? (
        <AudioMergerPage />
      ) : activeView === 'script_timestamp' ? (
        <ScriptTimestampPage />
      ) : activeView === 'media' ? (
        <MediaTimelinePage />
      ) : activeView === 'video' ? (
        <VideoTimelinePage />
      ) : (
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 py-6">
        <ToolPageHeader
          icon={<IconImage size={24} />}
          title="Image Timeline"
          description="Create videos from images, audio, and timestamp CSV files."
        />
        <div className="flex flex-col xl:flex-row gap-6 items-start mt-6">

          {/* ── LEFT COLUMN ── */}
          <div className="flex-1 min-w-0 space-y-6">

            {/* Audio duration warning */}
            {audioDuration !== null && audioDuration > 600 && (
              <div className="alert-warning animate-fade-in">
                <span>⚠</span>
                <p className="text-xs">
                  {audioDuration > 1200
                    ? 'This audio is very long (>20 min). Generation may take a long time depending on your settings and computer.'
                    : 'Long audio detected (>10 min). Use 720p Fast Preview to check timing before your final 1080p export.'}
                </p>
              </div>
            )}

            {/* Source Files card */}
            <div className="card p-5 space-y-5">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>Source Files</h2>
                  <p className="text-[11px] mt-0.5" style={{ color: 'var(--text-muted)' }}>Three required files to generate your video</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {audioInputMode === 'single' ? (
                  <FileDropZone
                    id="audio-upload-single"
                    label="Main Audio"
                    description="Upload one main audio file"
                    accept="audio/*,.mp3,.wav,.m4a,.aac"
                    icon={<IconMusic size={14} />}
                    file={audioFile}
                    onChange={setAudioFile}
                    disabled={isLoading}
                    required
                  />
                ) : (
                  <FileDropZone
                    id="audio-upload-zip"
                    label="Audio Parts ZIP"
                    description="ZIP of 1.mp3, 2.mp3..."
                    accept=".zip,application/zip"
                    icon={<IconFileText size={14} />}
                    file={audioZip}
                    onChange={setAudioZip}
                    disabled={isLoading}
                    required
                  />
                )}
                <FileDropZone
                  id="images-upload"
                  label="Images ZIP"
                  description="1.jpg, 2.jpg…"
                  accept=".zip,application/zip"
                  icon={<IconImage size={14} />}
                  file={imagesZip}
                  onChange={setImagesZip}
                  disabled={isLoading}
                  required
                />
                <FileDropZone
                  id="csv-upload"
                  label="Timestamp CSV"
                  description="image, start, end columns"
                  accept=".csv,text/csv"
                  icon={<IconFileText size={14} />}
                  file={csvFile}
                  onChange={setCsvFile}
                  disabled={isLoading}
                  required
                />
              </div>

              <div className="flex justify-start">
                <div className="flex gap-2 p-1 bg-[var(--bg-input)] rounded-lg w-full sm:w-1/3">
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
              </div>
              <div className="pt-2">
                <div className="flex items-center gap-2 mt-1 mb-3">
                  <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>Optional Appends</span>
                  <div className="flex-1 h-px" style={{ background: 'var(--border-subtle)' }} />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <FileDropZone id="intro-upload" label="Intro Video" description="Appended before timeline" accept="video/mp4,video/quicktime,video/webm"
                    icon={<IconVideo size={14} />} file={introFile} onChange={setIntroFile} disabled={isLoading} />
                  <FileDropZone id="outro-upload" label="Outro Video" description="Appended after timeline" accept="video/mp4,video/quicktime,video/webm"
                    icon={<IconVideo size={14} />} file={outroFile} onChange={setOutroFile} disabled={isLoading} />
                </div>
              </div>
            </div>

            {/* Video Settings card */}
            <div className="card p-5 space-y-4">
              <div>
                <h2 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>Video Settings</h2>
                <p className="text-[11px] mt-0.5" style={{ color: 'var(--text-muted)' }}>Configure core dimensions and playback behaviors.</p>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <Sel id="aspect-ratio" label="Aspect Ratio" value={settings.aspectRatio} disabled={isLoading} onChange={v => setSettings({...settings, aspectRatio: v as any})}
                  options={[ { value: '9:16', label: '9:16 Vertical' }, { value: '16:9', label: '16:9 Landscape' }, { value: '1:1', label: '1:1 Square' } ]} />
                
                <Sel id="export-resolution" label="Resolution" value={settings.exportResolution} disabled={isLoading} onChange={v => setSettings({...settings, exportResolution: v as any})}
                  options={[ { value: '720p', label: '720p Fast' }, { value: '1080p', label: '1080p HD' }, { value: '2K', label: '2K Sharp' }, { value: '4K', label: '4K Ultra' } ]} />

                <Sel id="fit-mode" label="Fit Mode" value={settings.fitMode} disabled={isLoading} onChange={v => setSettings({...settings, fitMode: v as any})}
                  options={[ { value: 'cover', label: 'Cover (Crop)' }, { value: 'contain', label: 'Contain (Pad)' } ]} />

                <Sel id="render-profile" label="Render Profile" value={settings.renderProfile} disabled={isLoading} onChange={v => setSettings({...settings, renderProfile: v as any})}
                  options={[ { value: 'fast_preview', label: 'Fast Preview' }, { value: 'balanced', label: 'Balanced' }, { value: 'high_quality', label: 'High Quality' } ]} />
              </div>

              <div className="space-y-1">
                <label htmlFor="output-name" className="form-label">Output Filename</label>
                <div className="flex items-center gap-2">
                  <input
                    id="output-name" type="text" value={settings.outputName} disabled={isLoading}
                    onChange={e => setSettings({...settings, outputName: e.target.value})}
                    placeholder="my_video"
                    className="form-input flex-1"
                  />
                  <span className="text-[10px] font-mono shrink-0 px-2 py-1.5 rounded-md" style={{ background: 'var(--bg-input)', border: '1px solid var(--border-subtle)', color: 'var(--text-muted)' }}>
                    _YYYYMMDD.mp4
                  </span>
                </div>
              </div>
            </div>

            {/* Timeline Styling / Motion card */}
            <div className="card p-5 space-y-4">
              <div>
                <h2 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>Timeline Styling / Motion</h2>
                <p className="text-[11px] mt-0.5" style={{ color: 'var(--text-muted)' }}>Apply transitions and motion to your media.</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Sel id="style-preset" label="Style Preset" value={settings.stylePreset} disabled={isLoading} onChange={v => {
                    const preset = v as any;
                    const map: Record<string, any> = {
                      clean_default: { motionEffect: 'slow_zoom_in', motionIntensity: 'medium', transition: 'fade', transitionDuration: '0.5', visualEffect: 'none', effectStrength: 'medium' },
                      youtube_documentary: { motionEffect: 'ken_burns', motionIntensity: 'medium', transition: 'crossfade', transitionDuration: '0.8', visualEffect: 'cinematic', effectStrength: 'medium' },
                      tiktok_reels: { motionEffect: 'dynamic_shorts', motionIntensity: 'high', transition: 'flash', transitionDuration: '0.2', visualEffect: 'high_contrast', effectStrength: 'medium' },
                      cinematic_story: { motionEffect: 'ken_burns', motionIntensity: 'medium', transition: 'fade_black', transitionDuration: '0.8', visualEffect: 'cinematic', effectStrength: 'medium' },
                      news_report: { motionEffect: 'pan_left', motionIntensity: 'low', transition: 'fade', transitionDuration: '0.5', visualEffect: 'clean_bright', effectStrength: 'low' },
                      calm_educational: { motionEffect: 'slow_zoom_in', motionIntensity: 'low', transition: 'crossfade', transitionDuration: '0.8', visualEffect: 'clean_bright', effectStrength: 'low' },
                      dramatic_shorts: { motionEffect: 'dynamic_shorts', motionIntensity: 'high', transition: 'zoom_in', transitionDuration: '0.2', visualEffect: 'high_contrast', effectStrength: 'high' }
                    };
                    const cfg = map[preset];
                    setSettings({
                      ...settings,
                      stylePreset: preset,
                      ...cfg,
                      zoomEffect: cfg.motionEffect === 'slow_zoom_in' ? 'slow_zoom_in' : 'none'
                    });
                  }}
                  options={[
                    { value: 'clean_default', label: 'Clean Default' },
                    { value: 'youtube_documentary', label: 'YouTube Documentary' },
                    { value: 'tiktok_reels', label: 'TikTok / Reels Dynamic' },
                    { value: 'cinematic_story', label: 'Cinematic Story' },
                    { value: 'news_report', label: 'News / Report Style' },
                    { value: 'calm_educational', label: 'Calm Educational' },
                    { value: 'dramatic_shorts', label: 'Dramatic Shorts' }
                  ]} />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Sel id="motion-effect" label="Motion Effect" value={settings.motionEffect} disabled={isLoading} onChange={v => setSettings({...settings, motionEffect: v as any, zoomEffect: v === 'slow_zoom_in' ? 'slow_zoom_in' : 'none'})}
                  options={[
                    { value: 'none', label: 'None' }, { value: 'slow_zoom_in', label: 'Slow Zoom In' }, { value: 'slow_zoom_out', label: 'Slow Zoom Out' },
                    { value: 'ken_burns', label: 'Ken Burns' }, { value: 'pan_left', label: 'Pan Left' }, { value: 'pan_right', label: 'Pan Right' },
                    { value: 'pan_up', label: 'Pan Up' }, { value: 'pan_down', label: 'Pan Down' }, { value: 'subtle_random', label: 'Subtle Random' },
                    { value: 'dynamic_shorts', label: 'Dynamic Shorts' }
                  ]} />

                <Sel id="motion-intensity" label="Motion Intensity" value={settings.motionIntensity} disabled={isLoading} onChange={v => setSettings({...settings, motionIntensity: v as any})}
                  options={[ { value: 'low', label: 'Low' }, { value: 'medium', label: 'Medium' }, { value: 'high', label: 'High' } ]} />

                <Sel id="transition" label="Transition" value={settings.transition} disabled={isLoading} onChange={v => setSettings({...settings, transition: v as any})}
                  options={[
                    { value: 'none', label: 'None' }, { value: 'fade', label: 'Fade' }, { value: 'crossfade', label: 'Crossfade' },
                    { value: 'fade_black', label: 'Fade to Black' }, { value: 'fade_white', label: 'Fade to White' }, { value: 'slide_left', label: 'Slide Left' },
                    { value: 'slide_right', label: 'Slide Right' }, { value: 'slide_up', label: 'Slide Up' }, { value: 'slide_down', label: 'Slide Down' },
                    { value: 'push_left', label: 'Push Left' }, { value: 'push_right', label: 'Push Right' }, { value: 'zoom_in', label: 'Zoom In' },
                    { value: 'zoom_out', label: 'Zoom Out' }, { value: 'blur_crossfade', label: 'Blur Crossfade' }, { value: 'flash', label: 'Flash' }
                  ]} />

                <Sel id="transition-duration" label="Transition Duration" value={settings.transitionDuration} disabled={isLoading} onChange={v => setSettings({...settings, transitionDuration: v as any})}
                  options={[ { value: '0.2', label: '0.2s' }, { value: '0.5', label: '0.5s' }, { value: '0.8', label: '0.8s' }, { value: '1.0', label: '1.0s' } ]} />

                <Sel id="visual-effect" label="Visual Style" value={settings.visualEffect} disabled={isLoading} onChange={v => setSettings({...settings, visualEffect: v as any})}
                  options={[
                    { value: 'none', label: 'None' }, { value: 'cinematic', label: 'Cinematic' }, { value: 'warm', label: 'Warm' },
                    { value: 'high_contrast', label: 'High Contrast' }, { value: 'black_and_white', label: 'Black & White' }, { value: 'clean_bright', label: 'Clean Bright' }
                  ]} />

                <Sel id="effect-strength" label="Style Strength" value={settings.effectStrength} disabled={isLoading} onChange={v => setSettings({...settings, effectStrength: v as any})}
                  options={[ { value: 'low', label: 'Low' }, { value: 'medium', label: 'Medium' }, { value: 'high', label: 'High' } ]} />
              </div>
            </div>

            {/* Background Music card */}
            <div className="card p-5 space-y-4">
              <div>
                <h2 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>Background Music</h2>
                <p className="text-[11px] mt-0.5" style={{ color: 'var(--text-muted)' }}>Optional music track mixed under the main voice audio.</p>
              </div>
              
              <FileDropZone
                id="bg-music-upload"
                label="Upload Music"
                description="mp3, wav, m4a, aac"
                accept="audio/mpeg,audio/wav,audio/aac,audio/x-m4a,audio/mp4,.m4a"
                icon={<IconMusic size={14} />}
                file={bgMusicFile}
                onChange={setBgMusicFile}
                disabled={isLoading}
              />

              {bgMusicFile && (
                <div className="space-y-3 mt-4">
                  <div className="flex items-center gap-2 mt-1 mb-3">
                    <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>Music Controls</span>
                    <div className="flex-1 h-px" style={{ background: 'var(--border-subtle)' }} />
                  </div>
                  <div className="space-y-1 mt-2">
                    <div className="flex justify-between items-center">
                      <label className="form-label mb-0">Music Volume</label>
                      <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{settings.musicVolume}%</span>
                    </div>
                    <input type="range" min={0} max={100} value={settings.musicVolume}
                      onChange={e => setSettings({...settings, musicVolume: Number(e.target.value)})}
                      className="w-full" disabled={isLoading} />
                  </div>

                  <div className="flex flex-col gap-2">
                    <label className="flex items-center gap-2 text-[12px]" style={{ color: 'var(--text-primary)', cursor: isLoading ? 'not-allowed' : 'pointer' }}>
                      <input type="checkbox" checked={settings.musicFade} onChange={e => setSettings({...settings, musicFade: e.target.checked})} disabled={isLoading} />
                      Fade music in/out
                    </label>
                  </div>
                </div>
              )}
            </div>

            {/* Watermark card */}
            <div className="card p-5 space-y-4">
              <div>
                <h2 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>Watermark</h2>
                <p className="text-[11px] mt-0.5" style={{ color: 'var(--text-muted)' }}>Add text over your entire timeline.</p>
              </div>
              <div className="grid grid-cols-1 gap-4">
                <div className="space-y-1">
                  <label className="form-label" htmlFor="wm-text">Watermark Text</label>
                  <input
                    id="wm-text" type="text" placeholder="@YourChannel or brand name" className="form-input" disabled={isLoading}
                    value={settings.watermarkText} onChange={(e) => setSettings({...settings, watermarkText: e.target.value.slice(0, 60)})}
                  />
                </div>
              </div>
              
              {settings.watermarkText.trim() && (
                <div className="animate-fade-in mt-4">
                  <div className="flex items-center gap-2 mt-1 mb-3">
                    <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>Watermark Options</span>
                    <div className="flex-1 h-px" style={{ background: 'var(--border-subtle)' }} />
                  </div>
                  <div className="grid grid-cols-2 gap-4 mt-4">
                    <Sel id="wm-pos-mode" label="Position Mode" value={settings.watermarkPositionMode} disabled={isLoading} onChange={v => setSettings({...settings, watermarkPositionMode: v as any})}
                      options={[ { value: 'preset', label: 'Preset Position' }, { value: 'custom', label: 'Custom (X/Y px)' } ]} />
                    
                    {settings.watermarkPositionMode === 'preset' ? (
                      <Sel id="wm-pos" label="Position" value={settings.watermarkPosition} disabled={isLoading} onChange={v => setSettings({...settings, watermarkPosition: v as any})}
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
                            <input id="wm-x" type="number" className="form-input text-center" value={settings.watermarkX} onChange={e => setSettings({...settings, watermarkX: parseInt(e.target.value) || 0})} disabled={isLoading} />
                          </div>
                          <div className="space-y-1">
                            <label className="form-label" htmlFor="wm-y">Y px</label>
                            <input id="wm-y" type="number" className="form-input text-center" value={settings.watermarkY} onChange={e => setSettings({...settings, watermarkY: parseInt(e.target.value) || 0})} disabled={isLoading} />
                          </div>
                        </div>
                        
                        <div className="space-y-1 mt-1">
                          <label className="form-label" htmlFor="wm-coord-mode">Coordinate Mode</label>
                          <select id="wm-coord-mode" value={settings.watermarkCoordinateMode} onChange={e => setSettings({...settings, watermarkCoordinateMode: e.target.value as any})} className="form-select" disabled={isLoading}>
                            <option value="design_canvas">Design Canvas X/Y</option>
                            <option value="final_pixels">Final Export Pixels</option>
                          </select>
                        </div>
                      </div>
                    )}
                    
                    <div className="space-y-1">
                      <div className="flex justify-between">
                        <label className="form-label">Opacity ({settings.watermarkOpacity}%)</label>
                      </div>
                      <input type="range" min="10" max="100" className="w-full mt-2" value={settings.watermarkOpacity} onChange={e => setSettings({...settings, watermarkOpacity: parseInt(e.target.value)})} disabled={isLoading} />
                    </div>
                    
                    <div className="space-y-1">
                      <div className="flex justify-between">
                        <label className="form-label">Size ({settings.watermarkSize}px base)</label>
                      </div>
                      <input type="range" min="10" max="80" className="w-full mt-2" value={settings.watermarkSize} onChange={e => setSettings({...settings, watermarkSize: parseInt(e.target.value)})} disabled={isLoading} />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Results */}
            {result && <ResultsPanel result={result} settings={settings} />}
          </div>

          {/* ── RIGHT COLUMN ── */}
          <div className="xl:w-[320px] shrink-0 space-y-6">

            {/* Generate Button */}
            <div className="card p-5 space-y-4">
              <h2 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>Action</h2>
              <button
                onClick={handleGenerate}
                disabled={!canGenerate}
                className={`w-full relative overflow-hidden transition-all duration-300 flex items-center justify-center gap-2 rounded-xl text-sm font-bold active:scale-[0.98] ${
                  canGenerate
                    ? 'active:brightness-95'
                    : 'opacity-50 cursor-not-allowed'
                }`}
                style={{
                  height: 52,
                  background: canGenerate ? 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)' : 'var(--bg-elevated)',
                  boxShadow: canGenerate ? '0 4px 16px rgba(99,102,241,0.35)' : 'none',
                  color: canGenerate ? '#fff' : 'var(--text-muted)',
                  border: canGenerate ? 'none' : '1px solid var(--border-default)'
                }}
                onMouseEnter={e => { if (canGenerate) (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 10px 28px rgba(99,102,241,0.55)' }}
                onMouseLeave={e => { if (canGenerate) (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 4px 16px rgba(99,102,241,0.35)' }}
              >
                {isLoading ? (
                  <>
                    <IconLoader size={18} className="animate-spin" />
                    Generating…
                  </>
                ) : (
                  <>
                    <IconZap size={18} />
                    Generate Video
                  </>
                )}
              </button>

              {/* Missing files indicator */}
              {!canGenerate && !isLoading && (
                <div className="flex items-center gap-3 flex-wrap mt-3">
                  {[
                    { label: 'Audio',     hasFile: (audioInputMode === 'single' ? !!audioFile : !!audioZip) },
                    { label: 'Images',    hasFile: !!imagesZip },
                    { label: 'CSV',       hasFile: !!csvFile   },
                  ].filter(f => !f.hasFile).map(f => (
                    <span
                      key={f.label}
                      className="flex items-center gap-1 text-[10px]"
                      style={{ color: 'var(--color-error)' }}
                    >
                      <span style={{ color: 'var(--color-error-border)' }}>✗</span>
                      {f.label} missing
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* CSV Format Guide */}
            <div className="card p-5 space-y-4">
              <CsvGuide />
            </div>

          </div>

        </div>
        </main>
      )}
      </>
      )}

      {/* ── Footer ── */}
      <footer className="py-4 text-center" style={{ borderTop: '1px solid var(--border-subtle)' }}>
        <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
          SyncFrame Studio · by Automist Labs · Runs locally, no data leaves your machine
        </p>
      </footer>

    </div>
  )
}
