// components/AppModeSwitcher.tsx — Top-level mode switcher for Image / Video Timeline

import React from 'react'
import { IconLayers, IconFilm } from './icons'

export type AppMode = 'image' | 'video'

interface ModeDef {
  id: AppMode
  label: string
  subtitle: string
  icon: React.ReactNode
  badge?: string
}

const MODES: ModeDef[] = [
  {
    id: 'image',
    label: 'Image Timeline',
    subtitle: 'Create videos from images, audio, and timestamp CSV.',
    icon: <IconLayers size={15} />,
  },
  {
    id: 'video',
    label: 'Video Timeline',
    subtitle: 'Create videos from reusable video clips, audio, and timeline CSV.',
    icon: <IconFilm size={15} />,
    badge: 'Coming Soon',
  },
]

interface Props {
  activeMode: AppMode
  onChange: (mode: AppMode) => void
}

export default function AppModeSwitcher({ activeMode, onChange }: Props) {
  return (
    <div
      style={{
        borderBottom: '1px solid var(--border-subtle)',
        background: 'var(--bg-card)',
      }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-stretch gap-0" role="tablist" aria-label="App mode">
          {MODES.map((mode) => {
            const active = mode.id === activeMode
            return (
              <button
                key={mode.id}
                id={`mode-tab-${mode.id}`}
                role="tab"
                aria-selected={active}
                onClick={() => onChange(mode.id)}
                className="group relative flex items-center gap-3 px-5 py-3.5 transition-colors focus:outline-none"
                style={{
                  color: active ? 'var(--accent-primary)' : 'var(--text-muted)',
                  background: 'transparent',
                  borderBottom: active
                    ? '2px solid var(--accent-primary)'
                    : '2px solid transparent',
                  marginBottom: -1,
                  cursor: 'pointer',
                }}
              >
                {/* Icon */}
                <span
                  className="shrink-0 transition-colors"
                  style={{ color: active ? 'var(--accent-primary)' : 'var(--text-muted)' }}
                >
                  {mode.icon}
                </span>

                {/* Labels */}
                <span className="text-left min-w-0">
                  <span className="flex items-center gap-2">
                    <span
                      className="text-[12px] font-semibold leading-tight block"
                      style={{ color: active ? 'var(--text-primary)' : 'var(--text-secondary)' }}
                    >
                      {mode.label}
                    </span>
                    {mode.badge && (
                      <span
                        className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded shrink-0"
                        style={{
                          background: 'var(--bg-input)',
                          border: '1px solid var(--border-default)',
                          color: 'var(--text-muted)',
                        }}
                      >
                        {mode.badge}
                      </span>
                    )}
                  </span>
                  <span
                    className="text-[10px] leading-tight hidden sm:block mt-0.5"
                    style={{ color: 'var(--text-muted)' }}
                  >
                    {mode.subtitle}
                  </span>
                </span>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
