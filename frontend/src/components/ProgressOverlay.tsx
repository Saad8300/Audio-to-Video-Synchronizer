// components/ProgressOverlay.tsx – Premium generation progress modal

import React, { useEffect, useState, useRef, useCallback } from 'react'
import { IconClock, IconXCircle } from './icons'
import type { JobStatus } from '../types'
import { getJobStatus, cancelJob } from '../utils/api'

interface ProgressOverlayProps {
  jobId:         string | null
  onJobComplete: (status: JobStatus) => void
  onCancelled:   () => void
}

function formatTime(seconds: number): string {
  if (!seconds || seconds < 0) return '—'
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

// Waveform activity indicator – 4 bars, subtle equalizer pulse
function WaveformIndicator() {
  return (
    <div className="flex items-end justify-center gap-[3px]" style={{ height: 20 }} aria-hidden>
      {[0, 0.2, 0.1, 0.3].map((delay, i) => (
        <div
          key={i}
          style={{
            width: 3,
            borderRadius: 2,
            background: 'var(--accent-primary)',
            animation: `waveBar 1.1s ease-in-out ${delay}s infinite`,
            height: 4,
          }}
        />
      ))}
    </div>
  )
}

// Three soft-fade dots
function StatusDots() {
  return (
    <span className="inline-flex items-center gap-[3px] ml-1" aria-hidden>
      {[0, 0.25, 0.5].map((delay, i) => (
        <span
          key={i}
          style={{
            display: 'inline-block',
            width: 3,
            height: 3,
            borderRadius: '50%',
            background: 'currentColor',
            animation: `dotPulse 1.4s ease-in-out ${delay}s infinite`,
          }}
        />
      ))}
    </span>
  )
}

export default function ProgressOverlay({ jobId, onJobComplete, onCancelled }: ProgressOverlayProps) {
  const [jobStatus,   setJobStatus]   = useState<JobStatus | null>(null)
  const [pollError,   setPollError]   = useState<string | null>(null)
  const [showConfirm, setShowConfirm] = useState(false)
  const [cancelling,  setCancelling]  = useState(false)
  const pollRef      = useRef<ReturnType<typeof setInterval> | null>(null)
  const completedRef = useRef(false)

  const stopPolling = useCallback(() => {
    if (pollRef.current !== null) { clearInterval(pollRef.current); pollRef.current = null }
  }, [])

  useEffect(() => {
    if (!jobId) return
    completedRef.current = false
    setPollError(null); setJobStatus(null); setShowConfirm(false); setCancelling(false)

    const poll = async () => {
      if (completedRef.current) return
      try {
        const status = await getJobStatus(jobId)
        setJobStatus(status); setPollError(null)
        if (status.status === 'completed' || status.status === 'failed') {
          completedRef.current = true; stopPolling(); onJobComplete(status)
        } else if (status.status === 'cancelled') {
          completedRef.current = true; stopPolling(); onCancelled()
        }
      } catch (err) { setPollError(String(err)) }
    }

    poll()
    pollRef.current = setInterval(poll, 1500)
    return () => stopPolling()
  }, [jobId, onJobComplete, onCancelled, stopPolling])

  const handleCancelClick   = () => setShowConfirm(true)
  const handleCancelDismiss = () => setShowConfirm(false)
  const handleCancelConfirm = async () => {
    if (!jobId) return
    setCancelling(true); setShowConfirm(false)
    try { await cancelJob(jobId) } catch { /* polling will catch terminal state */ }
  }

  const progress   = jobStatus?.progress ?? 0
  const step       = cancelling ? 'Cancelling…' : (jobStatus?.current_step ?? (jobId ? 'Connecting…' : 'Starting…'))
  const elapsed    = jobStatus?.elapsed_seconds ?? 0
  const remaining  = jobStatus?.estimated_remaining_seconds ?? null
  const isTerminal = jobStatus?.status === 'completed' || jobStatus?.status === 'failed' || jobStatus?.status === 'cancelled'
  const isActive   = !isTerminal && !cancelling

  const etaLabel = (remaining !== null && (remaining > 0 || progress > 5)) ? formatTime(remaining) : 'Calculating…'

  // Stage logic
  const stageIndex =
    isTerminal ? 3 :
    progress < 10 ? 0 :
    progress < 50 ? 1 :
    progress < 88 ? 2 : 3
  const stages = [
    { label: 'Preparing',  short: 'Prep' },
    { label: 'Processing', short: 'Proc' },
    { label: 'Encoding',   short: 'Enc'  },
    { label: 'Finalizing', short: 'Final'},
  ]

  return (
    <>
      {/* Keyframe injection */}
      <style>{`
        @keyframes waveBar {
          0%, 100% { height: 4px; opacity: 0.5; }
          50%       { height: 18px; opacity: 1; }
        }
        @keyframes dotPulse {
          0%, 100% { opacity: 0.25; transform: scale(0.8); }
          50%       { opacity: 1;    transform: scale(1.2); }
        }
        @keyframes progressShimmer {
          0%   { transform: translateX(-200%); }
          100% { transform: translateX(300%); }
        }
      `}</style>

      <div
        className="fixed inset-0 z-50 flex items-center justify-center animate-fade-in"
        style={{ background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(10px)' }}
      >
        <div
          className="relative w-[420px] max-w-[94vw] animate-slide-up"
          style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border-default)',
            borderRadius: 20,
            boxShadow: '0 24px 60px rgba(0,0,0,0.35)',
          }}
          role="dialog"
          aria-modal="true"
          aria-label="Generating Video"
        >
          {/* Top gradient line */}
          <div
            style={{
              height: 3,
              borderRadius: '20px 20px 0 0',
              background: 'linear-gradient(90deg, var(--accent-primary) 0%, #8b5cf6 100%)',
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            {isActive && (
              <div style={{
                position: 'absolute', inset: 0,
                background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.7) 50%, transparent 100%)',
                animation: 'progressShimmer 2s linear infinite',
              }} />
            )}
          </div>

          <div style={{ padding: '28px 32px 26px', display: 'flex', flexDirection: 'column', gap: 20 }}>

            {/* Header: icon-area + title + waveform OR status */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              {/* Icon box */}
              <div style={{
                width: 52, height: 52, borderRadius: 14, flexShrink: 0,
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6,
                background: 'var(--accent-subtle)',
                border: '1px solid var(--accent-border)',
              }}>
                {/* Waveform when active, checkmark when done, X when cancelling */}
                {cancelling ? (
                  <IconXCircle size={22} style={{ color: 'var(--color-error)' }} />
                ) : isTerminal ? (
                  <span style={{ fontSize: 22, color: 'var(--color-success)' }}>✓</span>
                ) : (
                  <WaveformIndicator />
                )}
              </div>

              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>
                  {cancelling ? 'Cancelling…' : isTerminal ? 'Done' : 'Generating Video'}
                </div>
                <div
                  style={{ fontSize: 12, color: 'var(--accent-primary)', marginTop: 3, fontWeight: 500, display: 'flex', alignItems: 'center' }}
                  aria-live="polite"
                >
                  {step}
                  {isActive && <StatusDots />}
                </div>
              </div>

              {/* Live percentage badge */}
              {!cancelling && (
                <div style={{
                  fontSize: 20, fontWeight: 800, tabularNums: true,
                  color: 'var(--text-primary)', letterSpacing: '-0.03em', flexShrink: 0,
                } as React.CSSProperties}>
                  {progress}<span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', marginLeft: 1 }}>%</span>
                </div>
              )}
            </div>

            {/* Progress bar */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div style={{
                width: '100%', height: 6, borderRadius: 99, overflow: 'hidden',
                background: 'var(--bg-input)', border: '1px solid var(--border-subtle)',
                position: 'relative',
              }}>
                <div style={{
                  height: '100%', borderRadius: 99,
                  width: `${progress}%`,
                  background: 'linear-gradient(90deg, var(--accent-primary) 0%, #8b5cf6 100%)',
                  transition: 'width 0.4s ease-out',
                  position: 'relative', overflow: 'hidden',
                }}>
                  {isActive && (
                    <div style={{
                      position: 'absolute', inset: 0,
                      background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.35) 50%, transparent 100%)',
                      animation: 'progressShimmer 1.8s linear infinite',
                    }} />
                  )}
                </div>
              </div>

              {/* Stage indicators */}
              {!cancelling && (
                <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 2 }}>
                  {stages.map((st, i) => {
                    const isStageActive = i === stageIndex
                    const isStageComplete = i < stageIndex
                    return (
                      <div key={st.label} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, opacity: (isStageActive || isStageComplete) ? 1 : 0.35, transition: 'opacity 0.3s' }}>
                        <div style={{
                          width: 6, height: 6, borderRadius: '50%',
                          background: isStageComplete ? 'var(--color-success)' : isStageActive ? 'var(--accent-primary)' : 'var(--border-default)',
                          transition: 'background 0.3s',
                        }} />
                        <span style={{ fontSize: 9, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: isStageActive ? 'var(--accent-primary)' : 'var(--text-muted)' }}>
                          {st.short}
                        </span>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Timing row */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: 'var(--text-muted)' }}>
                <IconClock size={11} />
                Elapsed <strong style={{ color: 'var(--text-secondary)', fontVariantNumeric: 'tabular-nums', marginLeft: 3 }}>{formatTime(elapsed)}</strong>
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: 'var(--text-muted)' }}>
                <IconClock size={11} />
                Remaining <strong style={{ color: 'var(--text-secondary)', fontVariantNumeric: 'tabular-nums', marginLeft: 3 }}>{etaLabel}</strong>
              </span>
            </div>

            {/* Note */}
            <p style={{ fontSize: 10, textAlign: 'center', color: 'var(--text-muted)', fontStyle: 'italic', margin: 0 }}>
              Long videos may take several minutes depending on resolution and your computer.
            </p>

            {/* Poll error */}
            {pollError && (
              <div className="alert-error animate-fade-in text-xs text-center">
                ⚠ Connection lost — retrying…
              </div>
            )}

            {/* Abort */}
            {!isTerminal && !cancelling && (
              <div style={{ display: 'flex', justifyContent: 'center' }}>
                <button
                  id="cancel-generation-btn"
                  onClick={handleCancelClick}
                  className="group"
                  style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    fontSize: 11, color: 'var(--text-muted)',
                    background: 'none', border: 'none', cursor: 'pointer',
                    transition: 'color 0.15s',
                  }}
                  aria-label="Cancel video generation"
                  onMouseEnter={e => (e.currentTarget.style.color = 'var(--color-error)')}
                  onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-muted)')}
                >
                  <IconXCircle size={13} />
                  Abort generation
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Cancel confirmation dialog */}
        {showConfirm && (
          <div
            className="fixed inset-0 z-60 flex items-center justify-center animate-fade-in"
            style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
          >
            <div
              className="w-[320px] max-w-[92vw] rounded-xl p-6 space-y-5 shadow-2xl text-center animate-slide-up"
              style={{ background: 'var(--bg-card)', border: '1px solid var(--border-default)' }}
            >
              <div
                className="w-11 h-11 mx-auto rounded-xl flex items-center justify-center text-lg"
                style={{ background: 'var(--color-warning-bg)', border: '1px solid var(--color-warning-border)', color: 'var(--color-warning)' }}
              >
                ⚠
              </div>
              <div className="space-y-1.5">
                <h4 className="text-base font-bold" style={{ color: 'var(--text-primary)' }}>Cancel generation?</h4>
                <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                  All current progress will be lost.
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  id="cancel-confirm-no-btn"
                  onClick={handleCancelDismiss}
                  className="btn-secondary flex-1 py-2.5"
                >
                  Keep going
                </button>
                <button
                  id="cancel-confirm-yes-btn"
                  onClick={handleCancelConfirm}
                  className="flex-1 py-2.5 rounded-lg font-semibold text-sm transition-colors"
                  style={{
                    background: 'var(--color-error-bg)',
                    border: '1px solid var(--color-error-border)',
                    color: 'var(--color-error)',
                  }}
                >
                  Yes, cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  )
}
