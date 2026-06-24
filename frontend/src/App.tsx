// App.tsx – Main application layout for Audio Image Sync Studio

import React, { useState, useEffect } from 'react'
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
} from './components/icons'
import type { GenerateSettings, GenerateResponse, GenerateStatus } from './types'
import { checkHealth, generateVideo } from './utils/api'

const DEFAULT_SETTINGS: GenerateSettings = {
  videoFormat: '16:9',
  fitMode: 'cover',
  transition: 'none',
  zoomEffect: 'none',
  outputName: 'my_video',
}

export default function App() {
  // File state
  const [audioFile, setAudioFile] = useState<File | null>(null)
  const [imagesZip, setImagesZip] = useState<File | null>(null)
  const [csvFile, setCsvFile] = useState<File | null>(null)

  // Settings
  const [settings, setSettings] = useState<GenerateSettings>(DEFAULT_SETTINGS)

  // Generation state
  const [status, setStatus] = useState<GenerateStatus>('idle')
  const [result, setResult] = useState<GenerateResponse | null>(null)
  const [healthOk, setHealthOk] = useState<boolean | null>(null)

  // Health check on mount
  useEffect(() => {
    checkHealth().then(setHealthOk)
  }, [])

  const canGenerate =
    audioFile !== null &&
    imagesZip !== null &&
    csvFile !== null &&
    status !== 'uploading' &&
    status !== 'generating'

  const handleGenerate = async () => {
    if (!audioFile || !imagesZip || !csvFile) return

    setResult(null)
    setStatus('uploading')

    try {
      setStatus('generating')
      const res = await generateVideo(audioFile, imagesZip, csvFile, settings)
      setResult(res)
      setStatus(res.success ? 'done' : 'error')
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

  const isLoading = status === 'uploading' || status === 'generating'

  return (
    <div className="min-h-screen flex flex-col">
      {/* Loading overlay */}
      {isLoading && <ProgressOverlay status={status === 'uploading' ? 'uploading' : 'generating'} />}

      {/* ------------------------------------------------------------------ */}
      {/* Header                                                              */}
      {/* ------------------------------------------------------------------ */}
      <header className="sticky top-0 z-40 border-b border-slate-800/80 bg-surface-950/80 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          {/* Logo / title */}
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-brand-gradient flex items-center justify-center shadow-lg shadow-brand-900/50">
              <IconSparkles size={16} className="text-white" />
            </div>
            <div className="hidden sm:block">
              <h1 className="text-sm font-bold text-slate-100 leading-none">
                Audio Image Sync Studio
              </h1>
              <p className="text-xs text-slate-500 mt-0.5 leading-none">
                Timestamp-driven video generation
              </p>
            </div>
            <h1 className="sm:hidden text-sm font-bold text-slate-100">
              AI Sync Studio
            </h1>
          </div>

          {/* Health indicator */}
          <div className="flex items-center gap-2">
            {healthOk === null && (
              <span className="flex items-center gap-1.5 text-xs text-slate-500">
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
        </div>
      </header>

      {/* ------------------------------------------------------------------ */}
      {/* Hero section                                                        */}
      {/* ------------------------------------------------------------------ */}
      <section className="relative overflow-hidden border-b border-slate-800/50">
        <div className="absolute inset-0 bg-gradient-to-br from-brand-900/30 via-transparent to-violet-900/20 pointer-events-none" />
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12 relative">
          <div className="text-center space-y-3 max-w-2xl mx-auto">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-500/10 border border-brand-500/20 text-brand-300 text-xs font-medium">
              <IconZap size={12} />
              Powered by MoviePy · FFmpeg · FastAPI
            </div>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-100 leading-tight">
              Create perfectly timed{' '}
              <span className="text-gradient">videos</span>
            </h2>
            <p className="text-slate-400 text-base leading-relaxed">
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
          <div className="rounded-xl bg-red-900/20 border border-red-500/30 px-5 py-4 flex items-start gap-3">
            <span className="text-red-400 mt-0.5">⚠</span>
            <div className="text-sm">
              <p className="font-semibold text-red-300">Backend server is not running</p>
              <p className="text-red-400/80 mt-0.5">
                Start the FastAPI server with:{' '}
                <code className="bg-surface-900/60 px-1.5 py-0.5 rounded text-xs">
                  uvicorn main:app --reload --host 127.0.0.1 --port 8000
                </code>
              </p>
            </div>
          </div>
        )}

        {/* Row 1: Upload panel + CSV guide */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Upload panel */}
          <div className="card-glow p-6 space-y-5">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                <IconImage size={18} />
              </div>
              <div>
                <h2 className="text-base font-semibold text-slate-100">Upload Files</h2>
                <p className="text-xs text-slate-500">Three files are required to generate a video</p>
              </div>
            </div>

            <div className="h-px bg-slate-700/50" />

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

          {/* CSV guide */}
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
                className={`flex items-center gap-1.5 ${file ? 'text-emerald-400' : 'text-slate-500'}`}
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
            <p className="text-xs text-slate-500">
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
      <footer className="border-t border-slate-800/50 mt-auto">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-5 flex items-center justify-between gap-4">
          <p className="text-xs text-slate-600">
            Audio Image Sync Studio · Runs fully on localhost · No internet required
          </p>
          <p className="text-xs text-slate-700">v1.0.0</p>
        </div>
      </footer>
    </div>
  )
}
