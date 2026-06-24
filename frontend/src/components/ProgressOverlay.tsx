// components/ProgressOverlay.tsx – Professional progress modal with real job polling and cancel

import React, { useEffect, useState, useRef, useCallback } from 'react'
import { IconLoader, IconZap, IconClock, IconXCircle } from './icons'
import type { JobStatus } from '../types'
import { getJobStatus, cancelJob } from '../utils/api'

interface ProgressOverlayProps {
  jobId: string | null
  onJobComplete: (status: JobStatus) => void
  onCancelled: () => void
}

function formatTime(seconds: number): string {
  if (!seconds || seconds < 0) return '—'
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

export default function ProgressOverlay({ jobId, onJobComplete, onCancelled }: ProgressOverlayProps) {
  const [jobStatus, setJobStatus] = useState<JobStatus | null>(null)
  const [pollError, setPollError] = useState<string | null>(null)
  const [showConfirm, setShowConfirm] = useState(false)
  const [cancelling, setCancelling] = useState(false)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const completedRef = useRef(false)

  const stopPolling = useCallback(() => {
    if (pollRef.current !== null) {
      clearInterval(pollRef.current)
      pollRef.current = null
    }
  }, [])

  useEffect(() => {
    if (!jobId) return
    completedRef.current = false
    setPollError(null)
    setJobStatus(null)
    setShowConfirm(false)
    setCancelling(false)

    const poll = async () => {
      if (completedRef.current) return
      try {
        const status = await getJobStatus(jobId)
        setJobStatus(status)
        setPollError(null)

        if (status.status === 'completed' || status.status === 'failed') {
          completedRef.current = true
          stopPolling()
          onJobComplete(status)
        } else if (status.status === 'cancelled') {
          completedRef.current = true
          stopPolling()
          onCancelled()
        }
      } catch (err) {
        setPollError(String(err))
      }
    }

    // Poll immediately, then every 1.5 s
    poll()
    pollRef.current = setInterval(poll, 1500)

    return () => stopPolling()
  }, [jobId, onJobComplete, onCancelled, stopPolling])

  const handleCancelClick = () => setShowConfirm(true)
  const handleCancelDismiss = () => setShowConfirm(false)

  const handleCancelConfirm = async () => {
    if (!jobId) return
    setCancelling(true)
    setShowConfirm(false)
    try {
      await cancelJob(jobId)
    } catch {
      // Cancel request may fail if job already ended — that's fine, polling will catch it
    }
  }

  const progress = jobStatus?.progress ?? 0
  const step = cancelling
    ? 'Cancelling…'
    : (jobStatus?.current_step ?? (jobId ? 'Connecting to server…' : 'Starting…'))
  const elapsed = jobStatus?.elapsed_seconds ?? 0
  const remaining = jobStatus?.estimated_remaining_seconds ?? null
  const isTerminal = jobStatus?.status === 'completed' || jobStatus?.status === 'failed' || jobStatus?.status === 'cancelled'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md animate-fade-in">
      <div
        className="relative overflow-hidden rounded-2xl p-8 w-[440px] max-w-[95vw] space-y-6 shadow-2xl border"
        style={{ backgroundColor: 'var(--color-surface-card)', borderColor: 'rgba(99,102,241,0.2)' }}
        role="dialog"
        aria-modal="true"
        aria-label="Generating Video"
      >
        {/* Subtle background glow */}
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-brand-500/20 blur-[80px] rounded-full pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-violet-500/20 blur-[80px] rounded-full pointer-events-none" />

        <div className="relative">
          {/* Animated icon */}
          <div className="flex justify-center mb-6">
            <div className="relative w-20 h-20">
              {!isTerminal && (
                <>
                  <div className="absolute inset-0 rounded-full bg-brand-gradient opacity-20 animate-ping" style={{ animationDuration: '2s' }} />
                  <div className="absolute inset-0 rounded-full bg-brand-500/20 animate-pulse-slow" />
                </>
              )}
              <div className="relative w-20 h-20 rounded-full bg-surface-card border flex items-center justify-center shadow-inner" style={{ borderColor: 'var(--color-surface-card-border)' }}>
                {cancelling ? (
                  <IconXCircle size={32} className="text-red-400" />
                ) : progress === 100 ? (
                  <span className="text-3xl text-emerald-400">✓</span>
                ) : (
                  <IconZap size={32} className="text-brand-400" />
                )}
              </div>
            </div>
          </div>

          {/* Title + step */}
          <div className="text-center space-y-2">
            <h3 className="text-2xl font-extrabold text-primary tracking-tight">
              {cancelling ? 'Cancelling…' : 'Generating Video'}
            </h3>
            <p
              className="text-sm font-medium text-brand-300 min-h-[20px] transition-all duration-300"
              aria-live="polite"
            >
              {step}
            </p>
          </div>

          {/* Progress percentage */}
          <div className="mt-8 text-center">
            <div className="flex items-baseline justify-center gap-1">
              <span className="text-4xl font-black text-gradient tabular-nums tracking-tighter">
                {progress}
              </span>
              <span className="text-lg font-bold text-muted">%</span>
            </div>
          </div>

          {/* Progress bar */}
          <div className="mt-4 w-full h-2.5 rounded-full overflow-hidden shadow-inner bg-surface-input border" style={{ borderColor: 'var(--color-surface-card-border)' }}>
            <div
              className="h-full bg-gradient-to-r from-brand-500 via-violet-500 to-brand-400 rounded-full transition-all duration-300 ease-out relative"
              style={{ width: `${progress}%` }}
            >
              <div className="absolute top-0 right-0 bottom-0 left-0 bg-white/20 animate-pulse-slow" />
            </div>
          </div>

          {/* Timing row */}
          <div className="mt-5 flex items-center justify-between text-[11px] font-medium uppercase tracking-wider text-muted">
            <span className="flex items-center gap-1.5">
              <IconClock size={12} />
              Elapsed: <strong className="text-secondary tabular-nums font-bold">{formatTime(elapsed)}</strong>
            </span>
            <span className="flex items-center gap-1.5">
              <IconClock size={12} />
              Remaining: <strong className="text-secondary tabular-nums font-bold">
                {remaining !== null && remaining > 0 ? formatTime(remaining) : 'Calculating…'}
              </strong>
            </span>
          </div>

          {/* Poll error notice */}
          {pollError && (
            <div className="mt-4 px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/20 text-xs text-red-400 text-center animate-fade-in">
              <span className="font-semibold">⚠ Connection lost</span> — retrying…
            </div>
          )}

          {/* Cancel button */}
          {!isTerminal && !cancelling && (
            <div className="mt-8 flex justify-center">
              <button
                id="cancel-generation-btn"
                onClick={handleCancelClick}
                className="group flex items-center gap-1.5 text-xs font-medium text-muted hover:text-red-400 transition-colors"
                aria-label="Cancel video generation"
              >
                <IconXCircle size={14} className="opacity-70 group-hover:opacity-100" />
                Abort
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Confirmation dialog */}
      {showConfirm && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="card p-6 w-[340px] max-w-[92vw] space-y-5 shadow-2xl text-center border-amber-500/30">
            <div className="w-12 h-12 mx-auto rounded-full bg-amber-500/10 flex items-center justify-center text-amber-400 text-xl">
              ⚠
            </div>
            <div className="space-y-2">
              <h4 className="text-lg font-bold text-primary tracking-tight">Cancel Generation?</h4>
              <p className="text-sm text-secondary leading-relaxed">
                Are you sure you want to cancel? All current progress will be lost.
              </p>
            </div>
            <div className="flex gap-3 justify-center pt-2">
              <button
                id="cancel-confirm-no-btn"
                onClick={handleCancelDismiss}
                className="flex-1 py-2.5 rounded-lg font-semibold text-sm bg-surface-input border border-surface-card-border text-primary hover:bg-surface-card transition-colors"
              >
                Keep Going
              </button>
              <button
                id="cancel-confirm-yes-btn"
                onClick={handleCancelConfirm}
                className="flex-1 py-2.5 rounded-lg font-semibold text-sm bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 transition-colors"
              >
                Yes, Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
