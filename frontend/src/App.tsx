// App.tsx – Main application layout for Audio Image Sync Studio

import React, { useState, useEffect, useCallback } from 'react'
import FileDropZone from './components/FileDropZone'
import SettingsPanel from './components/SettingsPanel'
import CsvGuide from './components/CsvGuide'
import ResultsPanel from './components/ResultsPanel'
import ProgressOverlay from './components/ProgressOverlay'
import {
  IconMusic,
  IconImage,
  IconFileText,
  IconZap,
  IconSparkles,
  IconLoader,
  IconSun,
  IconMoon,
} from './components/icons'
import type { GenerateSettings, GenerateResponse, GenerateStatus, JobStatus } from './types'
import { checkHealth, startJob } from './utils/api'

const DEFAULT_SETTINGS: GenerateSettings = {
  videoFormat: '16:9',
  fitMode: 'cover',
  transition: 'none',
  zoomEffect: 'none',
  outputName: 'my_video',
}

// ── Theme helpers ──────────────────────────────────────────────────────────

function getInitialDark(): boolean {
  try {
    const saved = localStorage.getItem('theme')
    if (saved === 'light') return false
    if (saved === 'dark') return true
  } catch {
    // localStorage unavailable
  }
  return true // default dark
}

function applyTheme(dark: boolean) {
  const root = document.documentElement
  if (dark) {
    root.classList.add('dark')
    root.classList.remove('light')
  } else {
    root.classList.remove('dark')
    root.classList.add('light')
  }
  try {
    localStorage.setItem('theme', dark ? 'dark' : 'light')
  } catch {
    // ignore
  }
}

// ── App ────────────────────────────────────────────────────────────────────

export default function App() {
  // ── Theme ────────────────────────────────────────────────────────────────
  const [isDark, setIsDark] = useState<boolean>(getInitialDark)

  useEffect(() => {
    applyTheme(isDark)
  }, [isDark])

  // Apply theme on first mount (before any state updates)
  useEffect(() => {
    applyTheme(getInitialDark())
  }, [])

  const toggleTheme = () => setIsDark((d) => !d)

  // ── File state ───────────────────────────────────────────────────────────
  const [audioFile, setAudioFile] = useState<File | null>(null)
  const [imagesZip, setImagesZip] = useState<File | null>(null)
  const [csvFile, setCsvFile] = useState<File | null>(null)

  // ── Settings ─────────────────────────────────────────────────────────────
  const [settings, setSettings] = useState<GenerateSettings>(DEFAULT_SETTINGS)

  // ── Generation state ─────────────────────────────────────────────────────
  const [status, setStatus] = useState<GenerateStatus>('idle')
  const [currentJobId, setCurrentJobId] = useState<string | null>(null)
  const [result, setResult] = useState<GenerateResponse | null>(null)
  const [healthOk, setHealthOk] = useState<boolean | null>(null)
  const [cancelledMessage, setCancelledMessage] = useState<string | null>(null)

  // ── Health check on mount ─────────────────────────────────────────────────
  useEffect(() => {
    checkHealth().then(setHealthOk)
  }, [])

  const canGenerate =
    audioFile !== null &&
    imagesZip !== null &&
    csvFile !== null &&
    status !== 'uploading' &&
    status !== 'generating' &&
    status !== 'cancelling'

  const isLoading = status === 'uploading' || status === 'generating' || status === 'cancelling'

  // ── Start generation ──────────────────────────────────────────────────────
  const handleGenerate = async () => {
    if (!audioFile || !imagesZip || !csvFile) return

    setResult(null)
    setCancelledMessage(null)
    setStatus('uploading')

    try {
      const { job_id } = await startJob(audioFile, imagesZip, csvFile, settings)
      setCurrentJobId(job_id)
      setStatus('generating')
    } catch (err) {
      setResult({
        success: false,
        errors: [String(err)],
        warnings: [],
        timeline_report: [],
      })
      setStatus('error')
    }
  }

  // ── Job completed callback (from ProgressOverlay polling) ─────────────────
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
        errors: jobStatus.errors,
      })
      setStatus('done')
    } else {
      setResult({
        success: false,
        errors: jobStatus.errors.length ? jobStatus.errors : ['Video generation failed.'],
        warnings: jobStatus.warnings,
        timeline_report: jobStatus.timeline_report,
      })
      setStatus('error')
    }
  }, [])

  // ── Job cancelled callback ────────────────────────────────────────────────
  const handleCancelled = useCallback(() => {
    setCurrentJobId(null)
    setStatus('idle')
    setCancelledMessage('Generation cancelled.')
    // Clear the cancelled message after 4 s
    setTimeout(() => setCancelledMessage(null), 4000)
  }, [])

  return (
    <div className="min-h-screen flex flex-col">
      {/* Progress overlay — shown while generating */}
      {isLoading && currentJobId && (
        <ProgressOverlay
          jobId={currentJobId}
          onJobComplete={handleJobComplete}
          onCancelled={handleCancelled}
        />
      )}

      {/* Upload-only overlay (before job_id is available) */}
      {status === 'uploading' && !currentJobId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm animate-fade-in">
          <div className="card p-8 w-72 text-center space-y-4 shadow-2xl">
            <div className="flex justify-center">
              <div className="w-16 h-16 rounded-full bg-brand-gradient/10 border border-brand-500/30 flex items-center justify-center">
                <IconLoader size={28} className="text-brand-400" />
              </div>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-primary">Uploading Files…</h3>
              <p className="text-sm text-secondary mt-1">Sending files to server…</p>
            </div>
            <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: 'rgba(99,102,241,0.12)' }}>
              <div className="h-full bg-gradient-to-r from-brand-500 to-violet-500 rounded-full animate-[progress_2s_ease-in-out_infinite]" />
            </div>
          </div>
          <style>{`
            @keyframes progress {
              0%   { width: 0%;   margin-left: 0%; }
              50%  { width: 60%;  margin-left: 20%; }
              100% { width: 0%;   margin-left: 100%; }
            }
          `}</style>
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* Header                                                              */}
      {/* ------------------------------------------------------------------ */}
      <header className="sticky top-0 z-40 border-b header-surface" style={{ borderColor: 'var(--color-surface-card-border)' }}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          {/* Logo / title */}
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-brand-gradient flex items-center justify-center shadow-lg shadow-brand-900/50">
              <IconSparkles size={16} className="text-white" />
            </div>
            <div className="hidden sm:block">
              <h1 className="text-sm font-bold text-primary leading-none">
                Audio Image Sync Studio
              </h1>
              <p className="text-xs text-muted mt-0.5 leading-none">
                Timestamp-driven video generation
              </p>
            </div>
            <h1 className="sm:hidden text-sm font-bold text-primary">
              AI Sync Studio
            </h1>
          </div>

          {/* Right side: health indicator + theme toggle */}
          <div className="flex items-center gap-3">
            {/* Health indicator */}
            <div className="flex items-center gap-2">
              {healthOk === null && (
                <span className="flex items-center gap-1.5 text-xs text-muted">
                  <IconLoader size={12} />
                  Connecting…
                </span>
              )}
              {healthOk === true && (
                <span className="flex items-center gap-1.5 text-xs text-emerald-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse-slow" />
                  Backend online
                </span>
              )}
              {healthOk === false && (
                <span className="flex items-center gap-1.5 text-xs text-red-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
                  Backend offline
                </span>
              )}
            </div>

            {/* Light/Dark toggle */}
            <button
              id="theme-toggle-btn"
              onClick={toggleTheme}
              aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
              className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors text-muted hover:text-secondary"
              style={{
                backgroundColor: 'var(--color-surface-input)',
                border: '1px solid var(--color-surface-card-border)',
              }}
            >
              {isDark ? <IconSun size={15} /> : <IconMoon size={15} />}
            </button>
          </div>
        </div>
      </header>

      {/* ------------------------------------------------------------------ */}
      {/* Hero section                                                        */}
      {/* ------------------------------------------------------------------ */}
      <section className="relative overflow-hidden border-b" style={{ borderColor: 'var(--color-surface-card-border)' }}>
        <div className="absolute inset-0 bg-gradient-to-br from-brand-900/20 via-transparent to-violet-900/10 pointer-events-none" />
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10 relative">
          <div className="text-center space-y-3 max-w-2xl mx-auto">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-500/10 border border-brand-500/20 text-brand-300 text-xs font-medium">
              <IconZap size={12} />
              Powered by MoviePy · FFmpeg · FastAPI
            </div>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-primary leading-tight">
              Create perfectly timed{' '}
              <span className="text-gradient">videos</span>
            </h2>
            <p className="text-secondary text-base leading-relaxed">
              Upload your audio, a ZIP of ordered images, and a timestamp CSV.
              We handle the rest — smooth transitions, zoom effects, and precise sync.
            </p>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* Main content                                                        */}
      {/* ------------------------------------------------------------------ */}
      <main className="flex-1 max-w-6xl mx-auto w-full px-4 sm:px-6 py-8 space-y-6">

        {/* Backend offline banner */}
        {healthOk === false && (
          <div className="rounded-xl border px-5 py-4 flex items-start gap-3"
            style={{ backgroundColor: 'rgba(127,29,29,0.15)', borderColor: 'rgba(239,68,68,0.25)' }}>
            <span className="text-red-400 mt-0.5">⚠</span>
            <div className="text-sm">
              <p className="font-semibold text-red-300">Backend server is not running</p>
              <p className="text-red-400/80 mt-0.5">
                Double-click <strong>start_app.command</strong> to start the app, or run:{' '}
                <code className="text-xs rounded px-1.5 py-0.5" style={{ backgroundColor: 'rgba(0,0,0,0.3)' }}>
                  uvicorn main:app --reload --host 127.0.0.1 --port 8000
                </code>
              </p>
            </div>
          </div>
        )}

        {/* Cancelled message */}
        {cancelledMessage && (
          <div className="rounded-xl border px-5 py-3 flex items-center gap-3 animate-fade-in"
            style={{ backgroundColor: 'rgba(245,158,11,0.1)', borderColor: 'rgba(245,158,11,0.25)' }}>
            <span className="text-amber-400">ℹ</span>
            <p className="text-sm text-amber-300">{cancelledMessage}</p>
          </div>
        )}

        {/* Row 1: Upload panel + CSV template */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Upload panel */}
          <div className="card-glow p-6 space-y-5">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                <IconImage size={18} />
              </div>
              <div>
                <h2 className="text-base font-semibold text-primary">Upload Files</h2>
                <p className="text-xs text-muted">Three files are required to generate a video</p>
              </div>
            </div>

            <div className="h-px" style={{ backgroundColor: 'var(--color-surface-card-border)' }} />

            <FileDropZone
              id="audio-upload"
              label="Audio File"
              description="MP3, WAV, M4A supported"
              accept="audio/*,.mp3,.wav,.m4a,.aac"
              icon={<IconMusic size={20} />}
              file={audioFile}
              onChange={setAudioFile}
            />

            <FileDropZone
              id="images-upload"
              label="Images ZIP"
              description="ZIP containing 1.jpg, 2.jpg, 3.jpg…"
              accept=".zip,application/zip"
              icon={<IconImage size={20} />}
              file={imagesZip}
              onChange={setImagesZip}
            />

            <FileDropZone
              id="csv-upload"
              label="Timestamp CSV"
              description="CSV with image, start, end columns"
              accept=".csv,text/csv"
              icon={<IconFileText size={20} />}
              file={csvFile}
              onChange={setCsvFile}
            />
          </div>

          {/* CSV Template (compact) */}
          <CsvGuide />
        </div>

        {/* Row 2: Settings */}
        <SettingsPanel
          settings={settings}
          onChange={setSettings}
          disabled={isLoading}
        />

        {/* Row 3: Generate button */}
        <div className="flex flex-col items-center gap-4 py-2">
          {/* File checklist */}
          <div className="flex items-center gap-6 text-xs">
            {[
              { label: 'Audio', file: audioFile },
              { label: 'Images ZIP', file: imagesZip },
              { label: 'Timestamp CSV', file: csvFile },
            ].map(({ label, file }) => (
              <div
                key={label}
                className={`flex items-center gap-1.5 ${file ? 'text-emerald-400' : 'text-muted'}`}
              >
                <span
                  className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] border ${
                    file
                      ? 'border-emerald-500/40 bg-emerald-500/10'
                      : 'border-slate-600 bg-slate-800'
                  }`}
                >
                  {file ? '✓' : '○'}
                </span>
                {label}
              </div>
            ))}
          </div>

          <button
            id="generate-btn"
            onClick={handleGenerate}
            disabled={!canGenerate}
            className="btn-primary text-lg px-10 py-4 rounded-2xl shadow-2xl shadow-brand-900/50"
            aria-label="Generate video"
          >
            {isLoading ? (
              <>
                <IconLoader size={22} />
                Generating…
              </>
            ) : (
              <>
                <IconZap size={22} />
                Generate Video
              </>
            )}
          </button>

          {!canGenerate && !isLoading && (
            <p className="text-xs text-muted">
              Upload all three files above to enable generation.
            </p>
          )}
        </div>

        {/* Row 4: Results */}
        {result && <ResultsPanel result={result} />}
      </main>

      {/* ------------------------------------------------------------------ */}
      {/* Footer                                                              */}
      {/* ------------------------------------------------------------------ */}
      <footer className="border-t mt-auto" style={{ borderColor: 'var(--color-surface-card-border)' }}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-5 flex items-center justify-between gap-4">
          <p className="text-xs text-muted">
            Audio Image Sync Studio · Runs fully on localhost · No internet required
          </p>
          <p className="text-xs text-muted opacity-60">v1.1.0</p>
        </div>
      </footer>
    </div>
  )
}
