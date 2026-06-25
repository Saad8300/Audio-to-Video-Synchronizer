// App.tsx – SyncFrame Studio — Professional creator dashboard

import React, { useState, useEffect, useCallback } from 'react'
import FileDropZone from './components/FileDropZone'
import SettingsPanel from './components/SettingsPanel'
import EnhancementsPanel from './components/EnhancementsPanel'
import CsvGuide from './components/CsvGuide'
import ResultsPanel from './components/ResultsPanel'
import ProgressOverlay from './components/ProgressOverlay'
import {
  IconMusic,
  IconImage,
  IconFileText,
  IconLoader,
  IconSun,
  IconMoon,
  IconZap,
  IconSparkles,
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
  enableBgMusic:    false,
  musicVolume:      12,
  musicFade:        true,
  enableWatermark:       false,
  watermarkText:         '',
  watermarkPositionMode: 'preset',
  watermarkPosition:     'bottom_right',
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

// ── File requirement indicator ──────────────────────────────────────────────

function FileReq({ label, file }: { label: string; file: File | null }) {
  return (
    <div className="flex items-center gap-1.5 text-[11px]" style={{ color: file ? 'var(--color-success)' : 'var(--text-muted)' }}>
      <span
        className="w-3.5 h-3.5 rounded flex items-center justify-center text-[8px] font-bold shrink-0"
        style={{
          background: file ? 'var(--color-success-bg)' : 'var(--bg-input)',
          border: `1px solid ${file ? 'var(--color-success-border)' : 'var(--border-default)'}`,
        }}
      >
        {file ? '✓' : '○'}
      </span>
      {label}
    </div>
  )
}

// ── App ─────────────────────────────────────────────────────────────────────

export default function App() {
  // Theme
  const [isDark, setIsDark] = useState<boolean>(getInitialDark)
  useEffect(() => { applyTheme(isDark) }, [isDark])
  useEffect(() => { applyTheme(getInitialDark()) }, [])
  const toggleTheme = () => setIsDark(d => !d)

  // Required files
  const [audioFile, setAudioFile]   = useState<File | null>(null)
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

  // Audio duration detection
  useEffect(() => {
    if (!audioFile) { setAudioDuration(null); return }
    const url   = URL.createObjectURL(audioFile)
    const audio = new Audio(url)
    audio.onloadedmetadata = () => { setAudioDuration(audio.duration); URL.revokeObjectURL(url) }
    audio.onerror          = () => { setAudioDuration(null);           URL.revokeObjectURL(url) }
  }, [audioFile])

  const canGenerate = audioFile !== null && imagesZip !== null && csvFile !== null
    && status !== 'uploading' && status !== 'generating' && status !== 'cancelling'
  const isLoading   = status === 'uploading' || status === 'generating' || status === 'cancelling'

  // Determine current workflow step
  const workflowStep: WorkflowStep =
    result     ? 5 :
    isLoading  ? 4 :
    canGenerate? 4 :
    audioFile || imagesZip || csvFile ? 2 : 1

  // Generate
  const handleGenerate = async () => {
    if (!audioFile || !imagesZip || !csvFile) return
    setResult(null); setCancelledMsg(null); setStatus('uploading')
    try {
      const { job_id } = await startJob(audioFile, imagesZip, csvFile, settings, introFile, outroFile, bgMusicFile)
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
      {isLoading && currentJobId && (
        <ProgressOverlay jobId={currentJobId} onJobComplete={handleJobComplete} onCancelled={handleCancelled} />
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

      {/* ════════════════════════════════════════════════════════════
          HEADER
      ════════════════════════════════════════════════════════════ */}
      <header className="sticky top-0 z-40 header-bar">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-6">

          {/* Logo + branding */}
          <div className="flex items-center gap-3 shrink-0">
            <div
              className="w-8 h-8 rounded-lg overflow-hidden flex items-center justify-center shrink-0"
              style={{ background: 'var(--accent-subtle)', border: '1px solid var(--accent-border)' }}
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
              <IconSparkles size={14} className="hidden" style={{ color: 'var(--accent-primary)' }} />
            </div>
            <div className="leading-tight">
              <h1 className="text-sm font-bold" style={{ color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>
                SyncFrame Studio
              </h1>
              <p className="text-[10px] font-medium" style={{ color: 'var(--text-muted)', letterSpacing: '0.02em' }}>
                by Automist Labs
              </p>
            </div>
          </div>

          {/* Centre: workflow bar */}
          <div className="hidden md:block flex-1 max-w-md">
            <WorkflowBar step={workflowStep} />
          </div>

          {/* Right: status + theme */}
          <div className="flex items-center gap-3 shrink-0">
            <div
              className="hidden sm:flex items-center px-2.5 py-1.5 rounded-lg"
              style={{ background: 'var(--bg-input)', border: '1px solid var(--border-subtle)' }}
            >
              <StatusDot ok={healthOk} />
            </div>
            <button
              id="theme-toggle-btn"
              onClick={toggleTheme}
              aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
              className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors"
              style={{
                background: 'var(--bg-input)',
                border: '1px solid var(--border-subtle)',
                color: 'var(--text-muted)',
              }}
            >
              {isDark ? <IconSun size={14} /> : <IconMoon size={14} />}
            </button>
          </div>

        </div>
      </header>

      {/* ════════════════════════════════════════════════════════════
          ALERTS
      ════════════════════════════════════════════════════════════ */}
      {healthOk === false && (
        <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 pt-4">
          <div className="alert-error">
            <span className="text-sm">⚠</span>
            <div className="text-xs">
              <p className="font-semibold">Backend server is not running</p>
              <p className="mt-0.5 opacity-80">
                Double-click <strong>start_app.command</strong> or run:{' '}
                <code className="text-[10px] rounded px-1 py-0.5" style={{ background: 'rgba(0,0,0,0.2)' }}>
                  uvicorn main:app --reload --host 127.0.0.1 --port 8000
                </code>
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
          MAIN WORKSPACE
      ════════════════════════════════════════════════════════════ */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 py-6">
        <div className="flex flex-col xl:flex-row gap-6 items-start">

          {/* ── LEFT: Upload + Generate + Results ── */}
          <div className="flex-1 min-w-0 space-y-5">

            {/* Upload workspace */}
            <div className="card p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>Source Files</h2>
                  <p className="text-[11px] mt-0.5" style={{ color: 'var(--text-muted)' }}>Three files are required to generate a video</p>
                </div>
                <div className="hidden sm:flex items-center gap-1.5">
                  <FileReq label="Audio"  file={audioFile} />
                  <span style={{ color: 'var(--border-default)' }}>·</span>
                  <FileReq label="Images" file={imagesZip} />
                  <span style={{ color: 'var(--border-default)' }}>·</span>
                  <FileReq label="CSV"    file={csvFile} />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <FileDropZone
                  id="audio-upload"
                  label="Audio"
                  description="MP3, WAV, M4A, AAC"
                  accept="audio/*,.mp3,.wav,.m4a,.aac"
                  icon={<IconMusic size={14} />}
                  file={audioFile}
                  onChange={setAudioFile}
                  disabled={isLoading}
                  required
                />
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

              <CsvGuide />
            </div>

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

            {/* Generate panel */}
            <div className="card p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>Generate</h2>
                  <p className="text-[11px] mt-0.5" style={{ color: canGenerate ? 'var(--color-success)' : 'var(--text-muted)' }}>
                    {canGenerate ? 'Ready to generate your video.' : 'Upload the required files to continue.'}
                  </p>
                </div>
                {/* Summary chips */}
                <div className="hidden sm:flex items-center gap-1 flex-wrap justify-end">
                  <SummaryChip label="Res"     value={settings.exportResolution} active />
                  <SummaryChip label="Ratio"   value={settings.aspectRatio}      active />
                  <SummaryChip label="Profile" value={settings.renderProfile.replace('_', ' ')} active />
                  {bgMusicFile  && <SummaryChip label="Music"  value="On" active />}
                  {introFile    && <SummaryChip label="Intro"  value="On" active />}
                  {outroFile    && <SummaryChip label="Outro"  value="On" active />}
                  {settings.watermarkText.trim() && <SummaryChip label="Watermark" value="On" active />}
                </div>
              </div>

              <button
                id="generate-btn"
                onClick={handleGenerate}
                disabled={!canGenerate}
                className={`btn-primary w-full py-3 text-base font-bold rounded-xl transition-all ${
                  canGenerate ? 'shadow-lg hover:scale-[1.01] active:scale-[0.99]' : ''
                }`}
                style={{
                  boxShadow: canGenerate ? '0 8px 24px rgba(79,70,229,0.35)' : 'none',
                  fontSize: '15px',
                }}
                aria-label="Generate video"
              >
                {isLoading ? (
                  <span className="flex items-center justify-center gap-2">
                    <IconLoader size={18} className="animate-spin" />
                    Generating…
                  </span>
                ) : (
                  <span className="flex items-center justify-center gap-2">
                    <IconZap size={18} />
                    Generate Video
                  </span>
                )}
              </button>

              {/* Missing files indicator */}
              {!canGenerate && !isLoading && (
                <div className="flex items-center gap-3 flex-wrap">
                  {[
                    { label: 'Audio',     file: audioFile },
                    { label: 'Images',    file: imagesZip },
                    { label: 'CSV',       file: csvFile   },
                  ].filter(f => !f.file).map(f => (
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

            {/* Results */}
            {result && <ResultsPanel result={result} settings={settings} />}
          </div>

          {/* ── RIGHT: Inspector panel ── */}
          <div
            className="w-full xl:w-[340px] shrink-0 space-y-4"
          >
            {/* Settings */}
            <div className="card p-5">
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>Project Settings</h2>
                <span
                  className="text-[9px] font-bold uppercase tracking-widest px-2 py-1 rounded"
                  style={{ background: 'var(--accent-subtle)', border: '1px solid var(--accent-border)', color: 'var(--accent-primary)' }}
                >
                  Inspector
                </span>
              </div>
              <SettingsPanel settings={settings} onChange={setSettings} disabled={isLoading} />
            </div>

            {/* Enhancements */}
            <div className="card p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>Enhancements</h2>
                  <p className="text-[10px] mt-0.5" style={{ color: 'var(--text-muted)' }}>All optional — expand to configure</p>
                </div>
                {hasEnhancements && (
                  <span
                    className="text-[9px] font-bold px-1.5 py-0.5 rounded"
                    style={{ background: 'var(--color-success-bg)', border: '1px solid var(--color-success-border)', color: 'var(--color-success)' }}
                  >
                    ✓ Active
                  </span>
                )}
              </div>
              <EnhancementsPanel
                settings={settings}
                onSettingsChange={setSettings}
                introFile={introFile}     onIntroChange={setIntroFile}
                outroFile={outroFile}     onOutroChange={setOutroFile}
                bgMusicFile={bgMusicFile} onBgMusicChange={setBgMusicFile}
                disabled={isLoading}
              />
            </div>

          </div>
        </div>
      </main>

      {/* ── Footer ── */}
      <footer className="py-4 text-center" style={{ borderTop: '1px solid var(--border-subtle)' }}>
        <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
          SyncFrame Studio · by Automist Labs · Runs locally, no data leaves your machine
        </p>
      </footer>

    </div>
  )
}
