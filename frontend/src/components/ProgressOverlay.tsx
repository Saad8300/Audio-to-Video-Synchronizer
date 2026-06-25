// components/ProgressOverlay.tsx – Professional generation progress modal

import React, { useEffect, useState, useRef, useCallback } from 'react'
import { IconZap, IconClock, IconXCircle } from './icons'
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

  const etaLabel = (remaining !== null && (remaining > 0 || progress > 5)) ? formatTime(remaining) : 'Calculating…'

  const getStage = (p: number, t: boolean) => {
    if (t) return 3;
    if (p < 10) return 0; // Preparing
    if (p < 50) return 1; // Processing
    if (p < 90) return 2; // Encoding
    return 3;             // Finalizing
  }
  const currentStageIndex = getStage(progress, isTerminal);
  const stages = ['Preparing', 'Processing', 'Encoding', 'Finalizing'];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center animate-fade-in"
      style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(12px)' }}>

      <div
        className="relative w-[400px] max-w-[93vw] rounded-2xl shadow-2xl overflow-hidden animate-slide-up"
        style={{ background: 'var(--bg-card)', border: '1px solid var(--border-default)' }}
        role="dialog"
        aria-modal="true"
        aria-label="Generating Video"
      >
        {/* Soft background glows */}
        <div className="absolute -top-32 -left-32 w-64 h-64 rounded-full mix-blend-screen opacity-10 animate-pulse-slow pointer-events-none" style={{ background: 'radial-gradient(circle, var(--accent-primary) 0%, transparent 70%)' }} />
        <div className="absolute -bottom-32 -right-32 w-64 h-64 rounded-full mix-blend-screen opacity-5 animate-pulse-slow pointer-events-none" style={{ background: 'radial-gradient(circle, #8b5cf6 0%, transparent 70%)', animationDelay: '1.5s' }} />

        {/* Top accent line */}
        <div className="h-0.5 w-full relative overflow-hidden" style={{ background: `linear-gradient(90deg, var(--accent-primary), #8b5cf6)` }}>
          {!isTerminal && <div className="absolute inset-0 w-full h-full animate-shimmer" style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.8), transparent)' }} />}
        </div>

        <div className="p-8 space-y-6 relative">
          {/* Icon + title */}
          <div className="flex flex-col items-center gap-3 text-center">
            <div
              className="relative w-16 h-16 rounded-full flex items-center justify-center"
              style={{ background: 'var(--bg-card)', border: '1px solid var(--border-default)', boxShadow: '0 8px 32px rgba(0,0,0,0.2)' }}
            >
              {!isTerminal && (
                <svg className="absolute inset-0 w-full h-full animate-spin pointer-events-none" viewBox="0 0 100 100" style={{ transformOrigin: 'center' }}>
                  <circle cx="50" cy="50" r="48" fill="none" stroke="var(--border-default)" strokeWidth="3" />
                  <circle cx="50" cy="50" r="48" fill="none" stroke="var(--accent-primary)" strokeWidth="3" strokeDasharray="80 220" strokeLinecap="round" />
                </svg>
              )}
              <div className="relative">
                {cancelling
                  ? <IconXCircle size={28} style={{ color: 'var(--color-error)' }} />
                  : progress === 100
                  ? <span className="text-2xl" style={{ color: 'var(--color-success)' }}>✓</span>
                  : <IconZap size={28} style={{ color: 'var(--accent-primary)' }} />
                }
              </div>
            </div>

            <div>
              <h3 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
                {cancelling ? 'Cancelling…' : 'Generating Video'}
              </h3>
              <p
                className="text-sm mt-0.5 min-h-[20px] transition-all duration-300"
                style={{ color: 'var(--accent-primary)' }}
                aria-live="polite"
              >
                {step}{!isTerminal && !cancelling && <span className="animated-dots" />}
              </p>
            </div>
          </div>

          {/* Mini-stage row */}
          {!cancelling && (
            <div className="flex items-center justify-between px-2 pt-2 pb-1">
              {stages.map((st, i) => {
                const active = i === currentStageIndex;
                const past = i < currentStageIndex;
                return (
                  <div key={st} className="flex flex-col items-center gap-1.5 transition-opacity duration-300" style={{ opacity: active || past ? 1 : 0.4 }}>
                    <div
                      className="w-2.5 h-2.5 rounded-full transition-colors duration-300"
                      style={{
                        background: active ? 'var(--accent-primary)' : past ? 'var(--color-success)' : 'var(--bg-input)',
                        boxShadow: active ? '0 0 8px var(--accent-primary)' : 'none',
                      }}
                    />
                    <span className="text-[9px] font-semibold tracking-wide uppercase" style={{ color: active ? 'var(--accent-primary)' : 'var(--text-muted)' }}>
                      {st}
                    </span>
                  </div>
                )
              })}
            </div>
          )}

          {/* Percentage + bar */}
          <div className="space-y-2">
            <div className="flex items-baseline justify-between">
              <span className="text-3xl font-black tabular-nums tracking-tight text-gradient">{progress}</span>
              <span className="text-sm font-semibold" style={{ color: 'var(--text-muted)' }}>%</span>
            </div>
            <div
              className="w-full h-1.5 rounded-full overflow-hidden relative"
              style={{ background: 'var(--bg-input)', border: '1px solid var(--border-subtle)' }}
            >
              <div
                className="h-full rounded-full transition-all duration-300 ease-out relative overflow-hidden"
                style={{
                  width: `${progress}%`,
                  background: 'linear-gradient(90deg, var(--accent-primary), #8b5cf6)',
                }}
              >
                {!isTerminal && (
                  <div className="absolute inset-0 w-full h-full animate-shimmer" style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent)' }} />
                )}
              </div>
            </div>
          </div>

          {/* Timing */}
          <div className="flex items-center justify-between text-[11px]" style={{ color: 'var(--text-muted)' }}>
            <span className="flex items-center gap-1.5">
              <IconClock size={11} />
              Elapsed <strong className="tabular-nums" style={{ color: 'var(--text-secondary)' }}>{formatTime(elapsed)}</strong>
            </span>
            <span className="flex items-center gap-1.5">
              <IconClock size={11} />
              Remaining <strong className="tabular-nums" style={{ color: 'var(--text-secondary)' }}>{etaLabel}</strong>
            </span>
          </div>

          {/* Long video note */}
          <p className="text-[10px] text-center italic" style={{ color: 'var(--text-muted)' }}>
            Long videos may take several minutes depending on resolution, zoom, and your computer.
          </p>

          {/* Poll error */}
          {pollError && (
            <div className="alert-error animate-fade-in text-xs text-center">
              ⚠ Connection lost — retrying…
            </div>
          )}

          {/* Cancel */}
          {!isTerminal && !cancelling && (
            <div className="flex justify-center">
              <button
                id="cancel-generation-btn"
                onClick={handleCancelClick}
                className="group flex items-center gap-1.5 text-xs transition-colors"
                style={{ color: 'var(--text-muted)' }}
                aria-label="Cancel video generation"
              >
                <IconXCircle size={13} className="opacity-60 group-hover:opacity-100" />
                <span className="group-hover:underline" style={{ /* hover handled inline: */ }}>Abort generation</span>
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
  )
}
