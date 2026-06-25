// components/ProgressOverlay.tsx – Render progress modal (Batch 9 update)
// Added: 4-sided animated border, render spec chips, renderSpec prop

import React, { useEffect, useState, useRef, useCallback } from 'react'
import { IconClock, IconXCircle } from './icons'
import type { JobStatus, ExportResolution, RenderProfile } from '../types'
import { getJobStatus, cancelJob } from '../utils/api'

// ─── Types ───────────────────────────────────────────────────────────────────

interface RenderSpec {
  resolution:    ExportResolution
  renderProfile: RenderProfile
}

interface ProgressOverlayProps {
  jobId:         string | null
  onJobComplete: (status: JobStatus) => void
  onCancelled:   () => void
  renderSpec?:   RenderSpec
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatTime(seconds: number): string {
  if (!seconds || seconds < 0) return '—'
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

const PROFILE_FPS: Record<RenderProfile, string> = {
  fast_preview: '24 FPS',
  balanced:     '30 FPS',
  high_quality: '30 FPS',
}

const PROFILE_LABEL: Record<RenderProfile, string> = {
  fast_preview: 'Fast Preview',
  balanced:     'Balanced',
  high_quality: 'High Quality',
}

// ─── Frame-strip scanner ──────────────────────────────────────────────────────

const FRAME_COUNT = 16

function FrameScanner({ active }: { active: boolean }) {
  return (
    <div aria-hidden style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 6 }}>
      <div style={{
        fontSize: 9, fontWeight: 700, textTransform: 'uppercase',
        letterSpacing: '0.10em', color: 'var(--text-muted)', textAlign: 'center',
      }}>
        {active ? 'Render pipeline active' : 'Pipeline complete'}
      </div>
      <div style={{
        position: 'relative', display: 'flex', gap: 3,
        padding: '6px 8px', borderRadius: 8,
        background: 'var(--bg-input)', border: '1px solid var(--border-subtle)',
        overflow: 'hidden',
      }}>
        {Array.from({ length: FRAME_COUNT }).map((_, i) => (
          <div key={i} style={{
            flex: 1, aspectRatio: '9/6', borderRadius: 2,
            background: 'var(--border-default)', position: 'relative', overflow: 'hidden',
          }}>
            <div style={{
              position: 'absolute', top: '40%', left: 0, right: 0,
              height: 1, background: 'var(--border-strong)', opacity: 0.4,
            }} />
          </div>
        ))}
        {active && (
          <div style={{
            position: 'absolute', top: 0, bottom: 0, width: 28,
            background: 'linear-gradient(90deg, transparent 0%, var(--accent-primary) 40%, rgba(139,92,246,0.8) 60%, transparent 100%)',
            opacity: 0.35, borderRadius: 2,
            animation: 'scanSweep 2.2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
          }} />
        )}
      </div>
    </div>
  )
}

// ─── Animated dots ────────────────────────────────────────────────────────────

function StatusDots() {
  return (
    <span aria-hidden style={{ display: 'inline-flex', alignItems: 'center', gap: 3, marginLeft: 4, verticalAlign: 'middle' }}>
      {([0, 0.22, 0.44] as const).map((delay, i) => (
        <span key={i} style={{
          display: 'inline-block', width: 3, height: 3, borderRadius: '50%',
          background: 'var(--accent-primary)',
          animation: `dotFadePulse 1.5s ease-in-out ${delay}s infinite`,
        }} />
      ))}
    </span>
  )
}

// ─── Render spec chip ─────────────────────────────────────────────────────────

function SpecChip({ label }: { label: string }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center',
      padding: '2px 8px', borderRadius: 6,
      fontSize: 10, fontWeight: 600, fontFamily: 'monospace',
      background: 'var(--bg-input)', border: '1px solid var(--border-subtle)',
      color: 'var(--text-muted)',
    }}>
      {label}
    </span>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function ProgressOverlay({ jobId, onJobComplete, onCancelled, renderSpec }: ProgressOverlayProps) {
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
    try { await cancelJob(jobId) } catch { /* polling catches terminal state */ }
  }

  const progress   = jobStatus?.progress ?? 0
  const step       = cancelling ? 'Cancelling…' : (jobStatus?.current_step ?? (jobId ? 'Connecting…' : 'Starting…'))
  const elapsed    = jobStatus?.elapsed_seconds ?? 0
  const remaining  = jobStatus?.estimated_remaining_seconds ?? null
  const isTerminal = jobStatus?.status === 'completed' || jobStatus?.status === 'failed' || jobStatus?.status === 'cancelled'
  const isActive   = !isTerminal && !cancelling

  const etaLabel = (remaining !== null && (remaining > 0 || progress > 5))
    ? formatTime(remaining)
    : 'Calculating…'

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <>
      <style>{`
        @keyframes scanSweep {
          0%   { left: -32px; }
          100% { left: calc(100% + 4px); }
        }
        @keyframes dotFadePulse {
          0%, 100% { opacity: 0.2; transform: scale(0.7); }
          50%       { opacity: 1;   transform: scale(1.15); }
        }
        @keyframes progressFill {
          0%   { transform: translateX(-120%); }
          100% { transform: translateX(200%); }
        }
        @keyframes rpo-fadeIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes rpo-slideUp {
          from { opacity: 0; transform: translateY(14px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        /* 4-sided border travel animation */
        @keyframes borderTravel {
          0%   { background-position: 0% 0%; }
          100% { background-position: 200% 0%; }
        }
      `}</style>

      {/* ── Backdrop ───────────────────────────────────────────────────────── */}
      <div
        style={{
          position: 'fixed', inset: 0, zIndex: 50,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'rgba(0, 0, 0, 0.68)',
          backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)',
          animation: 'rpo-fadeIn 0.2s ease-out',
        }}
      >

        {/* ── Animated 4-sided border wrapper ─────────────────────────────── */}
        {/*
          Technique: a thin wrapper div with a conic-gradient background that
          rotates, creating a traveling light effect on all 4 sides. The inner
          card sits inside with a 2px gap acting as the border.
        */}
        <div
          style={{
            position: 'relative',
            padding: isActive ? 1.5 : 1,
            borderRadius: 22,
            background: isActive
              ? 'linear-gradient(90deg, var(--accent-primary), #8b5cf6, #ec4899, var(--accent-primary))'
              : 'var(--border-default)',
            backgroundSize: isActive ? '200% 100%' : '100% 100%',
            animation: isActive ? 'borderTravel 2.5s linear infinite' : 'none',
            boxShadow: isActive ? '0 0 18px rgba(79,70,229,0.20)' : 'none',
          }}
        >

          {/* ── Card ─────────────────────────────────────────────────────────── */}
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Generating Video"
            style={{
              width: 440,
              maxWidth: '94vw',
              background: 'var(--bg-card)',
              borderRadius: 20,
              boxShadow: '0 20px 60px rgba(0,0,0,0.40), 0 4px 16px rgba(0,0,0,0.20)',
              animation: 'rpo-slideUp 0.28s cubic-bezier(0.34,1.1,0.64,1)',
              overflow: 'hidden',
            }}
          >

            <div style={{ padding: '24px 28px 22px', display: 'flex', flexDirection: 'column', gap: 20 }}>

              {/* Zone 1 — Identity */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                <h3 style={{
                  margin: 0, fontSize: 17, fontWeight: 700,
                  letterSpacing: '-0.02em', color: 'var(--text-primary)',
                }}>
                  {cancelling ? 'Cancelling…' : 'Generating Video'}
                </h3>
                <div
                  aria-live="polite"
                  style={{
                    fontSize: 13, fontWeight: 500, color: 'var(--accent-primary)',
                    display: 'flex', alignItems: 'center', minHeight: 20,
                  }}
                >
                  {step}
                  {isActive && <StatusDots />}
                </div>
              </div>

              {/* Zone 2 — Render spec chips */}
              {renderSpec && (
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  <SpecChip label={renderSpec.resolution} />
                  <SpecChip label={PROFILE_FPS[renderSpec.renderProfile]} />
                  <SpecChip label={PROFILE_LABEL[renderSpec.renderProfile]} />
                </div>
              )}

              {/* Zone 3 — Frame scanner */}
              <FrameScanner active={isActive} />

              {/* Zone 4 — Progress */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                  <div style={{
                    fontSize: 24, fontWeight: 800, letterSpacing: '-0.04em',
                    color: 'var(--text-primary)', fontVariantNumeric: 'tabular-nums',
                    flexShrink: 0, minWidth: 52,
                  }}>
                    {progress}<span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginLeft: 1 }}>%</span>
                  </div>
                  <div style={{
                    flex: 1, height: 7, borderRadius: 99, overflow: 'hidden',
                    background: 'var(--bg-input)', border: '1px solid var(--border-subtle)',
                    position: 'relative',
                  }}>
                    <div style={{
                      position: 'absolute', top: 0, left: 0, bottom: 0,
                      width: `${progress}%`, borderRadius: 99,
                      background: 'linear-gradient(90deg, var(--accent-primary) 0%, #8b5cf6 100%)',
                      transition: 'width 0.5s cubic-bezier(0.4, 0, 0.2, 1)',
                      overflow: 'hidden',
                    }}>
                      {isActive && (
                        <div style={{
                          position: 'absolute', inset: 0,
                          background: 'linear-gradient(90deg, transparent 20%, rgba(255,255,255,0.28) 50%, transparent 80%)',
                          animation: 'progressFill 1.8s linear infinite',
                        }} />
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Zone 5 — Timing */}
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '10px 14px', borderRadius: 10,
                background: 'var(--bg-input)', border: '1px solid var(--border-subtle)',
              }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text-secondary)' }}>
                  <IconClock size={12} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                  <span style={{ color: 'var(--text-muted)' }}>Elapsed</span>
                  <strong style={{ fontVariantNumeric: 'tabular-nums', fontWeight: 700, color: 'var(--text-primary)' }}>
                    {formatTime(elapsed)}
                  </strong>
                </span>
                <div style={{ width: 1, height: 14, background: 'var(--border-default)' }} />
                <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text-secondary)' }}>
                  <IconClock size={12} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                  <span style={{ color: 'var(--text-muted)' }}>Remaining</span>
                  <strong style={{ fontVariantNumeric: 'tabular-nums', fontWeight: 700, color: 'var(--text-primary)' }}>
                    {etaLabel}
                  </strong>
                </span>
              </div>

              {/* Zone 6 — Footer */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: -4 }}>
                <p style={{ margin: 0, fontSize: 11, color: 'var(--text-muted)', textAlign: 'center', lineHeight: 1.5 }}>
                  Render time depends on resolution, effects, and your hardware.
                </p>

                {pollError && (
                  <div className="alert-error text-xs text-center animate-fade-in">
                    ⚠ Connection lost — retrying…
                  </div>
                )}

                {!isTerminal && !cancelling && (
                  <div style={{ display: 'flex', justifyContent: 'center' }}>
                    <button
                      id="cancel-generation-btn"
                      onClick={handleCancelClick}
                      aria-label="Cancel video generation"
                      style={{
                        display: 'inline-flex', alignItems: 'center', gap: 5,
                        padding: '6px 14px', borderRadius: 8,
                        fontSize: 12, fontWeight: 500, color: 'var(--text-muted)',
                        background: 'transparent', border: '1px solid transparent',
                        cursor: 'pointer', transition: 'color 0.15s, border-color 0.15s, background 0.15s',
                      }}
                      onMouseEnter={e => {
                        e.currentTarget.style.color = 'var(--color-error)'
                        e.currentTarget.style.borderColor = 'var(--color-error-border)'
                        e.currentTarget.style.background = 'var(--color-error-bg)'
                      }}
                      onMouseLeave={e => {
                        e.currentTarget.style.color = 'var(--text-muted)'
                        e.currentTarget.style.borderColor = 'transparent'
                        e.currentTarget.style.background = 'transparent'
                      }}
                    >
                      <IconXCircle size={13} />
                      Abort generation
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ── Cancel confirmation dialog ───────────────────────────────────── */}
        {showConfirm && (
          <div style={{
            position: 'fixed', inset: 0, zIndex: 60,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)',
            animation: 'rpo-fadeIn 0.15s ease-out',
          }}>
            <div style={{
              width: 320, maxWidth: '92vw',
              background: 'var(--bg-card)', border: '1px solid var(--border-default)',
              borderRadius: 16, padding: '24px 24px 20px',
              boxShadow: '0 16px 48px rgba(0,0,0,0.35)',
              animation: 'rpo-slideUp 0.2s ease-out',
              display: 'flex', flexDirection: 'column', gap: 16, textAlign: 'center',
            }}>
              <div style={{
                width: 44, height: 44, borderRadius: 12, margin: '0 auto',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: 'var(--color-warning-bg)', border: '1px solid var(--color-warning-border)', fontSize: 20,
              }}>⚠</div>
              <div>
                <h4 style={{ margin: '0 0 6px', fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>
                  Cancel generation?
                </h4>
                <p style={{ margin: 0, fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                  All current progress will be lost.
                </p>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  id="cancel-confirm-no-btn"
                  onClick={handleCancelDismiss}
                  className="btn-secondary"
                  style={{ flex: 1, padding: '10px 0' }}
                >
                  Keep going
                </button>
                <button
                  id="cancel-confirm-yes-btn"
                  onClick={handleCancelConfirm}
                  style={{
                    flex: 1, padding: '10px 0', borderRadius: 8,
                    fontWeight: 600, fontSize: 13, cursor: 'pointer', transition: 'opacity 0.15s',
                    background: 'var(--color-error-bg)', border: '1px solid var(--color-error-border)',
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
