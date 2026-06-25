// components/ResultsPanel.tsx – Premium export results panel

import React, { useState } from 'react'
import {
  IconDownload,
  IconCheck,
  IconAlertTriangle,
  IconX,
  IconVideo,
} from './icons'
import type { GenerateResponse, TimelineRow, GenerateSettings } from '../types'

interface ResultsPanelProps {
  result:   GenerateResponse
  settings: GenerateSettings
}

function StatusBadge({ status }: { status: TimelineRow['status'] }) {
  if (status === 'ok')      return <span className="badge-ok">✓ OK</span>
  if (status === 'missing') return <span className="badge-missing">⚠ Missing</span>
  return <span className="badge-error">✗ Error</span>
}

function MessageList({ items, type }: { items: string[]; type: 'warning' | 'error' }) {
  if (!items.length) return null
  const isWarn = type === 'warning'
  return (
    <div
      className="rounded-lg p-3.5 space-y-2"
      style={{
        background: isWarn ? 'var(--color-warning-bg)' : 'var(--color-error-bg)',
        border: `1px solid ${isWarn ? 'var(--color-warning-border)' : 'var(--color-error-border)'}`,
      }}
    >
      <div className="flex items-center gap-2 text-xs font-semibold" style={{ color: isWarn ? 'var(--color-warning)' : 'var(--color-error)' }}>
        {isWarn ? <IconAlertTriangle size={13} /> : <IconX size={13} />}
        {items.length} {isWarn ? 'Warning' : 'Error'}{items.length > 1 ? 's' : ''}
      </div>
      <ul className="space-y-1">
        {items.map((msg, i) => (
          <li key={i} className="text-xs flex items-start gap-1.5" style={{ color: isWarn ? 'var(--color-warning)' : 'var(--color-error)', opacity: 0.85 }}>
            <span className="shrink-0 mt-0.5">·</span>
            <span>{msg}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

export default function ResultsPanel({ result, settings }: ResultsPanelProps) {
  const [timelineOpen, setTimelineOpen] = useState(false)

  const videoUrl      = result.output_video_url
  const hasVideo      = result.success && videoUrl
  const totalItems    = result.timeline_report.length
  const totalWarns    = result.warnings.length
  const lastItem      = result.timeline_report[result.timeline_report.length - 1]
  const totalDuration = lastItem ? lastItem.end : '0:00'
  const hasIssues     = result.timeline_report.some(r => r.status !== 'ok')
  const filename      = result.output_filename ?? 'video.mp4'

  return (
    <div className="space-y-4 animate-slide-up">

      {/* ── Success / fail banner ── */}
      {result.success ? (
        <div
          style={{
            borderRadius: 16,
            background: 'var(--bg-card)',
            border: '1px solid var(--border-default)',
            overflow: 'hidden',
          }}
        >
          {/* Green top stripe */}
          <div style={{ height: 3, background: 'var(--color-success)' }} />

          <div style={{ padding: '20px 24px', display: 'flex', alignItems: 'flex-start', gap: 16 }}>
            {/* Check icon */}
            <div style={{
              width: 44, height: 44, borderRadius: 12, flexShrink: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: 'var(--color-success-bg)',
              border: '1px solid var(--color-success-border)',
            }}>
              <IconCheck size={20} style={{ color: 'var(--color-success)' }} />
            </div>

            <div style={{ flex: 1, minWidth: 0 }}>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.01em', margin: 0 }}>
                Export Complete
              </h3>
              <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 3 }}>
                Your video is ready to preview and download.
                {result.elapsed_seconds != null && (
                  <span style={{ marginLeft: 6 }}>
                    Completed in <strong style={{ color: 'var(--text-secondary)' }}>{result.elapsed_seconds}s</strong>.
                  </span>
                )}
              </p>

              {/* Metadata chips */}
              <div style={{ display: 'flex', gap: 6, marginTop: 10, flexWrap: 'wrap' }}>
                {[settings.exportResolution, settings.aspectRatio, settings.renderProfile.replace('_', ' ')].map(chip => (
                  <span
                    key={chip}
                    style={{
                      fontSize: 10, fontFamily: 'monospace', fontWeight: 600,
                      padding: '2px 8px', borderRadius: 6,
                      background: 'var(--accent-subtle)',
                      border: '1px solid var(--accent-border)',
                      color: 'var(--accent-primary)',
                    }}
                  >
                    {chip}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div
          className="rounded-xl p-4 flex items-center gap-3"
          style={{
            background: 'var(--color-error-bg)',
            border: '1px solid var(--color-error-border)',
          }}
        >
          <div
            className="w-9 h-9 rounded-lg shrink-0 flex items-center justify-center"
            style={{ background: 'var(--color-error-bg)', border: '1px solid var(--color-error-border)', color: 'var(--color-error)' }}
          >
            <IconX size={16} />
          </div>
          <div>
            <p className="text-sm font-semibold" style={{ color: 'var(--color-error)' }}>Generation Failed</p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>See error details below.</p>
          </div>
        </div>
      )}

      {/* Messages */}
      {result.errors.length   > 0 && <MessageList items={result.errors}   type="error"   />}
      {result.warnings.length > 0 && <MessageList items={result.warnings} type="warning" />}

      {/* Video preview + download */}
      {hasVideo && (
        <div
          style={{
            borderRadius: 16,
            background: 'var(--bg-card)',
            border: '1px solid var(--border-default)',
            overflow: 'hidden',
          }}
        >
          {/* Video */}
          <div style={{ background: '#000', aspectRatio: '16/9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <video
              src={videoUrl!}
              controls
              style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }}
              aria-label="Generated video preview"
            />
          </div>

          {/* Download row */}
          <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 10 }}>
            {/* Filename chip */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', flexShrink: 0 }}>
                File
              </span>
              <span
                style={{
                  fontSize: 11, color: 'var(--text-secondary)', fontFamily: 'monospace',
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  minWidth: 0, flex: 1,
                }}
                title={filename}
              >
                {filename}
              </span>
            </div>

            {/* Download button */}
            <a
              href={videoUrl!}
              download={filename}
              id="download-video-btn"
              aria-label="Download MP4"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                padding: '12px 20px',
                borderRadius: 10,
                fontWeight: 700,
                fontSize: 14,
                color: '#fff',
                background: 'var(--accent-primary)',
                textDecoration: 'none',
                transition: 'transform 0.18s ease, box-shadow 0.18s ease, background 0.15s',
                boxShadow: '0 4px 16px rgba(79,70,229,0.30)',
                position: 'relative',
                overflow: 'hidden',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.transform = 'translateY(-2px)'
                e.currentTarget.style.boxShadow = '0 8px 24px rgba(79,70,229,0.45)'
                e.currentTarget.style.background = 'var(--accent-hover)'
              }}
              onMouseLeave={e => {
                e.currentTarget.style.transform = 'translateY(0)'
                e.currentTarget.style.boxShadow = '0 4px 16px rgba(79,70,229,0.30)'
                e.currentTarget.style.background = 'var(--accent-primary)'
              }}
            >
              <IconDownload size={16} />
              Download MP4
            </a>
          </div>
        </div>
      )}

      {/* Timeline report */}
      {result.timeline_report.length > 0 && (
        <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--border-subtle)', background: 'var(--bg-card)' }}>
          <button
            onClick={() => setTimelineOpen(v => !v)}
            className="w-full flex items-center justify-between gap-4 px-4 py-3 text-left transition-colors"
            style={{ background: timelineOpen ? 'var(--accent-subtle)' : 'transparent' }}
            aria-expanded={timelineOpen}
          >
            <div className="flex items-center gap-2.5">
              <IconVideo size={14} style={{ color: 'var(--text-muted)' }} />
              <div>
                <span className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>Timeline Report</span>
                <div className="flex items-center gap-1.5 mt-0.5 text-[10px]" style={{ color: 'var(--text-muted)' }}>
                  <span style={{ color: 'var(--accent-primary)', fontWeight: 600 }}>{totalItems} clips</span>
                  <span>·</span>
                  <span>{totalDuration}</span>
                  <span>·</span>
                  {hasIssues
                    ? <span style={{ color: 'var(--color-error)' }}>Issues found</span>
                    : totalWarns > 0
                    ? <span style={{ color: 'var(--color-warning)' }}>{totalWarns} warnings</span>
                    : <span style={{ color: 'var(--color-success)' }}>All clips OK</span>
                  }
                </div>
              </div>
            </div>
            <span
              className="text-[10px] font-bold transition-transform duration-200 shrink-0"
              style={{ color: 'var(--text-muted)', transform: timelineOpen ? 'rotate(180deg)' : 'none' }}
            >
              ▾
            </span>
          </button>

          {timelineOpen && (
            <div className="px-4 pb-4" style={{ borderTop: '1px solid var(--border-subtle)' }}>
              <div className="overflow-x-auto rounded-lg mt-3" style={{ border: '1px solid var(--border-subtle)' }}>
                <table className="w-full text-xs">
                  <thead>
                    <tr style={{ background: 'var(--bg-input)', borderBottom: '1px solid var(--border-subtle)' }}>
                      {['Image', 'Start', 'End', 'Duration', 'Text', 'Status'].map(h => (
                        <th key={h} className="px-3 py-2.5 text-left font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)', fontSize: '9px' }}>
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {result.timeline_report.slice(0, 100).map((row, i) => (
                      <tr
                        key={i}
                        style={{
                          borderBottom: '1px solid var(--border-subtle)',
                          background: row.status !== 'ok' ? 'var(--color-error-bg)' : 'transparent',
                        }}
                      >
                        <td className="px-3 py-2 font-mono" style={{ color: 'var(--text-secondary)' }}>{row.image}</td>
                        <td className="px-3 py-2 font-mono" style={{ color: 'var(--text-muted)' }}>{row.start}</td>
                        <td className="px-3 py-2 font-mono" style={{ color: 'var(--text-muted)' }}>{row.end}</td>
                        <td className="px-3 py-2 font-mono" style={{ color: 'var(--text-muted)' }}>{row.duration}</td>
                        <td className="px-3 py-2 max-w-[160px] truncate" style={{ color: 'var(--text-muted)' }}>
                          {row.text || <span style={{ opacity: 0.4, fontStyle: 'italic' }}>—</span>}
                        </td>
                        <td className="px-3 py-2">
                          <StatusBadge status={row.status} />
                        </td>
                      </tr>
                    ))}
                    {result.timeline_report.length > 100 && (
                      <tr style={{ background: 'var(--bg-input)' }}>
                        <td colSpan={6} className="px-3 py-3 text-center text-[10px] italic" style={{ color: 'var(--text-muted)' }}>
                          + {result.timeline_report.length - 100} more items hidden for performance.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
