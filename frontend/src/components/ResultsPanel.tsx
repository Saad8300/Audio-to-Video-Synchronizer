// components/ResultsPanel.tsx – Shows the generated video, timeline, warnings, and errors

import React, { useState } from 'react'
import {
  IconVideo,
  IconDownload,
  IconCheck,
  IconAlertTriangle,
  IconX,
  IconPlayCircle,
} from './icons'
import type { GenerateResponse, TimelineRow, GenerateSettings } from '../types'

interface ResultsPanelProps {
  result: GenerateResponse
  settings: GenerateSettings
}

function StatusBadge({ status }: { status: TimelineRow['status'] }) {
  if (status === 'ok')
    return <span className="badge-ok">✓ OK</span>
  if (status === 'missing')
    return <span className="badge-missing">⚠ Missing</span>
  return <span className="badge-error">✗ Error</span>
}

function MessageList({
  items,
  type,
}: {
  items: string[]
  type: 'warning' | 'error'
}) {
  if (!items.length) return null

  const isWarning = type === 'warning'

  return (
    <div
      className={`rounded-xl border p-4 space-y-2 ${
        isWarning
          ? 'bg-amber-500/5 border-amber-500/20'
          : 'bg-red-500/5 border-red-500/20'
      }`}
    >
      <div className={`flex items-center gap-2 text-xs font-semibold ${isWarning ? 'text-amber-400' : 'text-red-400'}`}>
        {isWarning ? <IconAlertTriangle size={14} /> : <IconX size={14} />}
        {isWarning ? `${items.length} Warning${items.length > 1 ? 's' : ''}` : `${items.length} Error${items.length > 1 ? 's' : ''}`}
      </div>
      <ul className="space-y-1">
        {items.map((msg, i) => (
          <li key={i} className={`text-xs flex items-start gap-1.5 ${isWarning ? 'text-amber-200/80' : 'text-red-200/80'}`}>
            <span className="mt-0.5 shrink-0">·</span>
            <span>{msg}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

export default function ResultsPanel({ result, settings }: ResultsPanelProps) {
  const [timelineExpanded, setTimelineExpanded] = useState(false)

  const videoUrl = result.output_video_url
  const hasVideo = result.success && videoUrl

  // Compute timeline stats
  const totalItems = result.timeline_report.length
  const totalWarnings = result.warnings.length
  const lastItem = result.timeline_report[result.timeline_report.length - 1]
  const totalDuration = lastItem ? lastItem.end : '00:00'
  const hasErrors = result.timeline_report.some(r => r.status !== 'ok')

  return (
    <div className="card-glow p-6 space-y-6 animate-slide-up">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div
          className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
            result.success
              ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400'
              : 'bg-red-500/10 border border-red-500/20 text-red-400'
          }`}
        >
          {result.success ? <IconCheck size={18} /> : <IconX size={18} />}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center flex-wrap gap-2.5">
            <h2 className="text-base font-semibold text-primary">
              {result.success ? 'Video Generated Successfully' : 'Generation Failed'}
            </h2>
            {result.success && (
              <div className="flex gap-1.5">
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-white/5 text-muted border border-white/10">
                  {settings.exportResolution}
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-white/5 text-muted border border-white/10">
                  {settings.aspectRatio}
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-white/5 text-muted border border-white/10 hidden sm:inline-block">
                  {settings.renderProfile.replace('_', ' ')}
                </span>
              </div>
            )}
          </div>
          <p className="text-xs text-muted mt-0.5">
            {result.elapsed_seconds != null
              ? `Completed in ${result.elapsed_seconds}s`
              : result.success
              ? 'Your video is ready'
              : 'See errors below'}
          </p>
        </div>
      </div>

      <div className="h-px" style={{ backgroundColor: 'var(--color-surface-card-border)' }} />

      {/* Warnings & errors */}
      {result.errors.length > 0 && (
        <MessageList items={result.errors} type="error" />
      )}
      {result.warnings.length > 0 && (
        <MessageList items={result.warnings} type="warning" />
      )}

      {/* Video preview + download */}
      {hasVideo && (
        <div className="space-y-4">
          <div className="rounded-xl overflow-hidden bg-black border border-slate-700/50 relative group">
            <video
              src={videoUrl!}
              controls
              className="w-full max-h-[480px] object-contain"
              aria-label="Generated video preview"
            />
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-0 group-hover:opacity-0">
              <div className="w-16 h-16 rounded-full bg-black/50 flex items-center justify-center text-white">
                <IconPlayCircle size={36} />
              </div>
            </div>
          </div>

          <a
            href={videoUrl!}
            download={result.output_filename ?? 'video.mp4'}
            className="btn-primary w-full"
            aria-label={`Download ${result.output_filename ?? 'video.mp4'}`}
          >
            <IconDownload size={18} />
            Download MP4 — {result.output_filename ?? 'video.mp4'}
          </a>
        </div>
      )}

      {/* Timeline report */}
      {result.timeline_report.length > 0 && (
        <div className="card-glow overflow-hidden">
          {/* Collapsible header */}
          <button
            onClick={() => setTimelineExpanded(!timelineExpanded)}
            className="w-full flex items-center justify-between gap-4 p-5 text-left transition-colors"
            style={{ backgroundColor: timelineExpanded ? 'rgba(99,102,241,0.04)' : 'transparent' }}
            aria-expanded={timelineExpanded}
          >
            <div>
              <h3 className="text-sm font-semibold text-primary">Timeline Report</h3>
              <div className="flex items-center gap-2 mt-1 text-xs text-muted flex-wrap">
                <span className="font-semibold text-brand-400">{totalItems} items</span>
                <span>•</span>
                <span>{totalDuration} duration</span>
                <span>•</span>
                {hasErrors ? (
                  <span className="text-red-400">Issues found</span>
                ) : totalWarnings > 0 ? (
                  <span className="text-amber-400">{totalWarnings} warnings</span>
                ) : (
                  <span className="text-emerald-400">All clips OK</span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-brand-300 bg-brand-500/10 px-2 py-1 rounded-md">
                {timelineExpanded ? 'Hide Details' : 'Show Details'}
              </span>
              <span className={`text-muted transition-transform duration-200 text-sm shrink-0 ${timelineExpanded ? 'rotate-180' : ''}`}>
                ▼
              </span>
            </div>
          </button>

          {/* Expanded content */}
          {timelineExpanded && (
            <div className="px-5 pb-5">
              <div className="overflow-x-auto rounded-xl border" style={{ borderColor: 'var(--color-surface-card-border)' }}>
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b" style={{ backgroundColor: 'var(--color-surface-input)', borderColor: 'var(--color-surface-card-border)' }}>
                      {['Image', 'Start', 'End', 'Duration', 'Text', 'Status'].map((h) => (
                        <th
                          key={h}
                          className="px-4 py-3 text-left font-semibold text-muted uppercase tracking-wider"
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {result.timeline_report.map((row, i) => (
                      <tr
                        key={i}
                        className={`transition-colors border-b ${
                          row.status !== 'ok' ? 'bg-red-900/10' : ''
                        }`}
                        style={{ borderColor: 'var(--color-surface-card-border)' }}
                      >
                        <td className="px-4 py-2.5 font-mono text-secondary">{row.image}</td>
                        <td className="px-4 py-2.5 font-mono text-muted">{row.start}</td>
                        <td className="px-4 py-2.5 font-mono text-muted">{row.end}</td>
                        <td className="px-4 py-2.5 font-mono text-muted">{row.duration}</td>
                        <td className="px-4 py-2.5 text-muted max-w-[200px] truncate">
                          {row.text || <span className="opacity-40 italic">—</span>}
                        </td>
                        <td className="px-4 py-2.5">
                          <StatusBadge status={row.status} />
                        </td>
                      </tr>
                    ))}
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
