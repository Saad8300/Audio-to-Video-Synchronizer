// components/EnhancementsPanel.tsx
// Collapsible "Optional Enhancements" card — outro video and background music

import React, { useState } from 'react'
import FileDropZone from './FileDropZone'
import {
  IconMusic,
  IconVideo,
  IconSparkles,
  IconInfo,
} from './icons'
import type { GenerateSettings } from '../types'

interface EnhancementsPanelProps {
  settings: GenerateSettings
  onSettingsChange: (s: GenerateSettings) => void
  outroFile: File | null
  onOutroChange: (f: File | null) => void
  bgMusicFile: File | null
  onBgMusicChange: (f: File | null) => void
  disabled?: boolean
}

// ── Small reusable toggle switch ────────────────────────────────────────────

interface ToggleProps {
  id: string
  checked: boolean
  onChange: (v: boolean) => void
  disabled?: boolean
  label: string
  description?: string
}

function Toggle({ id, checked, onChange, disabled, label, description }: ToggleProps) {
  return (
    <div className="flex items-start gap-3">
      <button
        id={id}
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => !disabled && onChange(!checked)}
        className={`
          relative inline-flex h-5 w-9 shrink-0 items-center rounded-full
          transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-brand-500/50 mt-0.5
          ${checked && !disabled ? 'bg-brand-600' : ''}
          ${disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}
        `}
        style={{
          backgroundColor: checked && !disabled
            ? undefined
            : 'var(--color-surface-input-border)',
        }}
      >
        <span
          className={`
            inline-block h-3.5 w-3.5 rounded-full bg-white shadow-sm
            transform transition-transform duration-200
            ${checked ? 'translate-x-4' : 'translate-x-0.5'}
          `}
        />
      </button>
      <div className="flex-1 min-w-0">
        <label
          htmlFor={id}
          className={`text-sm font-medium select-none ${disabled ? 'opacity-40' : 'cursor-pointer text-primary'}`}
          onClick={() => !disabled && onChange(!checked)}
        >
          {label}
        </label>
        {description && (
          <p className="text-xs text-muted mt-0.5">{description}</p>
        )}
      </div>
    </div>
  )
}

// ── Volume slider ────────────────────────────────────────────────────────────

interface VolumeSliderProps {
  id: string
  value: number        // 0–100
  onChange: (v: number) => void
  disabled?: boolean
}

function VolumeSlider({ id, value, onChange, disabled }: VolumeSliderProps) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <label htmlFor={id} className={`form-label mb-0 ${disabled ? 'opacity-40' : ''}`}>
          Music Volume
        </label>
        <span
          className={`text-sm font-semibold tabular-nums px-2 py-0.5 rounded-md ${disabled ? 'opacity-40' : 'text-brand-300'}`}
          style={{ backgroundColor: 'rgba(99,102,241,0.1)' }}
        >
          {value}%
        </span>
      </div>
      <input
        id={id}
        type="range"
        min={0}
        max={100}
        step={1}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full h-1.5 rounded-full appearance-none cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
        style={{
          background: disabled
            ? 'var(--color-surface-input-border)'
            : `linear-gradient(to right, #6366f1 ${value}%, var(--color-surface-input-border) ${value}%)`,
          accentColor: '#6366f1',
        }}
        aria-label={`Music volume: ${value}%`}
      />
      <div className="flex justify-between text-[10px] text-muted">
        <span>0%</span>
        <span className="text-muted/60">Recommended: 10–15%</span>
        <span>100%</span>
      </div>
    </div>
  )
}

// ── Main component ───────────────────────────────────────────────────────────

export default function EnhancementsPanel({
  settings,
  onSettingsChange,
  outroFile,
  onOutroChange,
  bgMusicFile,
  onBgMusicChange,
  disabled,
}: EnhancementsPanelProps) {
  const [expanded, setExpanded] = useState(false)

  const set = <K extends keyof GenerateSettings>(key: K, val: GenerateSettings[K]) =>
    onSettingsChange({ ...settings, [key]: val })

  const hasSomething = outroFile !== null || bgMusicFile !== null

  // Music controls are active only when: a file is uploaded AND toggle is on
  const musicControlsActive = bgMusicFile !== null && settings.enableBgMusic && !disabled

  return (
    <div className="card-glow overflow-hidden">
      {/* ── Collapsible header ─────────────────────────────────────────── */}
      <button
        id="enhancements-toggle-btn"
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center justify-between gap-4 p-5 text-left transition-colors"
        style={{ backgroundColor: expanded ? 'rgba(99,102,241,0.04)' : 'transparent' }}
        aria-expanded={expanded}
        disabled={disabled}
      >
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg flex items-center justify-center text-violet-400 shrink-0"
            style={{ backgroundColor: 'rgba(139,92,246,0.1)', border: '1px solid rgba(139,92,246,0.2)' }}>
            <IconSparkles size={18} />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h2 className="text-base font-semibold text-primary">Optional Enhancements</h2>
              {hasSomething && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold text-violet-300"
                  style={{ backgroundColor: 'rgba(139,92,246,0.15)', border: '1px solid rgba(139,92,246,0.25)' }}>
                  {[bgMusicFile && 'Music', outroFile && 'Outro'].filter(Boolean).join(' + ')}
                </span>
              )}
            </div>
            <p className="text-xs text-muted mt-0.5">
              Background music · Outro / ending video
            </p>
          </div>
        </div>
        <span className={`text-muted transition-transform duration-200 text-sm ${expanded ? 'rotate-180' : ''}`}>
          ▼
        </span>
      </button>

      {/* ── Expanded content ───────────────────────────────────────────── */}
      {expanded && (
        <div className="px-5 pb-6 space-y-6">
          <div className="h-px" style={{ backgroundColor: 'var(--color-surface-card-border)' }} />

          {/* ── Background Music ───────────────────────────────────────── */}
          <div className="space-y-4">
            {/* Section header */}
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg flex items-center justify-center text-brand-400 shrink-0"
                style={{ backgroundColor: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.2)' }}>
                <IconMusic size={14} />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-primary">Background Music</h3>
                <p className="text-xs text-muted">Low-volume music behind your main audio</p>
              </div>
            </div>

            {/* Music file upload */}
            <FileDropZone
              id="bg-music-upload"
              label="Background Music File (Optional)"
              description="MP3, WAV, M4A, AAC — looped/trimmed to match video length"
              accept=".mp3,.wav,.m4a,.aac,audio/*"
              icon={<IconMusic size={18} />}
              file={bgMusicFile}
              onChange={onBgMusicChange}
              disabled={disabled}
            />

            {/* Music controls — shown always but disabled until file is uploaded */}
            <div className="space-y-4 pl-1">
              <Toggle
                id="enable-bg-music-toggle"
                checked={settings.enableBgMusic}
                onChange={(v) => set('enableBgMusic', v)}
                disabled={bgMusicFile === null || disabled}
                label="Enable Background Music"
                description={
                  bgMusicFile === null
                    ? 'Upload a music file above to enable this option'
                    : 'Mix background music behind the main audio'
                }
              />

              <VolumeSlider
                id="music-volume-slider"
                value={settings.musicVolume}
                onChange={(v) => set('musicVolume', v)}
                disabled={!musicControlsActive}
              />

              <Toggle
                id="music-fade-toggle"
                checked={settings.musicFade}
                onChange={(v) => set('musicFade', v)}
                disabled={!musicControlsActive}
                label="Fade In / Fade Out"
                description="Smoothly fade the music at the start and end of the video"
              />
            </div>

            {/* Info tip */}
            <div className="flex items-start gap-2 rounded-lg px-3 py-2.5 text-xs"
              style={{ backgroundColor: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.12)' }}>
              <IconInfo size={13} className="text-brand-400 shrink-0 mt-0.5" />
              <span className="text-muted leading-relaxed">
                Music is automatically looped if shorter than the video, or trimmed if longer.
                Keep volume at <strong className="text-secondary">10–15%</strong> for the best balance.
              </span>
            </div>
          </div>

          <div className="h-px" style={{ backgroundColor: 'var(--color-surface-card-border)' }} />

          {/* ── Outro / Ending Video ───────────────────────────────────── */}
          <div className="space-y-4">
            {/* Section header */}
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg flex items-center justify-center text-emerald-400 shrink-0"
                style={{ backgroundColor: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)' }}>
                <IconVideo size={14} />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-primary">Outro / Ending Video</h3>
                <p className="text-xs text-muted">Appended after the main generated video</p>
              </div>
            </div>

            {/* Outro file upload */}
            <FileDropZone
              id="outro-upload"
              label="Outro / Ending Video (Optional)"
              description="MP4, MOV, WEBM — e.g. Subscribe, Follow for more, Like & Share"
              accept=".mp4,.mov,.webm,video/mp4,video/quicktime,video/webm"
              icon={<IconVideo size={18} />}
              file={outroFile}
              onChange={onOutroChange}
              disabled={disabled}
            />

            {/* Info tip */}
            {outroFile && (
              <div className="flex items-start gap-2 rounded-lg px-3 py-2.5 text-xs"
                style={{ backgroundColor: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.15)' }}>
                <IconInfo size={13} className="text-emerald-400 shrink-0 mt-0.5" />
                <span className="text-muted leading-relaxed">
                  The outro will be automatically resized to match your selected video format.
                  Its original audio will be preserved.
                </span>
              </div>
            )}

            {!outroFile && (
              <div className="flex items-start gap-2 rounded-lg px-3 py-2.5 text-xs"
                style={{ backgroundColor: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.12)' }}>
                <IconInfo size={13} className="text-brand-400 shrink-0 mt-0.5" />
                <span className="text-muted leading-relaxed">
                  Upload any short ending clip — Subscribe screens, social prompts, or branding.
                  It will be appended after your main video and matched to your selected aspect ratio.
                </span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
