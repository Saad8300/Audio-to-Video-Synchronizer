// App.tsx – Main application layout for Audio Image Sync Studio

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
  IconZap,
  IconSparkles,
  IconLoader,
  IconSun,
  IconMoon,
} from './components/icons'
import type { GenerateSettings, GenerateResponse, GenerateStatus, JobStatus } from './types'
import { checkHealth, startJob } from './utils/api'

const DEFAULT_SETTINGS: GenerateSettings = {
  // Core video (Batch 3)
  aspectRatio:      '9:16',
  exportResolution: '1080p',
  fitMode:          'cover',
  transition:       'none',
  zoomEffect:       'none',
  renderProfile:    'balanced',
  outputName:       'my_video',
  // Batch 2 — background music
  enableBgMusic: false,
  musicVolume:   12,
  musicFade:     true,
  // Batch 3 — watermark
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

  // ── Required file state ───────────────────────────────────────────────────
  const [audioFile, setAudioFile] = useState<File | null>(null)
  const [imagesZip, setImagesZip] = useState<File | null>(null)
  const [csvFile, setCsvFile] = useState<File | null>(null)

  // ── Optional file state (Batch 2/6) ───────────────────────────────────────
  const [introFile, setIntroFile] = useState<File | null>(null)
  const [outroFile, setOutroFile] = useState<File | null>(null)
  const [bgMusicFile, setBgMusicFile] = useState<File | null>(null)

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
      const { job_id } = await startJob(
        audioFile,
        imagesZip,
        csvFile,
        settings,
        introFile,
        outroFile,
        bgMusicFile,
      )
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
            <div className="relative w-8 h-8 rounded-lg flex items-center justify-center overflow-hidden bg-brand-900/20 border border-brand-500/20 shadow-lg shadow-brand-900/50">
              <img 
                src="/automist-labs-logo.png" 
                alt="Automist Labs"
                className="w-full h-full object-contain p-1"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                  e.currentTarget.parentElement?.querySelector('svg')?.classList.remove('hidden');
                }}
              />
              <IconSparkles size={16} className="text-brand-400 hidden" />
            </div>
            <div className="hidden sm:flex sm:flex-col sm:justify-center">
              <h1 className="text-base font-bold text-primary leading-tight tracking-tight">
                SyncFrame Studio
              </h1>
              <p className="text-[11px] text-muted leading-tight font-medium">
                by Automist Labs
              </p>
            </div>
            <h1 className="sm:hidden text-sm font-bold text-primary tracking-tight">
              SyncFrame
            </h1>
          </div>

          {/* Right side: health indicator + theme toggle */}
          <div className="flex items-center gap-4">
            {/* Health indicator */}
            <div className="flex items-center gap-2 bg-black/10 px-2.5 py-1.5 rounded-md border" style={{ borderColor: 'var(--color-surface-card-border)' }}>
              {healthOk === null && (
                <span className="flex items-center gap-1.5 text-xs text-muted font-medium">
                  <IconLoader size={12} className="animate-spin" />
                  Connecting
                </span>
              )}
              {healthOk === true && (
                <span className="flex items-center gap-1.5 text-xs text-emerald-400 font-medium">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                  </span>
                  Online
                </span>
              )}
              {healthOk === false && (
                <span className="flex items-center gap-1.5 text-xs text-red-400 font-medium">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                  Offline
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
        <div className="absolute inset-0 bg-gradient-to-b from-brand-900/10 via-transparent to-transparent pointer-events-none" />
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-12 sm:py-16 relative">
          <div className="text-center space-y-5 max-w-3xl mx-auto">
            <h2 className="text-3xl sm:text-4xl font-extrabold text-primary leading-tight tracking-tight">
              Create perfectly timed <span className="text-gradient">videos</span>
            </h2>
            <p className="text-secondary text-sm sm:text-lg leading-relaxed max-w-2xl mx-auto">
              Upload audio, ordered images, and timestamps — then export polished videos with music, outro, watermark, and quality controls.
            </p>
            <div className="flex flex-wrap justify-center items-center gap-3 pt-4">
              {[
                { label: 'Localhost', icon: <IconZap size={12} /> },
                { label: 'No paid APIs', icon: <IconSparkles size={12} /> },
                { label: 'Music + Outro', icon: <IconMusic size={12} /> },
                { label: 'Watermark', icon: <IconImage size={12} /> },
                { label: '720p–4K', icon: <IconFileText size={12} /> },
              ].map((chip) => (
                <div
                  key={chip.label}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-brand-500/10 border border-brand-500/20 text-xs font-semibold text-brand-300 shadow-sm"
                >
                  {chip.icon}
                  {chip.label}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* Main content (Responsive Grid)                                       */}
      {/* ------------------------------------------------------------------ */}
      <main className="flex-1 max-w-5xl mx-auto w-full px-4 sm:px-6 py-8 space-y-6">

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

        {/* Row 1: Responsive 2-column balanced layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-start">
          
          {/* ── LEFT COLUMN (Uploads, Generate, Results) ── */}
          <div className="space-y-8 flex flex-col">
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

              <div className="space-y-4">
                <FileDropZone
                  id="audio-upload"
                  label="Audio File"
                  description="MP3, WAV, M4A supported"
                  accept="audio/*,.mp3,.wav,.m4a,.aac"
                  icon={<IconMusic size={20} />}
                  file={audioFile}
                  onChange={setAudioFile}
                  disabled={isLoading}
                />

                <FileDropZone
                  id="images-upload"
                  label="Images ZIP"
                  description="ZIP containing 1.jpg, 2.jpg, 3.jpg…"
                  accept=".zip,application/zip"
                  icon={<IconImage size={20} />}
                  file={imagesZip}
                  onChange={setImagesZip}
                  disabled={isLoading}
                />

                <FileDropZone
                  id="csv-upload"
                  label="Timestamp CSV"
                  description="CSV with image, start, end columns"
                  accept=".csv,text/csv"
                  icon={<IconFileText size={20} />}
                  file={csvFile}
                  onChange={setCsvFile}
                  disabled={isLoading}
                />
              </div>
            </div>

            {/* ── Generate button ── */}
            <div className="card p-6 flex flex-col items-center gap-5 text-center">
              {/* File checklist and Settings Summary */}
              <div className="flex flex-col items-center gap-2">
                <div className="flex items-center gap-4 text-xs flex-wrap justify-center">
                  {[
                    { label: 'Audio', file: audioFile },
                    { label: 'Images', file: imagesZip },
                    { label: 'CSV', file: csvFile },
                  ].map(({ label, file }) => (
                    <div
                      key={label}
                      className={`flex items-center gap-1.5 ${file ? 'text-emerald-400' : 'text-muted'}`}
                    >
                      <span
                        className={`w-3.5 h-3.5 rounded-full flex items-center justify-center text-[9px] border ${
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

                  <div className="w-px h-3 bg-white/10 mx-1 hidden sm:block" />

                  <div className="flex items-center gap-2 text-muted hidden sm:flex">
                    <span className="px-1.5 py-0.5 rounded text-[10px] bg-white/5 border border-white/10">{settings.exportResolution}</span>
                    <span className="px-1.5 py-0.5 rounded text-[10px] bg-white/5 border border-white/10">{settings.aspectRatio}</span>
                    <span className="px-1.5 py-0.5 rounded text-[10px] bg-white/5 border border-white/10">{settings.renderProfile.replace('_', ' ')}</span>
                  </div>

                  {/* Optional enhancements indicator */}
                  {(introFile || outroFile || bgMusicFile || (settings.enableWatermark && settings.watermarkText.trim())) && (
                    <>
                      <div className="w-px h-3 bg-white/10 mx-1 hidden sm:block" />
                      <div className="flex items-center gap-1.5 text-violet-400">
                        <span className="w-3.5 h-3.5 rounded-full flex items-center justify-center text-[9px] border border-violet-500/40 bg-violet-500/10">
                          ✦
                        </span>
                        {[
                          bgMusicFile && 'Music',
                          introFile && 'Intro',
                          outroFile && 'Outro',
                          (settings.enableWatermark && settings.watermarkText.trim()) && 'Watermark',
                        ].filter(Boolean).join(' + ')}
                      </div>
                    </>
                  )}
                </div>
              </div>

              <button
                id="generate-btn"
                onClick={handleGenerate}
                disabled={!canGenerate}
                className={`btn-primary text-base sm:text-lg px-8 sm:px-10 py-3 sm:py-4 rounded-xl w-full max-w-sm font-semibold shadow-xl transition-all ${
                  canGenerate 
                    ? 'shadow-brand-900/50 hover:scale-[1.02] active:scale-[0.98]' 
                    : 'opacity-50 cursor-not-allowed shadow-none'
                }`}
                aria-label="Generate video"
              >
                {isLoading ? (
                  <span className="flex items-center justify-center gap-2">
                    <IconLoader size={20} className="animate-spin" />
                    Generating…
                  </span>
                ) : (
                  <span className="flex items-center justify-center gap-2">
                    <IconZap size={20} />
                    Generate Video
                  </span>
                )}
              </button>

              {!canGenerate && !isLoading ? (
                <p className="text-[11px] sm:text-xs text-amber-400/80">
                  Upload all three required files above to enable generation.
                </p>
              ) : canGenerate && !isLoading ? (
                <p className="text-[11px] sm:text-xs text-emerald-400/80">
                  Ready to generate your video.
                </p>
              ) : null}
            </div>

            {/* ── Results ── */}
            {result && (
              <div className="animate-fade-in">
                <ResultsPanel result={result} settings={settings} />
              </div>
            )}
          </div>

          {/* ── RIGHT COLUMN (Guide, Settings, Enhancements) ── */}
          <div className="space-y-8">
            <CsvGuide />

            <SettingsPanel
              settings={settings}
              onChange={setSettings}
              disabled={isLoading}
            />

            <EnhancementsPanel
              settings={settings}
              onSettingsChange={setSettings}
              introFile={introFile}
              onIntroChange={setIntroFile}
              outroFile={outroFile}
              onOutroChange={setOutroFile}
              bgMusicFile={bgMusicFile}
              onBgMusicChange={setBgMusicFile}
              disabled={isLoading}
            />
          </div>
        </div>
      </main>

      {/* ------------------------------------------------------------------ */}
      {/* Footer                                                              */}
      {/* ------------------------------------------------------------------ */}
      <footer className="border-t mt-auto" style={{ borderColor: 'var(--color-surface-card-border)' }}>
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 flex items-center justify-between gap-4">
          <p className="text-xs text-muted font-medium">
            SyncFrame Studio by <span className="text-secondary">Automist Labs</span> · Runs fully on localhost
          </p>
          <p className="text-xs text-muted opacity-60">v1.3.0</p>
        </div>
      </footer>
    </div>
  )
}
