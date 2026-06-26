// components/ProgressOverlay.tsx – Premium generation progress modal

import React, { useEffect, useState, useRef, useCallback } from 'react'
import { IconClock, IconXCircle, IconDownload, IconCheck, IconAlertTriangle, IconLoader } from './icons'
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
  onClose?:      () => void
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

// ─── Spec Chip ────────────────────────────────────────────────────────────────

function SpecChip({ label }: { label: string }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center',
      padding: '3px 9px', borderRadius: 8,
      fontSize: 10, fontWeight: 700, fontFamily: 'ui-monospace, monospace',
      background: 'var(--bg-elevated)', border: '1px solid var(--border-default)',
      color: 'var(--text-secondary)',
    }}>
      {label}
    </span>
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
          animation: `dotPulse 1.5s ease-in-out ${delay}s infinite`,
        }} />
      ))}
    </span>
  )
}

// ─── Frame Scanner ───────────────────────────────────────────────────────────

const FRAME_COUNT = 14

function FrameScanner({ active, status }: { active: boolean, status?: string }) {
  return (
    <div aria-hidden style={{ width: '100%' }}>
      <div style={{
        position: 'relative', display: 'flex', gap: 3,
        padding: '8px 10px', borderRadius: 12,
        background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)',
        overflow: 'hidden',
      }}>
        {Array.from({ length: FRAME_COUNT }).map((_, i) => (
          <div key={i} style={{
            flex: 1, aspectRatio: '9/6', borderRadius: 3,
            background: active
              ? `rgba(99,102,241,${0.04 + (i % 3) * 0.03})`
              : 'var(--border-subtle)',
            position: 'relative', overflow: 'hidden',
            transition: 'background 0.3s ease',
          }}>
            <div style={{
              position: 'absolute', top: '42%', left: 0, right: 0,
              height: 1, background: 'var(--border-default)', opacity: 0.5,
            }} />
          </div>
        ))}
        {active && (
          <div style={{
            position: 'absolute', top: 0, bottom: 0, width: 32,
            background: 'linear-gradient(90deg, transparent 0%, rgba(99,102,241,0.5) 40%, rgba(139,92,246,0.6) 60%, transparent 100%)',
            borderRadius: 2,
            animation: 'scanSweep 2.0s cubic-bezier(0.4, 0, 0.6, 1) infinite',
          }} />
        )}
        {status === 'completed' && (
          <div style={{
            position: 'absolute', inset: 0, borderRadius: 12,
            background: 'linear-gradient(90deg, rgba(16,185,129,0.08) 0%, rgba(16,185,129,0.03) 100%)',
            border: '1px solid var(--color-success-border)',
          }} />
        )}
        {status === 'failed' && (
          <div style={{
            position: 'absolute', inset: 0, borderRadius: 12,
            background: 'var(--color-error-bg)',
            border: '1px solid var(--color-error-border)',
          }} />
        )}
      </div>
    </div>
  )
}

// ─── Status Icon ─────────────────────────────────────────────────────────────

function StatusIcon({ status, cancelling }: { status?: string, cancelling: boolean }) {
  if (cancelling) return (
    <div style={{
      width: 48, height: 48, borderRadius: 14, flexShrink: 0,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'var(--color-warning-bg)', border: '1px solid var(--color-warning-border)',
    }}>
      <IconLoader size={22} style={{ color: 'var(--color-warning)' }} />
    </div>
  )
  if (status === 'completed') return (
    <div style={{
      width: 48, height: 48, borderRadius: 14, flexShrink: 0,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'var(--color-success-bg)', border: '1px solid var(--color-success-border)',
      animation: 'popIn 0.4s cubic-bezier(0.34,1.2,0.64,1)',
    }}>
      <IconCheck size={22} style={{ color: 'var(--color-success)' }} />
    </div>
  )
  if (status === 'failed') return (
    <div style={{
      width: 48, height: 48, borderRadius: 14, flexShrink: 0,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'var(--color-error-bg)', border: '1px solid var(--color-error-border)',
    }}>
      <IconAlertTriangle size={22} style={{ color: 'var(--color-error)' }} />
    </div>
  )
  // Running
  return (
    <div style={{
      width: 48, height: 48, borderRadius: 14, flexShrink: 0,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'var(--accent-subtle)', border: '1px solid var(--accent-border)',
    }}>
      <IconLoader size={22} style={{ color: 'var(--accent-primary)' }} />
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function ProgressOverlay({ jobId, onJobComplete, onCancelled, onClose, renderSpec }: ProgressOverlayProps) {
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
  const step       = cancelling ? 'Cancelling generation…' : (jobStatus?.current_step ?? (jobId ? 'Connecting to server…' : 'Starting…'))
  const elapsed    = jobStatus?.elapsed_seconds ?? 0
  const isTerminal = jobStatus?.status === 'completed' || jobStatus?.status === 'failed' || jobStatus?.status === 'cancelled'
  const isActive   = !isTerminal && !cancelling
  const isFailed   = jobStatus?.status === 'failed'
  const isComplete = jobStatus?.status === 'completed'

  const titleText = cancelling
    ? 'Cancelling…'
    : isFailed ? 'Generation Failed'
    : isComplete ? 'Export Complete'
    : 'Generating Video'

  const stepColor = isFailed
    ? 'var(--color-error)'
    : isComplete
    ? 'var(--color-success)'
    : 'var(--accent-primary)'

  const progressColor = isFailed
    ? 'linear-gradient(90deg, var(--color-error) 0%, #f87171 100%)'
    : isComplete
    ? 'linear-gradient(90deg, var(--color-success) 0%, #34d399 100%)'
    : 'linear-gradient(90deg, var(--accent-primary) 0%, #8b5cf6 60%, #06b6d4 100%)'

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <>
      <style>{`
        @keyframes scanSweep {
          0%   { left: -36px; }
          100% { left: calc(100% + 4px); }
        }
        @keyframes dotPulse {
          0%, 100% { opacity: 0.2; transform: scale(0.7); }
          50%       { opacity: 1;   transform: scale(1.15); }
        }
        @keyframes shimmerProg {
          0%   { transform: translateX(-120%); }
          100% { transform: translateX(200%); }
        }
        @keyframes rpo-fadeIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes rpo-slideUp {
          from { opacity: 0; transform: translateY(20px) scale(0.97); }
          to   { opacity: 1; transform: translateY(0)    scale(1); }
        }
        @keyframes borderTravel {
          0%   { background-position: 0% 0%; }
          100% { background-position: 200% 0%; }
        }
        @keyframes popIn {
          0%   { opacity: 0; transform: scale(0.7); }
          70%  { transform: scale(1.1); }
          100% { opacity: 1; transform: scale(1); }
        }
      `}</style>

      {/* ── Backdrop ─────────────────────────────────────────────────────── */}
      <div
        style={{
          position: 'fixed', inset: 0, zIndex: 50,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'rgba(0, 0, 0, 0.72)',
          backdropFilter: 'blur(14px)',
          WebkitBackdropFilter: 'blur(14px)',
          animation: 'rpo-fadeIn 0.22s ease-out',
          padding: '16px',
        }}
      >
        {/* ── Animated border wrapper ─────────────────────────────────────── */}
        <div
          style={{
            position: 'relative',
            padding: isActive ? 1.5 : 1,
            borderRadius: 24,
            background: isActive
              ? 'linear-gradient(90deg, #6366f1, #8b5cf6, #06b6d4, #6366f1)'
              : isFailed
              ? 'var(--color-error-border)'
              : isComplete
              ? 'var(--color-success-border)'
              : 'var(--border-default)',
            backgroundSize: isActive ? '200% 100%' : '100% 100%',
            animation: isActive ? 'borderTravel 2.8s linear infinite' : 'none',
            boxShadow: isActive
              ? '0 0 32px rgba(99,102,241,0.25), 0 8px 40px rgba(0,0,0,0.40)'
              : '0 8px 40px rgba(0,0,0,0.40)',
          }}
        >
          {/* ── Card ──────────────────────────────────────────────────────── */}
          <div
            role="dialog"
            aria-modal="true"
            aria-label={titleText}
            style={{
              width: 460,
              maxWidth: 'calc(100vw - 32px)',
              background: 'var(--bg-card)',
              borderRadius: 22,
              boxShadow: '0 24px 64px rgba(0,0,0,0.50), 0 4px 16px rgba(0,0,0,0.25)',
              animation: 'rpo-slideUp 0.30s cubic-bezier(0.34,1.1,0.64,1)',
              overflow: 'hidden',
            }}
          >
            {/* Top stripe */}
            <div style={{
              height: 3,
              background: isFailed
                ? 'var(--color-error)'
                : isComplete
                ? 'linear-gradient(90deg, var(--color-success), #34d399)'
                : 'linear-gradient(90deg, #6366f1, #8b5cf6, #06b6d4)',
              transition: 'background 0.5s ease',
            }} />

            <div style={{ padding: '24px 28px 24px', display: 'flex', flexDirection: 'column', gap: 18 }}>

              {/* Zone 1 — Identity row */}
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
                <StatusIcon status={jobStatus?.status} cancelling={cancelling} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <h3 style={{
                    margin: 0, fontSize: 17, fontWeight: 700,
                    letterSpacing: '-0.02em', color: 'var(--text-primary)',
                  }}>
                    {titleText}
                  </h3>
                  <div
                    aria-live="polite"
                    style={{
                      fontSize: 12, fontWeight: 500, color: stepColor,
                      display: 'flex', alignItems: 'center', marginTop: 3, minHeight: 18,
                    }}
                  >
                    {isFailed && jobStatus?.errors?.length
                      ? jobStatus.errors[0]
                      : isComplete
                      ? 'Your video is ready to download.'
                      : step}
                    {isActive && <StatusDots />}
                  </div>
                </div>
              </div>

              {/* Zone 2 — Spec chips */}
              {renderSpec && (
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  <SpecChip label={renderSpec.resolution} />
                  <SpecChip label={PROFILE_FPS[renderSpec.renderProfile]} />
                  <SpecChip label={PROFILE_LABEL[renderSpec.renderProfile]} />
                </div>
              )}

              {/* Zone 3 — Frame scanner */}
              <FrameScanner active={isActive} status={jobStatus?.status} />

              {/* Zone 4 — Progress */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                  <div style={{
                    fontSize: 28, fontWeight: 800, letterSpacing: '-0.04em',
                    color: 'var(--text-primary)', fontVariantNumeric: 'tabular-nums',
                    flexShrink: 0, minWidth: 58, lineHeight: 1,
                  }}>
                    {progress}<span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-muted)', marginLeft: 2 }}>%</span>
                  </div>
                  <div style={{
                    flex: 1, height: 8, borderRadius: 99, overflow: 'hidden',
                    background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)',
                    position: 'relative',
                  }}>
                    <div style={{
                      position: 'absolute', top: 0, left: 0, bottom: 0,
                      width: `${progress}%`, borderRadius: 99,
                      background: progressColor,
                      transition: 'width 0.6s cubic-bezier(0.4, 0, 0.2, 1), background 0.5s ease',
                      overflow: 'hidden',
                    }}>
                      {isActive && (
                        <div style={{
                          position: 'absolute', inset: 0,
                          background: 'linear-gradient(90deg, transparent 20%, rgba(255,255,255,0.30) 50%, transparent 80%)',
                          animation: 'shimmerProg 1.8s linear infinite',
                        }} />
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Zone 5 — Timing */}
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                padding: '10px 14px', borderRadius: 12,
                background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)',
              }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 12, color: 'var(--text-secondary)' }}>
                  <IconClock size={13} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                  <span style={{ color: 'var(--text-muted)' }}>Elapsed</span>
                  <strong style={{ fontVariantNumeric: 'tabular-nums', fontWeight: 700, color: 'var(--text-primary)', fontSize: 13 }}>
                    {formatTime(elapsed)}
                  </strong>
                  <span style={{ color: 'var(--border-default)', marginLeft: 4 }}>·</span>
                  <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>
                    Render time varies by resolution and hardware.
                  </span>
                </span>
              </div>

              {/* Zone 6 — Actions */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
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
                        display: 'inline-flex', alignItems: 'center', gap: 6,
                        padding: '7px 16px', borderRadius: 10,
                        fontSize: 12, fontWeight: 500, color: 'var(--text-muted)',
                        background: 'transparent', border: '1px solid transparent',
                        cursor: 'pointer', transition: 'all 0.15s',
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

                {isTerminal && onClose && (
                  <div style={{ display: 'flex', gap: 8, marginTop: 2 }}>
                    {isComplete && jobStatus?.output_video_url && (
                      <a
                        href={jobStatus.output_video_url}
                        download={jobStatus.output_filename ?? 'video.mp4'}
                        onClick={() => { setTimeout(onClose!, 100) }}
                        style={{
                          flex: 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 7,
                          padding: '10px 16px', borderRadius: 12, textDecoration: 'none',
                          fontSize: 13, fontWeight: 700, color: '#fff',
                          background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                          boxShadow: '0 4px 14px rgba(99,102,241,0.35)',
                          cursor: 'pointer', transition: 'all 0.15s',
                        }}
                        onMouseEnter={e => {
                          e.currentTarget.style.transform = 'translateY(-1px)'
                          e.currentTarget.style.boxShadow = '0 8px 20px rgba(99,102,241,0.45)'
                        }}
                        onMouseLeave={e => {
                          e.currentTarget.style.transform = 'translateY(0)'
                          e.currentTarget.style.boxShadow = '0 4px 14px rgba(99,102,241,0.35)'
                        }}
                      >
                        <IconDownload size={15} />
                        Download Video
                      </a>
                    )}
                    <button
                      onClick={onClose}
                      style={{
                        flex: isComplete && jobStatus?.output_video_url ? '0 0 auto' : 1,
                        display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                        padding: '10px 20px', borderRadius: 12,
                        fontSize: 13, fontWeight: 600,
                        color: isFailed ? 'var(--color-error)' : 'var(--text-primary)',
                        background: isFailed ? 'var(--color-error-bg)' : 'var(--bg-elevated)',
                        border: `1px solid ${isFailed ? 'var(--color-error-border)' : 'var(--border-strong)'}`,
                        cursor: 'pointer', transition: 'all 0.15s',
                      }}
                    >
                      {isFailed ? 'Close' : isComplete ? 'View Result' : 'Close'}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ── Cancel confirmation dialog ─────────────────────────────────── */}
        {showConfirm && (
          <div style={{
            position: 'fixed', inset: 0, zIndex: 60,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'rgba(0,0,0,0.60)', backdropFilter: 'blur(6px)',
            animation: 'rpo-fadeIn 0.15s ease-out',
          }}>
            <div style={{
              width: 320, maxWidth: '92vw',
              background: 'var(--bg-card)', border: '1px solid var(--border-default)',
              borderRadius: 18, padding: '28px 24px 22px',
              boxShadow: '0 20px 60px rgba(0,0,0,0.45)',
              animation: 'rpo-slideUp 0.2s ease-out',
              display: 'flex', flexDirection: 'column', gap: 16, textAlign: 'center',
            }}>
              <div style={{
                width: 48, height: 48, borderRadius: 14, margin: '0 auto',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: 'var(--color-warning-bg)', border: '1px solid var(--color-warning-border)',
                fontSize: 22,
              }}>⚠</div>
              <div>
                <h4 style={{ margin: '0 0 6px', fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>
                  Abort generation?
                </h4>
                <p style={{ margin: 0, fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                  All current progress will be lost and the job will stop.
                </p>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  id="cancel-confirm-no-btn"
                  onClick={handleCancelDismiss}
                  className="btn-secondary"
                  style={{ flex: 1, padding: '10px 0', borderRadius: 10 }}
                >
                  Keep going
                </button>
                <button
                  id="cancel-confirm-yes-btn"
                  onClick={handleCancelConfirm}
                  style={{
                    flex: 1, padding: '10px 0', borderRadius: 10,
                    fontWeight: 700, fontSize: 13, cursor: 'pointer', transition: 'all 0.15s',
                    background: 'var(--color-error-bg)', border: '1px solid var(--color-error-border)',
                    color: 'var(--color-error)',
                  }}
                >
                  Yes, abort
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  )
}
