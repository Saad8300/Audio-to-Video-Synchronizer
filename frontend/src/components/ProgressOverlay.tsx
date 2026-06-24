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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm animate-fade-in">
      <div
        className="card p-8 w-[420px] max-w-[95vw] space-y-6 shadow-2xl"
        role="dialog"
        aria-modal="true"
        aria-label="Generating Video"
      >
        {/* Animated icon */}
        <div className="flex justify-center">
          <div className="relative w-20 h-20">
            {!isTerminal && (
              <div className="absolute inset-0 rounded-full bg-brand-gradient opacity-20 animate-ping" />
            )}
            <div className="relative w-20 h-20 rounded-full bg-brand-gradient/10 border border-brand-500/30 flex items-center justify-center text-brand-400">
              {cancelling ? (
                <IconXCircle size={32} className="text-red-400" />
              ) : progress === 100 ? (
                <span className="text-3xl">✓</span>
              ) : (
                <IconZap size={32} className="text-violet-400" />
              )}
            </div>
          </div>
        </div>

        {/* Title + step */}
        <div className="text-center space-y-1.5">
          <h3 className="text-xl font-bold text-primary">
            {cancelling ? 'Cancelling…' : 'Generating Video'}
          </h3>
          <p
            className="text-sm text-secondary min-h-[20px] transition-all duration-500"
            aria-live="polite"
          >
            {step}
          </p>
        </div>

        {/* Progress percentage */}
        <div className="text-center">
          <span className="text-4xl font-extrabold text-gradient tabular-nums">
            {progress}%
          </span>
          <span className="text-sm text-muted ml-1">complete</span>
        </div>

        {/* Progress bar */}
        <div className="w-full h-2.5 rounded-full overflow-hidden" style={{ backgroundColor: 'rgba(99,102,241,0.12)' }}>
          <div
            className="h-full bg-gradient-to-r from-brand-500 to-violet-500 rounded-full transition-all duration-700 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Timing row */}
        <div className="flex items-center justify-between text-xs text-muted">
          <span className="flex items-center gap-1.5">
            <IconClock size={13} />
            Elapsed: <strong className="text-secondary tabular-nums">{formatTime(elapsed)}</strong>
          </span>
          {remaining !== null && remaining > 0 && (
            <span className="flex items-center gap-1.5">
              <IconClock size={13} />
              Remaining: <strong className="text-secondary tabular-nums">{formatTime(remaining)}</strong>
            </span>
          )}
        </div>

        {/* Poll error notice */}
        {pollError && (
          <p className="text-xs text-red-400 text-center">
            ⚠ Could not reach server — retrying…
          </p>
        )}

        {/* Cancel button */}
        {!isTerminal && !cancelling && (
          <div className="flex justify-center">
            <button
              id="cancel-generation-btn"
              onClick={handleCancelClick}
              className="btn-danger text-sm px-5 py-2"
              aria-label="Cancel video generation"
            >
              <IconXCircle size={15} />
              Cancel Generation
            </button>
          </div>
        )}

        {/* Performance note */}
        <p className="text-[11px] text-center text-muted leading-relaxed">
          Longer videos, Slow Zoom In, and Fade transitions take more time.
        </p>
      </div>

      {/* Confirmation dialog */}
      {showConfirm && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/50">
          <div className="card p-6 w-80 max-w-[92vw] space-y-5 shadow-2xl text-center">
            <div className="text-4xl">⚠️</div>
            <div className="space-y-1.5">
              <h4 className="text-base font-semibold text-primary">Cancel Generation?</h4>
              <p className="text-sm text-secondary">
                Are you sure you want to cancel this generation?
                The partial output will be discarded.
              </p>
            </div>
            <div className="flex gap-3 justify-center">
              <button
                id="cancel-confirm-no-btn"
                onClick={handleCancelDismiss}
                className="btn-secondary px-5 py-2 text-sm"
              >
                Keep Going
              </button>
              <button
                id="cancel-confirm-yes-btn"
                onClick={handleCancelConfirm}
                className="btn-danger px-5 py-2 text-sm"
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
