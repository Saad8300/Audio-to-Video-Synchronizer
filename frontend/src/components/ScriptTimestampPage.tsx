import React, { useState, useRef, useCallback, useEffect } from 'react'
import {
  IconMusic,
  IconUpload,
  IconX,
  IconLoader,
  IconCheck,
  IconAlertTriangle,
  IconDownload,
} from './icons'
import type { JobStatus } from '../types'

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

const OUTPUT_MODES: { value: string; label: string; desc: string }[] = [
  { value: 'simple',   label: 'Simple Timestamp Script', desc: '[0:00] Line here' },
  { value: 'detailed', label: 'Detailed Timestamp Script', desc: '[0:00 - 0:04] Line here' },
  { value: 'scene',    label: 'Scene Plan', desc: 'Scene 1 | 0:00 - 0:04 | Line here' },
  { value: 'srt',      label: 'SRT Captions', desc: 'Standard subtitle format' },
  { value: 'csv',      label: 'Timeline CSV', desc: 'start,end,text — for SyncFrame timelines' },
]

const MODELS = [
  { value: 'tiny',  label: 'Whisper Tiny — fastest' },
  { value: 'base',  label: 'Whisper Base — balanced' },
  { value: 'small', label: 'Whisper Small — better accuracy, slower' },
]

const STYLES = [
  { value: 'standard', label: 'Standard Mode', desc: 'Keep natural sentences' },
  { value: 'visual_beat', label: 'Visual Beat Mode', desc: 'Shorter lines for image/video changes' },
]

const INTENSITIES = [
  { value: 'normal', label: 'Normal', desc: 'Minimal splitting' },
  { value: 'detailed', label: 'Detailed', desc: 'Moderate splitting on punctuation' },
  { value: 'aggressive', label: 'Aggressive', desc: 'Split more aggressively' },
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
  
  const [modelKey, setModelKey]     = useState('base')
  const [language, setLanguage]     = useState('auto')
  const [outputStyle, setOutputStyle] = useState('standard')
  const [segmentationIntensity, setSegmentationIntensity] = useState('detailed')
  const [outputMode, setOutputMode] = useState('simple')
  
  const [status, setStatus]         = useState<AppStatus>('idle')
  const [progress, setProgress]     = useState(0)
  const [statusMsg, setStatusMsg]   = useState('')
  const [errorMsg, setErrorMsg]     = useState('')
  const [jobId, setJobId]           = useState<string | null>(null)
  const [result, setResult]         = useState<any | null>(null)
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
    setStatus('idle')
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleGenerate = async () => {
    if (!audioFile) {
      setErrorMsg('Please upload an audio file.')
      return
    }
    setStatus('transcribing')
    setErrorMsg('')
    setProgress(0)
    setStatusMsg('Uploading audio…')
    setResult(null)
    setJobId(null)

    const formData = new FormData()
    formData.append('audio_file', audioFile)
    formData.append('model_name', modelKey)
    formData.append('language', language)
    formData.append('output_style', outputStyle)
    formData.append('segmentation_intensity', segmentationIntensity)
    formData.append('output_format', outputMode)

    try {
      const res = await fetch('http://127.0.0.1:8000/api/jobs/start-script-timestamp', {
        method: 'POST',
        body: formData,
      })
      if (!res.ok) {
        throw new Error('Backend transcription failed. Please check your audio file and try again.')
      }
      const data = await res.json()
      setJobId(data.job_id)
    } catch (err: any) {
      setErrorMsg(err.message || 'Backend is offline. Start the app backend and try again.')
      setStatus('error')
    }
  }

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>
    if (status === 'transcribing' && jobId) {
      interval = setInterval(async () => {
        try {
          const res = await fetch(`http://127.0.0.1:8000/api/jobs/${jobId}/status`)
          if (!res.ok) throw new Error('Failed to fetch status')
          const data = await res.json()
          
          if (data.status === 'completed') {
            clearInterval(interval)
            const rep = data.timeline_report?.[0]
            if (rep) {
              setResult(rep)
              setStatus('done')
            } else {
              setErrorMsg('No output received.')
              setStatus('error')
            }
          } else if (data.status === 'error') {
            clearInterval(interval)
            setErrorMsg(data.errors?.[0] || 'Transcription failed.')
            setStatus('error')
          } else if (data.status === 'cancelled') {
            clearInterval(interval)
            setErrorMsg('Transcription cancelled.')
            setStatus('error')
          } else {
            setProgress(data.progress || 0)
            setStatusMsg(data.current_step || 'Processing…')
          }
        } catch (err) {
          // just retry next poll
        }
      }, 1000)
    }
    return () => clearInterval(interval)
  }, [status, jobId])

  const handleCopy = async () => {
    if (!result?.text) return
    await navigator.clipboard.writeText(result.text)
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

  const canGenerate = !!audioFile && status !== 'transcribing'
  const baseName = audioFile ? audioFile.name.replace(/\.[^.]+$/, '') : 'transcript'

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 pb-24 space-y-6 animate-fade-in">
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
                <button onClick={() => { setAudioFile(null); setResult(null) }}
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
                  {MODELS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                </select>
                <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                  Models run locally in the backend. First use may download the model files.
                </p>
              </div>

              <div className="space-y-1">
                <label className="form-label">Language</label>
                <select value={language} onChange={e => setLanguage(e.target.value)}
                        className="form-select" disabled={status === 'transcribing'}>
                  {LANGUAGES.map(l => <option key={l.code} value={l.code}>{l.label}</option>)}
                </select>
              </div>

              <div className="space-y-1">
                <label className="form-label">Output Style</label>
                <select value={outputStyle} onChange={e => setOutputStyle(e.target.value)}
                        className="form-select" disabled={status === 'transcribing'}>
                  {STYLES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
                <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                  {STYLES.find(s => s.value === outputStyle)?.desc}
                </p>
              </div>

              <div className="space-y-1">
                <label className="form-label">Segmentation Intensity</label>
                <select value={segmentationIntensity} onChange={e => setSegmentationIntensity(e.target.value)}
                        className="form-select" disabled={status === 'transcribing'}>
                  {INTENSITIES.map(i => <option key={i.value} value={i.value}>{i.label}</option>)}
                </select>
                <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                  {INTENSITIES.find(i => i.value === segmentationIntensity)?.desc}
                </p>
              </div>

              <div className="space-y-1 sm:col-span-2">
                <label className="form-label">Output Format</label>
                <select value={outputMode}
                        onChange={e => setOutputMode(e.target.value)}
                        className="form-select" disabled={status === 'transcribing'}>
                  {OUTPUT_MODES.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
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
                <p className="text-[10px] text-center" style={{ color: 'var(--text-muted)' }}>
                  For long audio, keep the backend running and avoid closing this window during transcription.
                </p>
              </div>
            )}

            {!canGenerate && status === 'idle' && (
              <p className="text-[11px] mt-2 text-center" style={{ color: 'var(--text-muted)' }}>
                Upload an audio file to generate timestamps.
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
                  { label: 'Duration', value: formatDuration(result.duration) },
                  { label: 'Language', value: ['auto','detected'].includes(result.language) ? 'Auto Detected' : result.language.toUpperCase() },
                  { label: 'Segments', value: String(result.segments_count) },
                  { label: 'Format', value: OUTPUT_MODES.find(m => m.value === result.format)?.label ?? result.format },
                ].map(({ label, value }) => (
                  <div key={label} className="rounded-lg p-2.5 text-center"
                       style={{ background: 'var(--bg-elevated)' }}>
                    <p className="text-[10px] uppercase tracking-wider mb-0.5" style={{ color: 'var(--text-muted)' }}>{label}</p>
                    <p className="text-xs font-bold truncate" style={{ color: 'var(--text-primary)' }}>{value}</p>
                  </div>
                ))}
              </div>

              <div>
                <label className="form-label mb-2">Output</label>
                <textarea
                  readOnly value={result.text}
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

                <button onClick={() => downloadAs(result.text, `${baseName}.txt`)}
                        className="flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-lg transition-colors"
                        style={{ background: 'var(--bg-elevated)', color: 'var(--text-primary)', border: '1px solid var(--border-default)' }}>
                  <IconDownload size={13} /> Download TXT
                </button>

                {result.format === 'srt' && (
                  <button onClick={() => downloadAs(result.text, `${baseName}.srt`)}
                          className="flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-lg btn-primary transition-colors">
                    <IconDownload size={13} /> Download SRT
                  </button>
                )}

                {result.format === 'csv' && (
                  <button onClick={() => downloadAs(result.text, `${baseName}.csv`, 'text/csv')}
                          className="flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-lg btn-primary transition-colors">
                    <IconDownload size={13} /> Download CSV
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
                Whisper runs locally in the SyncFrame backend. Your audio stays on this machine.
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
            <h2 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>Backend Local Processing</h2>
            <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
              Transcription runs directly on your machine through the Python backend. First run may download model files.
            </p>
          </div>
        </div>
      </div>
    </main>
  )
}
