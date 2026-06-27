import React, { useState, useRef, useCallback } from 'react'
import {
  IconMusic,
  IconUpload,
  IconX,
  IconLoader,
  IconCheck,
  IconAlertTriangle,
  IconDownload,
} from './icons'
import {
  createLocalProvider,
  generateDemoTranscription,
  MODELS,
} from '../services/transcription/localTranscriptionProvider'
import {
  formatOutput,
  formatCsv,
  type OutputMode,
} from '../services/transcription/formatterService'
import type { TranscriptionResult, TranscriptionStatus } from '../services/transcription/providerTypes'

function IconMic({ size = 24, style }: { size?: number; style?: React.CSSProperties }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
         stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={style}>
      <path d="M12 2a3 3 0 0 1 3 3v7a3 3 0 0 1-6 0V5a3 3 0 0 1 3-3Z"/>
      <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
      <line x1="12" x2="12" y1="19" y2="22"/>
    </svg>
  )
}
function IconCopy({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
         stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <rect width="14" height="14" x="8" y="8" rx="2" ry="2"/>
      <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/>
    </svg>
  )
}

type AppStatus = 'idle' | 'transcribing' | 'done' | 'error'

const OUTPUT_MODES: { value: OutputMode; label: string; desc: string }[] = [
  { value: 'simple',   label: 'Simple Timestamp Script', desc: '[0:00] Line here' },
  { value: 'detailed', label: 'Detailed Timestamp Script', desc: '[0:00 - 0:04] Line here' },
  { value: 'scene',    label: 'Scene Plan', desc: 'Scene 1 | 0:00 - 0:04 | Line here' },
  { value: 'srt',      label: 'SRT Captions', desc: 'Standard subtitle format' },
  { value: 'csv',      label: 'Timeline CSV', desc: 'start,end,text — for SyncFrame timelines' },
]

const LANGUAGES = [
  { code: 'auto', label: 'Auto Detect' },
  { code: 'en',   label: 'English' },
  { code: 'ur',   label: 'Urdu' },
  { code: 'hi',   label: 'Hindi' },
  { code: 'ar',   label: 'Arabic' },
  { code: 'es',   label: 'Spanish' },
  { code: 'fr',   label: 'French' },
  { code: 'de',   label: 'German' },
  { code: 'pt',   label: 'Portuguese' },
  { code: 'id',   label: 'Indonesian' },
  { code: 'tr',   label: 'Turkish' },
  { code: 'ru',   label: 'Russian' },
  { code: 'ja',   label: 'Japanese' },
  { code: 'ko',   label: 'Korean' },
  { code: 'zh',   label: 'Mandarin Chinese' },
]

function formatBytes(bytes: number) {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}
function formatDuration(s: number) {
  const m = Math.floor(s / 60), sec = Math.floor(s % 60)
  return `${m}:${sec.toString().padStart(2, '0')}`
}

export default function ScriptTimestampPage() {
  const [audioFile, setAudioFile]   = useState<File | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [modelKey, setModelKey]     = useState<string>('multilingual')
  const [language, setLanguage]     = useState('auto')
  const [outputMode, setOutputMode] = useState<OutputMode>('simple')
  const [status, setStatus]         = useState<AppStatus>('idle')
  const [progress, setProgress]     = useState(0)
  const [statusMsg, setStatusMsg]   = useState('')
  const [errorMsg, setErrorMsg]     = useState('')
  const [result, setResult]         = useState<TranscriptionResult | null>(null)
  const [output, setOutput]         = useState('')
  const [copied, setCopied]         = useState(false)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const ext = file.name.split('.').pop()?.toLowerCase() ?? ''
    if (!['mp3', 'wav', 'm4a', 'aac', 'webm', 'mp4', 'ogg', 'flac'].includes(ext)) {
      setErrorMsg('This audio format is not supported. Use mp3, wav, m4a, aac, webm, or mp4.')
      return
    }
    setAudioFile(file)
    setErrorMsg('')
    setResult(null)
    setOutput('')
    setStatus('idle')
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleGenerate = useCallback(async () => {
    const isDemo = modelKey === 'demo'
    if (!audioFile && !isDemo) {
      setErrorMsg('Please upload an audio file.')
      return
    }
    setStatus('transcribing')
    setErrorMsg('')
    setProgress(0)
    setStatusMsg('Preparing…')
    setResult(null)
    setOutput('')

    const onProgress = (_s: TranscriptionStatus, msg: string, p?: number) => {
      setStatusMsg(msg)
      if (p !== undefined) setProgress(p)
    }

    try {
      let transcriptionResult: TranscriptionResult

      if (isDemo) {
        onProgress('preparing', 'Demo mode — generating sample output…', 10)
        await new Promise(r => setTimeout(r, 600))
        onProgress('loading_model', 'Loading demo data…', 50)
        await new Promise(r => setTimeout(r, 400))
        onProgress('processing', 'Formatting…', 90)
        await new Promise(r => setTimeout(r, 300))
        const durationGuess = audioFile ? audioFile.size / 16000 : 60
        transcriptionResult = generateDemoTranscription(Math.max(30, Math.min(durationGuess, 120)))
        onProgress('complete', 'Demo complete!', 100)
      } else {
        const descriptor = MODELS[modelKey] ?? MODELS['multilingual']
        const provider = createLocalProvider(descriptor.id, descriptor.dtype)
        transcriptionResult = await provider.transcribe(audioFile!, language, onProgress)
      }

      const formatted = formatOutput({ mode: outputMode, segments: transcriptionResult.segments })
      setResult(transcriptionResult)
      setOutput(formatted)
      setStatus('done')
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      console.error(err)
      if (msg.includes('Model load failed') || msg.includes('load')) {
        setErrorMsg('Transcription model failed to load. Please try again or switch to Demo Mode.')
      } else if (msg.toLowerCase().includes('cancelled') || msg.toLowerCase().includes('abort')) {
        setErrorMsg('Transcription cancelled.')
      } else {
        setErrorMsg('Transcription failed. Please check your audio file and try again.')
      }
      setStatus('error')
    }
  }, [audioFile, modelKey, language, outputMode])

  const handleOutputModeChange = (mode: OutputMode) => {
    setOutputMode(mode)
    if (result) {
      setOutput(formatOutput({ mode, segments: result.segments }))
    }
  }

  const handleCopy = async () => {
    if (!output) return
    await navigator.clipboard.writeText(output)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const downloadAs = (content: string, filename: string, mime = 'text/plain') => {
    const blob = new Blob([content], { type: mime })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = filename
    document.body.appendChild(a); a.click()
    a.remove(); URL.revokeObjectURL(url)
  }

  const canGenerate = (!!audioFile || modelKey === 'demo') && status !== 'transcribing'
  const baseName = audioFile ? audioFile.name.replace(/\.[^.]+$/, '') : 'transcript'

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 pb-24 space-y-6 animate-fade-in">

      {/* Page Header */}
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0"
             style={{ background: 'var(--accent-subtle)', border: '1px solid var(--accent-border)' }}>
          <IconMic size={24} style={{ color: 'var(--accent-primary)' }} />
        </div>
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-gradient">Script Timestamp</h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--text-secondary)' }}>
            Upload voice audio and generate timestamped text for videos, captions, and timeline workflows.
          </p>
        </div>
      </div>

      {errorMsg && (
        <div className="alert-error">
          <IconAlertTriangle size={18} className="shrink-0" />
          <p className="text-sm font-medium">{errorMsg}</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

        {/* Left */}
        <div className="lg:col-span-8 space-y-6">

          {/* Upload */}
          <div className="card p-5">
            <h2 className="text-sm font-bold mb-1" style={{ color: 'var(--text-primary)' }}>Upload Audio File</h2>
            <p className="text-[11px] mb-4" style={{ color: 'var(--text-muted)' }}>
              Supported: mp3, wav, m4a, aac, webm, mp4. Your audio never leaves your device.
            </p>

            {audioFile ? (
              <div className="flex items-center justify-between p-3 rounded-xl border"
                   style={{ borderColor: 'var(--border-subtle)', background: 'var(--bg-elevated)' }}>
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                       style={{ background: 'var(--accent-subtle)' }}>
                    <IconMusic size={16} style={{ color: 'var(--accent-primary)' }} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>{audioFile.name}</p>
                    <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{formatBytes(audioFile.size)}</p>
                  </div>
                </div>
                <button onClick={() => { setAudioFile(null); setResult(null); setOutput('') }}
                        className="w-7 h-7 rounded flex items-center justify-center hover:bg-red-500/10 text-red-500 shrink-0">
                  <IconX size={14} />
                </button>
              </div>
            ) : (
              <button onClick={() => fileInputRef.current?.click()}
                      disabled={status === 'transcribing'}
                      className="w-full border-2 border-dashed rounded-xl py-10 flex flex-col items-center gap-3 transition-colors group"
                      style={{ borderColor: 'var(--border-default)', background: 'var(--bg-elevated)' }}>
                <div className="w-12 h-12 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110"
                     style={{ background: 'var(--accent-subtle)' }}>
                  <IconUpload size={22} style={{ color: 'var(--accent-primary)' }} />
                </div>
                <div className="text-center">
                  <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Click to upload audio</p>
                  <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>mp3, wav, m4a, aac, webm, mp4</p>
                </div>
              </button>
            )}

            <input ref={fileInputRef} type="file" className="hidden"
                   accept=".mp3,.wav,.m4a,.aac,.webm,.mp4,.ogg,.flac"
                   onChange={handleFileChange} />
          </div>

          {/* Settings */}
          <div className="card p-5 space-y-4">
            <h2 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>Settings</h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="form-label">AI Model</label>
                <select value={modelKey} onChange={e => setModelKey(e.target.value)}
                        className="form-select" disabled={status === 'transcribing'}>
                  {(Object.keys(MODELS) as string[]).map(k => (
                    <option key={k} value={k}>{MODELS[k].label}</option>
                  ))}
                  <option value="demo">Demo Mode (no download)</option>
                </select>
                <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                  {modelKey === 'demo'
                    ? 'Uses sample data — no model download required.'
                    : (MODELS[modelKey]?.description ?? '')}
                </p>
              </div>

              <div className="space-y-1">
                <label className="form-label">Language</label>
                <select value={language} onChange={e => setLanguage(e.target.value)}
                        className="form-select" disabled={status === 'transcribing'}>
                  {LANGUAGES.map(l => <option key={l.code} value={l.code}>{l.label}</option>)}
                </select>
              </div>

              <div className="space-y-1 sm:col-span-2">
                <label className="form-label">Output Format</label>
                <select value={outputMode}
                        onChange={e => handleOutputModeChange(e.target.value as OutputMode)}
                        className="form-select" disabled={status === 'transcribing'}>
                  {OUTPUT_MODES.map(m => (
                    <option key={m.value} value={m.value}>{m.label}</option>
                  ))}
                </select>
                <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                  {OUTPUT_MODES.find(m => m.value === outputMode)?.desc}
                </p>
              </div>
            </div>
          </div>

          {/* Generate */}
          <div className="card p-5">
            <button
              onClick={handleGenerate}
              disabled={!canGenerate}
              className="w-full flex items-center justify-center gap-2 rounded-xl text-sm font-bold transition-all"
              style={{
                height: 52,
                background: canGenerate ? 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)' : 'var(--bg-elevated)',
                color: canGenerate ? '#fff' : 'var(--text-muted)',
                boxShadow: canGenerate ? '0 4px 16px rgba(99,102,241,0.35)' : 'none',
                border: canGenerate ? 'none' : '1px solid var(--border-default)',
                cursor: canGenerate ? 'pointer' : 'not-allowed',
              }}
            >
              {status === 'transcribing' ? (
                <><IconLoader size={18} className="animate-spin" /> {statusMsg || 'Transcribing…'}</>
              ) : (
                <><IconMic size={18} /> Generate Timestamps</>
              )}
            </button>

            {status === 'transcribing' && (
              <div className="mt-3 space-y-1.5">
                <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--bg-input)' }}>
                  <div className="h-full rounded-full transition-all duration-300"
                       style={{ width: `${progress}%`, background: 'linear-gradient(90deg, #6366f1, #8b5cf6)' }} />
                </div>
                <p className="text-[11px] text-center" style={{ color: 'var(--text-muted)' }}>{statusMsg}</p>
                {progress < 70 && (
                  <p className="text-[10px] text-center" style={{ color: 'var(--text-muted)' }}>
                    First run may take a few minutes while the local model downloads (~38 MB).
                  </p>
                )}
              </div>
            )}

            {!canGenerate && status === 'idle' && (
              <p className="text-[11px] mt-2 text-center" style={{ color: 'var(--text-muted)' }}>
                Upload an audio file or choose Demo Mode to generate timestamps.
              </p>
            )}
          </div>

          {/* Results */}
          {status === 'done' && result && (
            <div className="card p-5 space-y-4">
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 rounded-full flex items-center justify-center"
                     style={{ background: 'rgba(34,197,94,0.15)' }}>
                  <IconCheck size={12} style={{ color: '#22c55e' }} />
                </div>
                <h2 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>Transcription Complete</h2>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { label: 'Duration', value: formatDuration(result.durationSeconds) },
                  { label: 'Language', value: ['auto','detected'].includes(result.language) ? 'Auto Detected' : result.language.toUpperCase() },
                  { label: 'Segments', value: String(result.segments.length) },
                  { label: 'Format', value: OUTPUT_MODES.find(m => m.value === outputMode)?.label ?? outputMode },
                ].map(({ label, value }) => (
                  <div key={label} className="rounded-lg p-2.5 text-center"
                       style={{ background: 'var(--bg-elevated)' }}>
                    <p className="text-[10px] uppercase tracking-wider mb-0.5" style={{ color: 'var(--text-muted)' }}>{label}</p>
                    <p className="text-xs font-bold truncate" style={{ color: 'var(--text-primary)' }}>{value}</p>
                  </div>
                ))}
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="form-label">Output</label>
                  <select value={outputMode}
                          onChange={e => handleOutputModeChange(e.target.value as OutputMode)}
                          className="form-select text-xs" style={{ width: 'auto', paddingTop: '0.25rem', paddingBottom: '0.25rem' }}>
                    {OUTPUT_MODES.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                  </select>
                </div>
                <textarea
                  readOnly value={output}
                  className="w-full text-xs font-mono rounded-xl p-3 resize-y"
                  style={{ minHeight: 180, background: 'var(--bg-input)', border: '1px solid var(--border-subtle)',
                           color: 'var(--text-primary)', lineHeight: 1.7 }}
                />
              </div>

              <div className="flex flex-wrap gap-2">
                <button onClick={handleCopy}
                        className="flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-lg transition-colors"
                        style={{ background: 'var(--bg-elevated)', color: 'var(--text-primary)', border: '1px solid var(--border-default)' }}>
                  {copied ? <IconCheck size={13} /> : <IconCopy size={13} />}
                  {copied ? 'Copied!' : 'Copy Output'}
                </button>

                <button onClick={() => downloadAs(output, `${baseName}.txt`)}
                        className="flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-lg transition-colors"
                        style={{ background: 'var(--bg-elevated)', color: 'var(--text-primary)', border: '1px solid var(--border-default)' }}>
                  <IconDownload size={13} /> Download TXT
                </button>

                {outputMode === 'srt' && (
                  <button onClick={() => downloadAs(output, `${baseName}.srt`)}
                          className="flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-lg btn-primary transition-colors">
                    <IconDownload size={13} /> Download SRT
                  </button>
                )}

                {outputMode === 'csv' && (
                  <button onClick={() => downloadAs(output, `${baseName}.csv`, 'text/csv')}
                          className="flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-lg btn-primary transition-colors">
                    <IconDownload size={13} /> Download CSV
                  </button>
                )}

                {outputMode !== 'csv' && result.segments.length > 0 && (
                  <button
                    onClick={() => downloadAs(formatCsv(result.segments), `${baseName}_timeline.csv`, 'text/csv')}
                    className="flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-lg transition-colors"
                    style={{ background: 'var(--accent-subtle)', color: 'var(--accent-primary)', border: '1px solid var(--accent-border)' }}>
                    <IconDownload size={13} /> Download Timeline CSV
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Right sidebar */}
        <div className="lg:col-span-4 space-y-6">
          <div className="card p-5 space-y-3">
            <h2 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>Quick Guide</h2>
            <div className="space-y-2 text-xs" style={{ color: 'var(--text-secondary)' }}>
              {[
                ['1', 'Upload your voiceover audio file'],
                ['2', 'Choose language — Auto Detect works for most files'],
                ['3', 'Select output format for your workflow'],
                ['4', 'Click Generate Timestamps'],
                ['5', 'Copy or download your output'],
              ].map(([step, desc]) => (
                <div key={step} className="flex gap-2.5">
                  <span className="w-5 h-5 rounded-full shrink-0 flex items-center justify-center text-[10px] font-bold"
                        style={{ background: 'var(--accent-subtle)', color: 'var(--accent-primary)' }}>
                    {step}
                  </span>
                  <span className="leading-snug">{desc}</span>
                </div>
              ))}
            </div>
            <div className="rounded-lg p-3 text-xs space-y-1"
                 style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)' }}>
              <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>🔒 100% Local</p>
              <p style={{ color: 'var(--text-muted)' }}>
                Whisper AI runs in your browser. Audio never leaves your machine. No API keys required.
              </p>
            </div>
          </div>

          <div className="card p-5 space-y-3">
            <h2 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>Output Formats</h2>
            <div className="space-y-3">
              {OUTPUT_MODES.map(m => (
                <div key={m.value} className="space-y-0.5">
                  <p className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>{m.label}</p>
                  <p className="text-[10px] font-mono" style={{ color: 'var(--accent-primary)' }}>{m.desc}</p>
                </div>
              ))}
            </div>
            <div className="rounded-lg p-3 text-xs"
                 style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)' }}>
              <p className="font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>💡 Timeline CSV Tip</p>
              <p style={{ color: 'var(--text-muted)' }}>
                Use Timeline CSV output with SyncFrame's Image Timeline or Media Timeline tools.
              </p>
            </div>
          </div>

          <div className="card p-5 space-y-2">
            <h2 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>AI Model Info</h2>
            <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
              First run downloads ~38 MB model to browser cache. Subsequent runs are instant.
            </p>
            <div className="space-y-1.5 text-xs" style={{ color: 'var(--text-muted)' }}>
              <p>• <strong>Whisper Tiny Multilingual</strong> — 16 languages, ~38 MB</p>
              <p>• <strong>Whisper Tiny English</strong> — English only, faster</p>
              <p>• <strong>Demo Mode</strong> — No download, sample output</p>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}
