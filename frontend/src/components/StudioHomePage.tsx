import React, { useState } from 'react'
import {
  IconLayers,
  IconFilm,
  IconGrid,
  IconType,
  IconMusic,
  IconFileText,
  IconVideo,
  IconSettings,
  IconSparkles,
  IconMonitor,
  IconZap,
  IconCheck,
} from './icons'

// ── Inline SVG icons not in library ────────────────────────────────────────

function IconMic({ size = 24, style }: { size?: number; style?: React.CSSProperties }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
         stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={style}>
      <path d="M12 2a3 3 0 0 1 3 3v7a3 3 0 0 1-6 0V5a3 3 0 0 1 3-3Z"/>
      <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
      <line x1="12" x2="12" y1="19" y2="22"/>
    </svg>
  )
}

function IconHistory({ size = 24, style }: { size?: number; style?: React.CSSProperties }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
         stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={style}>
      <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>
      <path d="M3 3v5h5"/>
      <path d="M12 7v5l4 2"/>
    </svg>
  )
}

function IconSliders({ size = 24, style }: { size?: number; style?: React.CSSProperties }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
         stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={style}>
      <line x1="4" x2="4" y1="21" y2="14"/>
      <line x1="4" x2="4" y1="10" y2="3"/>
      <line x1="12" x2="12" y1="21" y2="12"/>
      <line x1="12" x2="12" y1="8" y2="3"/>
      <line x1="20" x2="20" y1="21" y2="16"/>
      <line x1="20" x2="20" y1="12" y2="3"/>
      <line x1="1" x2="7" y1="14" y2="14"/>
      <line x1="9" x2="15" y1="8" y2="8"/>
      <line x1="17" x2="23" y1="16" y2="16"/>
    </svg>
  )
}

function IconArrowRight({ size = 16, style }: { size?: number; style?: React.CSSProperties }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
         stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" style={style}>
      <path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>
    </svg>
  )
}

function IconShield({ size = 16, style }: { size?: number; style?: React.CSSProperties }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
         stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={style}>
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
    </svg>
  )
}

function IconWifi({ size = 14, style }: { size?: number; style?: React.CSSProperties }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
         stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={style}>
      <path d="M5 12.55a11 11 0 0 1 14.08 0"/>
      <path d="M1.42 9a16 16 0 0 1 21.16 0"/>
      <path d="M8.53 16.11a6 6 0 0 1 6.95 0"/>
      <line x1="12" x2="12.01" y1="20" y2="20"/>
    </svg>
  )
}

// ─────────────────────────────────────────────────────────────────────────────

export type ViewMode = 'home' | 'image' | 'video' | 'media' | 'audio_merger' | 'script_timestamp'

interface Props {
  onSelectTool: (tool: ViewMode) => void
  healthOk?: boolean | null
}

// Active tool definitions
const ACTIVE_TOOLS: {
  id: ViewMode
  icon: React.ReactNode
  title: string
  desc: string
  color: string
  accentColor: string
}[] = [
  {
    id: 'image',
    icon: <IconLayers size={26} />,
    title: 'Image Timeline',
    desc: 'Create videos from images, main audio, and timestamp CSV files.',
    color: 'rgba(6,182,212,0.12)', // Cyan
    accentColor: '#06b6d4',
  },
  {
    id: 'video',
    icon: <IconFilm size={26} />,
    title: 'Video Timeline',
    desc: 'Create videos from reusable video clips and timeline CSV files.',
    color: 'rgba(139,92,246,0.12)', // Violet
    accentColor: '#8b5cf6',
  },
  {
    id: 'media',
    icon: <IconGrid size={26} />,
    title: 'Media Timeline',
    desc: 'Mix images, videos, and text-only rows in one flexible media timeline.',
    color: 'rgba(99,102,241,0.12)', // Indigo
    accentColor: '#6366f1',
  },
  {
    id: 'audio_merger',
    icon: <IconMusic size={26} />,
    title: 'Audio Merger',
    desc: 'Combine multiple audio files or audio parts ZIP into one clean track.',
    color: 'rgba(16,185,129,0.12)', // Emerald
    accentColor: '#10b981',
  },
  {
    id: 'script_timestamp',
    icon: <IconMic size={26} />,
    title: 'Script Timestamp',
    desc: 'Transcribe voice audio and generate timestamped scripts and CSV files.',
    color: 'rgba(245,158,11,0.12)', // Amber
    accentColor: '#f59e0b',
  },
]

// Coming soon tool definitions
const COMING_SOON_TOOLS: {
  icon: React.ReactNode
  title: string
  desc: string
}[] = [
  { icon: <IconType size={20} />,     title: 'Text to Speech',   desc: 'Generate narration audio from text scripts.' },
  { icon: <IconSliders size={20} />,  title: 'Audio Mixer',      desc: 'Mix voice audio with background music and export.' },
  { icon: <IconFileText size={20} />, title: 'CSV Helper',       desc: 'Validate, preview, and fix timeline CSV files.' },
  { icon: <IconVideo size={20} />,    title: 'Media Converter',  desc: 'Prepare images, videos, and audio for timeline generation.' },
  { icon: <IconHistory size={20} />,  title: 'Output History',   desc: 'View recent generated videos and open output files quickly.' },
  { icon: <IconSettings size={20} />, title: 'Settings',         desc: 'Manage app preferences, export defaults, and saved presets.' },
]



// ── Component ────────────────────────────────────────────────────────────────

export default function StudioHomePage({ onSelectTool, healthOk }: Props) {
  const [toast, setToast] = useState<string | null>(null)

  const showToast = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(null), 2200)
  }

  return (
    <div className="flex-1 w-full animate-fade-in" style={{ position: 'relative' }}>

      {/* Toast notification */}
      {toast && (
        <div
          style={{
            position: 'fixed', top: 72, left: '50%', transform: 'translateX(-50%)',
            background: 'var(--bg-elevated)', border: '1px solid var(--border-default)',
            borderRadius: 12, padding: '10px 20px', zIndex: 999,
            color: 'var(--text-primary)', fontSize: 13, fontWeight: 600,
            boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
            animation: 'fadeIn 0.2s ease',
          }}
        >
          🚧 {toast}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════
          HERO SECTION
      ═══════════════════════════════════════════════════════ */}
      <div
        className="relative overflow-hidden"
        style={{
          background: 'linear-gradient(160deg, rgba(99,102,241,0.08) 0%, rgba(139,92,246,0.05) 50%, transparent 100%)',
          borderBottom: '1px solid var(--border-subtle)',
        }}
      >
        {/* Background glow orbs */}
        <div style={{
          position: 'absolute', top: -80, left: -80, width: 320, height: 320,
          borderRadius: '50%', background: 'radial-gradient(circle, rgba(99,102,241,0.12), transparent 70%)',
          pointerEvents: 'none',
        }} />
        <div style={{
          position: 'absolute', top: -40, right: -60, width: 240, height: 240,
          borderRadius: '50%', background: 'radial-gradient(circle, rgba(139,92,246,0.10), transparent 70%)',
          pointerEvents: 'none',
        }} />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-14 sm:py-20 relative">
          {/* Brand pill */}
          <div className="flex justify-center mb-6">
            <div
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full"
              style={{ background: 'var(--accent-subtle)', border: '1px solid var(--accent-border)' }}
            >
              <IconSparkles size={13} style={{ color: 'var(--accent-primary)' }} />
              <span className="text-[11px] font-bold tracking-widest uppercase" style={{ color: 'var(--accent-primary)' }}>
                SyncFrame Studio
              </span>
            </div>
          </div>

          {/* Headline */}
          <div className="text-center space-y-4 max-w-3xl mx-auto">
            <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-gradient leading-tight">
              Create synchronized<br />videos faster
            </h1>
            <p className="text-base sm:text-lg leading-relaxed mx-auto max-w-2xl" style={{ color: 'var(--text-secondary)' }}>
              A local video automation studio for building videos from audio, images, video clips, media timelines, and CSV timing files.
            </p>


            {/* Status badges */}
            <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
              {[
                { icon: <IconShield size={12} />, label: 'Runs locally' },
                { icon: <IconShield size={12} />, label: 'No cloud upload' },
                { icon: <IconZap size={12} />, label: '4K export ready' },
              ].map(b => (
                <span
                  key={b.label}
                  className="inline-flex items-center gap-1.5 text-[11px] font-medium px-2.5 py-1 rounded-full"
                  style={{ background: 'var(--bg-elevated)', color: 'var(--text-muted)', border: '1px solid var(--border-subtle)' }}
                >
                  {b.icon} {b.label}
                </span>
              ))}
              <span
                className="inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full"
                style={{
                  background: healthOk ? 'rgba(34,197,94,0.12)' : healthOk === false ? 'rgba(239,68,68,0.10)' : 'var(--bg-elevated)',
                  color: healthOk ? '#22c55e' : healthOk === false ? '#ef4444' : 'var(--text-muted)',
                  border: `1px solid ${healthOk ? 'rgba(34,197,94,0.30)' : healthOk === false ? 'rgba(239,68,68,0.25)' : 'var(--border-subtle)'}`,
                }}
              >
                <span
                  style={{
                    width: 7, height: 7, borderRadius: '50%',
                    background: healthOk ? '#22c55e' : healthOk === false ? '#ef4444' : 'var(--text-muted)',
                    display: 'inline-block',
                    animation: healthOk ? 'ping 1.5s cubic-bezier(0,0,0.2,1) infinite' : undefined,
                  }}
                />
                {healthOk === null || healthOk === undefined ? 'Connecting…' : healthOk ? 'Backend live' : 'Backend offline'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════
          ACTIVE TOOLS GRID
      ═══════════════════════════════════════════════════════ */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10 space-y-10">

        <section>
          <div className="flex items-center gap-2.5 mb-6">
            <div
              className="w-7 h-7 rounded-lg flex items-center justify-center"
              style={{ background: 'var(--accent-subtle)', border: '1px solid var(--accent-border)' }}
            >
              <IconMonitor size={15} style={{ color: 'var(--accent-primary)' }} />
            </div>
            <h2 className="text-base font-bold" style={{ color: 'var(--text-primary)' }}>Active Tools</h2>
            <div className="flex-1 h-px" style={{ background: 'var(--border-subtle)' }} />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
            {ACTIVE_TOOLS.map(tool => (
              <ActiveToolCard
                key={tool.id}
                tool={tool}
                onClick={() => onSelectTool(tool.id)}
              />
            ))}
          </div>
        </section>



        {/* ═══════════════════════════════════════════════════════
            COMING SOON TOOLS
        ═══════════════════════════════════════════════════════ */}
        <section>
          <div className="flex items-center gap-2.5 mb-6">
            <div
              className="w-7 h-7 rounded-lg flex items-center justify-center"
              style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)' }}
            >
              <IconSparkles size={15} style={{ color: 'var(--text-muted)' }} />
            </div>
            <h2 className="text-base font-bold" style={{ color: 'var(--text-secondary)' }}>Coming Soon</h2>
            <div className="flex-1 h-px" style={{ background: 'var(--border-subtle)' }} />
            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full" style={{ background: 'var(--bg-elevated)', color: 'var(--text-muted)', border: '1px solid var(--border-subtle)' }}>
              In Development
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {COMING_SOON_TOOLS.map(tool => (
              <button
                key={tool.title}
                onClick={() => showToast(`${tool.title} — Coming soon`)}
                className="card p-4 flex flex-col items-center text-center gap-2.5 transition-all duration-200 hover:scale-[1.02] group"
                style={{ opacity: 0.65, cursor: 'pointer', outline: 'none' }}
              >
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center transition-all group-hover:opacity-100"
                  style={{ background: 'var(--bg-input)', border: '1px solid var(--border-subtle)' }}
                >
                  <div style={{ color: 'var(--text-muted)' }}>{tool.icon}</div>
                </div>
                <div>
                  <p className="text-xs font-bold leading-snug" style={{ color: 'var(--text-primary)' }}>{tool.title}</p>
                  <p className="text-[10px] mt-1 leading-snug" style={{ color: 'var(--text-muted)' }}>{tool.desc}</p>
                </div>
                <span
                  className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full"
                  style={{ background: 'var(--bg-elevated)', color: 'var(--text-secondary)', border: '1px solid var(--border-subtle)' }}
                >
                  Coming Soon
                </span>
              </button>
            ))}
          </div>
        </section>



      </div>
    </div>
  )
}

// ── Active Tool Card ──────────────────────────────────────────────────────────

function ActiveToolCard({
  tool,
  onClick,
}: {
  tool: typeof ACTIVE_TOOLS[number]
  onClick: () => void
}) {
  const [hovered, setHovered] = useState(false)

  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="group flex flex-col gap-4 text-left rounded-2xl p-5 transition-all duration-250"
      style={{
        cursor: 'pointer',
        outline: 'none',
        background: hovered
          ? `linear-gradient(145deg, ${tool.color}, rgba(0,0,0,0))`
          : 'var(--bg-card)',
        border: hovered
          ? `1px solid ${tool.accentColor}40`
          : '1px solid var(--border-subtle)',
        boxShadow: hovered
          ? `0 8px 32px ${tool.accentColor}22, 0 2px 8px rgba(0,0,0,0.2)`
          : '0 1px 3px rgba(0,0,0,0.15)',
        transform: hovered ? 'translateY(-3px)' : 'translateY(0)',
      }}
    >
      {/* Icon + status */}
      <div className="flex items-start justify-between w-full">
        <div
          className="w-11 h-11 rounded-xl flex items-center justify-center transition-transform duration-200"
          style={{
            background: `${tool.accentColor}18`,
            border: `1px solid ${tool.accentColor}35`,
            color: tool.accentColor,
            transform: hovered ? 'scale(1.08)' : 'scale(1)',
          }}
        >
          {tool.icon}
        </div>
      </div>

      {/* Text */}
      <div className="flex-1 space-y-1.5">
        <h3 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
          {tool.title}
        </h3>
        <p className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
          {tool.desc}
        </p>
      </div>

      {/* Open CTA */}
      <div
        className="flex items-center gap-1.5 text-xs font-semibold transition-all duration-200"
        style={{ color: hovered ? tool.accentColor : 'var(--text-muted)' }}
      >
        Open tool <IconArrowRight size={13} />
      </div>
    </button>
  )
}
