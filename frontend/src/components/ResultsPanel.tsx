// components/ResultsPanel.tsx – Export results and video preview

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

  const videoUrl     = result.output_video_url
  const hasVideo     = result.success && videoUrl
  const totalItems   = result.timeline_report.length
  const totalWarns   = result.warnings.length
  const lastItem     = result.timeline_report[result.timeline_report.length - 1]
  const totalDuration = lastItem ? lastItem.end : '0:00'
  const hasIssues    = result.timeline_report.some(r => r.status !== 'ok')

  return (
    <div className="space-y-4 animate-slide-up">

      {/* Status header */}
      <div
        className="flex items-center gap-3 px-4 py-3 rounded-xl"
        style={{
          background: result.success ? 'var(--color-success-bg)' : 'var(--color-error-bg)',
          border: `1px solid ${result.success ? 'var(--color-success-border)' : 'var(--color-error-border)'}`,
        }}
      >
        <div
          className="w-8 h-8 rounded-lg shrink-0 flex items-center justify-center"
          style={{
            background: result.success ? 'var(--color-success-bg)' : 'var(--color-error-bg)',
            border: `1px solid ${result.success ? 'var(--color-success-border)' : 'var(--color-error-border)'}`,
            color: result.success ? 'var(--color-success)' : 'var(--color-error)',
          }}
        >
          {result.success ? <IconCheck size={16} /> : <IconX size={16} />}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold" style={{ color: result.success ? 'var(--color-success)' : 'var(--color-error)' }}>
            {result.success ? 'Video generated successfully' : 'Generation failed'}
          </p>
          <p className="text-[11px] mt-0.5" style={{ color: 'var(--text-muted)' }}>
            {result.elapsed_seconds != null
              ? `Completed in ${result.elapsed_seconds}s`
              : result.success ? 'Your video is ready' : 'See errors below'}
          </p>
        </div>
        {result.success && (
          <div className="flex items-center gap-1.5 flex-wrap">
            {[settings.exportResolution, settings.aspectRatio].map(chip => (
              <span
                key={chip}
                className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded"
                style={{ background: 'var(--accent-subtle)', border: '1px solid var(--accent-border)', color: 'var(--accent-primary)' }}
              >
                {chip}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Messages */}
      {result.errors.length > 0 && <MessageList items={result.errors} type="error" />}
      {result.warnings.length > 0 && <MessageList items={result.warnings} type="warning" />}

      {/* Video preview + download */}
      {hasVideo && (
        <div className="space-y-3">
          <div className="rounded-xl overflow-hidden bg-black aspect-video flex items-center justify-center" style={{ border: '1px solid var(--border-default)' }}>
            <video
              src={videoUrl!}
              controls
              className="w-full h-full object-contain"
              aria-label="Generated video preview"
            />
          </div>
          <a
            href={videoUrl!}
            download={result.output_filename ?? 'video.mp4'}
            className="btn-primary w-full py-3"
            aria-label={`Download ${result.output_filename ?? 'video.mp4'}`}
          >
            <IconDownload size={16} />
            Download — {result.output_filename ?? 'video.mp4'}
          </a>
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
