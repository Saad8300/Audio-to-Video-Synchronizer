// components/VideoTimelinePage.tsx — Premium placeholder for the Video Timeline workflow

import React from 'react'
import {
  IconMusic,
  IconVideo,
  IconFileText,
  IconFilm,
  IconAlertTriangle,
} from './icons'

// ── Planned input card ────────────────────────────────────────────────────────

function PlannedInput({
  icon,
  label,
  description,
}: {
  icon: React.ReactNode
  label: string
  description: string
}) {
  return (
    <div
      className="flex items-start gap-3 p-4 rounded-xl"
      style={{
        background: 'var(--bg-input)',
        border: '1px dashed var(--border-default)',
      }}
    >
      <div
        className="w-9 h-9 rounded-lg shrink-0 flex items-center justify-center"
        style={{
          background: 'var(--accent-subtle)',
          border: '1px solid var(--accent-border)',
          color: 'var(--accent-primary)',
        }}
      >
        {icon}
      </div>
      <div>
        <p className="text-[12px] font-semibold" style={{ color: 'var(--text-primary)' }}>
          {label}
        </p>
        <p className="text-[11px] mt-0.5 leading-relaxed" style={{ color: 'var(--text-muted)' }}>
          {description}
        </p>
      </div>
    </div>
  )
}

// ── Info row ──────────────────────────────────────────────────────────────────

function InfoRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3">
      <span
        className="text-[10px] font-bold uppercase tracking-widest mt-0.5 shrink-0 w-28"
        style={{ color: 'var(--text-muted)' }}
      >
        {label}
      </span>
      <div className="flex-1 text-[12px] leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
        {children}
      </div>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export default function VideoTimelinePage() {
  return (
    <main className="max-w-7xl mx-auto w-full px-4 sm:px-6 py-8">
      <div className="max-w-3xl mx-auto space-y-6">

        {/* ── Page hero ── */}
        <div className="flex items-start gap-4">
          <div
            className="w-12 h-12 rounded-2xl shrink-0 flex items-center justify-center"
            style={{
              background: 'var(--accent-subtle)',
              border: '1px solid var(--accent-border)',
              color: 'var(--accent-primary)',
            }}
          >
            <IconFilm size={22} />
          </div>
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-xl font-bold" style={{ color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
                Video Timeline
              </h1>
              <span
                className="text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full"
                style={{
                  background: 'var(--accent-subtle)',
                  border: '1px solid var(--accent-border)',
                  color: 'var(--accent-primary)',
                }}
              >
                Coming in Batch 10B
              </span>
            </div>
            <p className="text-[13px] mt-1.5 leading-relaxed" style={{ color: 'var(--text-muted)' }}>
              Build long videos from reusable video clips, a main audio track, and a timeline CSV.
            </p>
          </div>
        </div>

        {/* ── Planned inputs ── */}
        <div
          className="rounded-2xl p-5 space-y-4"
          style={{ background: 'var(--bg-card)', border: '1px solid var(--border-default)' }}
        >
          <div className="flex items-center justify-between">
            <h2 className="text-[12px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
              Planned Inputs
            </h2>
            <span
              className="text-[9px] font-bold uppercase tracking-widest px-2 py-1 rounded"
              style={{
                background: 'var(--bg-input)',
                border: '1px solid var(--border-subtle)',
                color: 'var(--text-muted)',
              }}
            >
              Not yet active
            </span>
          </div>

          <div className="space-y-2.5">
            <PlannedInput
              icon={<IconMusic size={16} />}
              label="Main Audio"
              description="MP3, WAV, M4A — used as the final audio track. Clip audio will be muted."
            />
            <PlannedInput
              icon={<IconVideo size={16} />}
              label="Videos ZIP"
              description="ZIP archive containing video clips (e.g. 1.mp4, 2.mp4). Reference them by filename in the CSV."
            />
            <PlannedInput
              icon={<IconFileText size={16} />}
              label="Timeline CSV"
              description="Defines start/end timestamps and which clip to use for each segment."
            />
          </div>
        </div>

        {/* ── CSV format ── */}
        <div
          className="rounded-2xl p-5 space-y-4"
          style={{ background: 'var(--bg-card)', border: '1px solid var(--border-default)' }}
        >
          <h2 className="text-[12px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
            Planned CSV Format
          </h2>

          <div className="space-y-3">
            <InfoRow label="Columns">
              <code
                className="px-2 py-1 rounded text-[11px]"
                style={{ background: 'var(--bg-input)', border: '1px solid var(--border-subtle)', color: 'var(--accent-primary)' }}
              >
                start, end, video
              </code>
              <span className="ml-2 text-[11px]" style={{ color: 'var(--text-muted)' }}>
                (in seconds)
              </span>
            </InfoRow>

            <InfoRow label="Example">
              <pre
                className="text-[11px] rounded-lg p-3 leading-relaxed font-mono overflow-x-auto"
                style={{
                  background: 'var(--bg-input)',
                  border: '1px solid var(--border-subtle)',
                  color: 'var(--text-secondary)',
                }}
              >
{`start,end,video
0,5,1.mp4
5,10,2.mp4
10,15,3.mp4
15,20,1.mp4`}
              </pre>
            </InfoRow>

            <InfoRow label="Reuse Clips">
              Use the same filename multiple times in the CSV to reuse the same clip at different points in the video.
            </InfoRow>
          </div>
        </div>

        {/* ── Planned behavior ── */}
        <div
          className="rounded-2xl p-5 space-y-4"
          style={{ background: 'var(--bg-card)', border: '1px solid var(--border-default)' }}
        >
          <h2 className="text-[12px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
            Planned Behavior
          </h2>

          <div className="space-y-3">
            <InfoRow label="Longer Clip">
              If a clip is <strong>longer</strong> than the CSV segment duration, it will be <strong>trimmed</strong> to fit.
            </InfoRow>
            <InfoRow label="Shorter Clip">
              If a clip is <strong>shorter</strong> than the CSV segment duration, it will <strong>loop</strong> to fill the segment.
            </InfoRow>
            <InfoRow label="Clip Audio">
              Original clip audio will be <strong>muted by default</strong>. The uploaded main audio track is used throughout.
            </InfoRow>
            <InfoRow label="Export Settings">
              Existing export settings (resolution, aspect ratio, render profile, watermark, intro/outro) will be reused for Video Timeline exports.
            </InfoRow>
          </div>
        </div>

        {/* ── Disabled generate button ── */}
        <div
          className="rounded-2xl p-5"
          style={{ background: 'var(--bg-card)', border: '1px solid var(--border-default)' }}
        >
          <button
            disabled
            id="video-timeline-generate-btn"
            aria-label="Video Timeline generation coming next"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              width: '100%',
              padding: '13px 20px',
              borderRadius: 12,
              fontWeight: 700,
              fontSize: 14,
              color: 'var(--text-muted)',
              background: 'var(--bg-input)',
              border: '1px solid var(--border-default)',
              cursor: 'not-allowed',
              opacity: 0.6,
            }}
          >
            <IconAlertTriangle size={16} />
            Video Timeline generation coming next
          </button>
          <p className="text-center text-[10px] mt-2.5" style={{ color: 'var(--text-muted)' }}>
            This workflow will be enabled in Batch 10B. Switch to{' '}
            <strong style={{ color: 'var(--text-secondary)' }}>Image Timeline</strong> to generate videos now.
          </p>
        </div>

      </div>
    </main>
  )
}
