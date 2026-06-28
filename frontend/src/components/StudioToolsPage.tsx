import React, { useState } from 'react'
import {
  IconLayers,
  IconFilm,
  IconGrid,
  IconMusic,
  IconArrowRight
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

export type ViewMode = 'home' | 'image' | 'video' | 'media' | 'audio_merger' | 'script_timestamp'

interface Props {
  onSelectTool: (tool: ViewMode) => void
}

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
    desc: 'Create videos from images, audio, and timestamp CSV files.',
    color: 'rgba(14,165,233,0.12)', // Sky Blue
    accentColor: '#0ea5e9',
  },
  {
    id: 'video',
    icon: <IconFilm size={26} />,
    title: 'Video Timeline',
    desc: 'Build videos from reusable video clips, main audio, and timeline CSV files.',
    color: 'rgba(139,92,246,0.12)', // Violet
    accentColor: '#8b5cf6',
  },
  {
    id: 'media',
    icon: <IconGrid size={26} />,
    title: 'Media Timeline',
    desc: 'Mix images, videos, and text rows using one timeline CSV.',
    color: 'rgba(59,130,246,0.12)', // Blue
    accentColor: '#3b82f6',
  },
  {
    id: 'audio_merger',
    icon: <IconMusic size={26} />,
    title: 'Audio Merger',
    desc: 'Combine multiple audio files into one clean track.',
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

export default function StudioToolsPage({ onSelectTool }: Props) {
  return (
    <div className="w-full px-5 sm:px-8 py-8 space-y-8 animate-fade-in" style={{ maxWidth: 1280 }}>
      
      <header>
        <h1 className="text-2xl font-black mb-2" style={{ color: 'var(--text-primary)' }}>Tools</h1>
        <p className="text-sm font-medium" style={{ color: 'var(--text-muted)' }}>
          Select a tool below to open it.
        </p>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        {ACTIVE_TOOLS.map(tool => (
          <ActiveToolCard
            key={tool.id}
            tool={tool}
            onClick={() => onSelectTool(tool.id)}
          />
        ))}
      </div>
    </div>
  )
}

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
      {/* Icon */}
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
