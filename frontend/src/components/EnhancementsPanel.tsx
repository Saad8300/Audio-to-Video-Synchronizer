// components/EnhancementsPanel.tsx
// Optional enhancements: Intro, Music, Outro, Watermark

import React, { useState } from 'react'
import FileDropZone from './FileDropZone'
import {
  IconMusic,
  IconVideo,
  IconType,
  IconInfo,
  IconCheck,
} from './icons'
import type { GenerateSettings } from '../types'

interface EnhancementsPanelProps {
  settings:         GenerateSettings
  onSettingsChange: (s: GenerateSettings) => void
  introFile:        File | null
  onIntroChange:    (f: File | null) => void
  outroFile:        File | null
  onOutroChange:    (f: File | null) => void
  bgMusicFile:      File | null
  onBgMusicChange:  (f: File | null) => void
  disabled?:        boolean
}

// ── Collapsible module ──────────────────────────────────────────────────────

function Module({
  id,
  icon,
  title,
  description,
  active,
  activeLabel,
  children,
}: {
  id: string
  icon: React.ReactNode
  title: string
  description: string
  active: boolean
  activeLabel?: string
  children: React.ReactNode
}) {
  const [open, setOpen] = useState(false)

  return (
    <div
      className="rounded-xl overflow-hidden transition-all"
      style={{ border: `1px solid ${active ? 'var(--accent-border)' : 'var(--border-subtle)'}`, background: 'var(--bg-card)' }}
    >
      {/* Header / toggle */}
      <button
        id={`enhance-${id}-toggle`}
        type="button"
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center gap-3 px-4 py-3 text-left transition-colors"
        style={{ background: open ? 'var(--accent-subtle)' : 'transparent' }}
        aria-expanded={open}
      >
        <div
          className="w-7 h-7 rounded-lg shrink-0 flex items-center justify-center"
          style={{
            background: active ? 'var(--accent-subtle)' : 'var(--bg-input)',
            border: `1px solid ${active ? 'var(--accent-border)' : 'var(--border-input)'}`,
            color: active ? 'var(--accent-primary)' : 'var(--text-muted)',
          }}
        >
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>{title}</span>
            {active && activeLabel && (
              <span
                className="inline-flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded"
                style={{ background: 'var(--accent-subtle)', border: '1px solid var(--accent-border)', color: 'var(--accent-primary)' }}
              >
                <IconCheck size={8} />
                {activeLabel}
              </span>
            )}
          </div>
          <p className="text-[10px] mt-0.5 truncate" style={{ color: 'var(--text-muted)' }}>{description}</p>
        </div>
        <span
          className="text-[10px] font-semibold transition-transform duration-200 shrink-0"
          style={{
            color: 'var(--text-muted)',
            transform: open ? 'rotate(180deg)' : 'none',
          }}
        >
          ▾
        </span>
      </button>

      {/* Body */}
      {open && (
        <div
          className="px-4 pb-4 pt-1 space-y-4 animate-fade-in"
          style={{ borderTop: '1px solid var(--border-subtle)' }}
        >
          {children}
        </div>
      )}
    </div>
  )
}

// ── Slider ──────────────────────────────────────────────────────────────────

function Slider({
  id, label, value, min = 0, max = 100, unit = '%', hint, onChange, disabled,
}: {
  id: string; label: string; value: number; min?: number; max?: number;
  unit?: string; hint?: string; onChange: (v: number) => void; disabled?: boolean;
}) {
  const pct = max !== min ? ((value - min) / (max - min)) * 100 : value
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <label htmlFor={id} className="form-label mb-0" style={{ opacity: disabled ? 0.5 : 1 }}>{label}</label>
        <span
          className="text-[10px] font-bold tabular-nums px-1.5 py-0.5 rounded"
          style={{
            background: 'var(--accent-subtle)',
            border: '1px solid var(--accent-border)',
            color: 'var(--accent-primary)',
            opacity: disabled ? 0.5 : 1,
          }}
        >
          {value}{unit}
        </span>
      </div>
      <input
        id={id} type="range" min={min} max={max} step={unit === 'px' ? 2 : 1} value={value}
        disabled={disabled}
        onChange={e => onChange(Number(e.target.value))}
        className="w-full h-1 rounded-full appearance-none cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
        style={{
          background: disabled
            ? 'var(--border-subtle)'
            : `linear-gradient(to right, var(--accent-primary) ${pct}%, var(--border-default) ${pct}%)`,
        }}
        aria-label={`${label}: ${value}${unit}`}
      />
      {hint && <p className="text-[9px] leading-tight" style={{ color: 'var(--text-muted)' }}>{hint}</p>}
    </div>
  )
}

// ── Toggle ──────────────────────────────────────────────────────────────────

function Toggle({ id, checked, onChange, disabled, label }: {
  id: string; checked: boolean; onChange: (v: boolean) => void; disabled?: boolean; label: string;
}) {
  return (
    <div className="flex items-center gap-2">
      <button
        id={id}
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => !disabled && onChange(!checked)}
        className="relative inline-flex h-4.5 w-8 shrink-0 items-center rounded-full transition-colors duration-200 focus:outline-none"
        style={{
          width: '32px',
          height: '18px',
          backgroundColor: checked && !disabled ? 'var(--accent-primary)' : 'var(--border-default)',
          opacity: disabled ? 0.5 : 1,
          cursor: disabled ? 'not-allowed' : 'pointer',
        }}
      >
        <span
          className="inline-block rounded-full bg-white shadow-sm transition-transform duration-200"
          style={{ width: '13px', height: '13px', transform: checked ? 'translateX(16px)' : 'translateX(2px)' }}
        />
      </button>
      <label
        htmlFor={id}
        className="text-xs font-medium select-none"
        style={{ color: disabled ? 'var(--text-muted)' : 'var(--text-secondary)', cursor: disabled ? 'not-allowed' : 'pointer' }}
        onClick={() => !disabled && onChange(!checked)}
      >
        {label}
      </label>
    </div>
  )
}

// ── Tip ─────────────────────────────────────────────────────────────────────

function Tip({ children }: { children: React.ReactNode }) {
  return (
    <div className="alert-info">
      <IconInfo size={11} className="shrink-0 mt-0.5" style={{ color: 'var(--accent-primary)' }} />
      <span className="leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{children}</span>
    </div>
  )
}

// ── Main component ───────────────────────────────────────────────────────────

export default function EnhancementsPanel({
  settings, onSettingsChange,
  introFile, onIntroChange,
  outroFile, onOutroChange,
  bgMusicFile, onBgMusicChange,
  disabled,
}: EnhancementsPanelProps) {
  const set = <K extends keyof GenerateSettings>(key: K, val: GenerateSettings[K]) =>
    onSettingsChange({ ...settings, [key]: val })

  const musicActive     = bgMusicFile !== null
  const watermarkActive = settings.watermarkText.trim() !== ''
  const introActive     = introFile !== null
  const outroActive     = outroFile !== null

  return (
    <div className="space-y-2">

      {/* Intro Video */}
      <Module
        id="intro"
        icon={<IconVideo size={14} />}
        title="Intro Video"
        description="Prepend a video clip to the beginning"
        active={introActive}
        activeLabel="Active"
      >
        <FileDropZone
          id="intro-upload"
          label="Intro Video"
          description="MP4, MOV, WEBM · auto-resized to export resolution"
          accept=".mp4,.mov,.webm,video/mp4,video/quicktime,video/webm"
          icon={<IconVideo size={14} />}
          file={introFile}
          onChange={onIntroChange}
          disabled={disabled}
          compact
        />
      </Module>

      {/* Background Music */}
      <Module
        id="music"
        icon={<IconMusic size={14} />}
        title="Background Music"
        description="Mix ambient audio under your main track"
        active={musicActive}
        activeLabel="Active"
      >
        <FileDropZone
          id="bg-music-upload"
          label="Music File"
          description="MP3, WAV, M4A, AAC · loops to fit video length"
          accept=".mp3,.wav,.m4a,.aac,audio/*"
          icon={<IconMusic size={14} />}
          file={bgMusicFile}
          onChange={onBgMusicChange}
          disabled={disabled}
          compact
        />
        <div className={`space-y-3 transition-opacity ${!musicActive ? 'opacity-40 pointer-events-none' : ''}`}>
          <Slider
            id="music-volume-slider"
            label="Volume"
            value={settings.musicVolume}
            min={0} max={100} unit="%"
            hint="Keep at 10–15% for voice clarity"
            onChange={v => set('musicVolume', v)}
            disabled={!musicActive}
          />
          <Toggle
            id="music-fade-toggle"
            checked={settings.musicFade}
            onChange={v => set('musicFade', v)}
            disabled={!musicActive}
            label="Fade in / Fade out"
          />
        </div>
      </Module>

      {/* Outro Video */}
      <Module
        id="outro"
        icon={<IconVideo size={14} />}
        title="Outro Video"
        description="Append a video clip to the end"
        active={outroActive}
        activeLabel="Active"
      >
        <FileDropZone
          id="outro-upload"
          label="Outro Video"
          description="MP4, MOV, WEBM · auto-resized to export resolution"
          accept=".mp4,.mov,.webm,video/mp4,video/quicktime,video/webm"
          icon={<IconVideo size={14} />}
          file={outroFile}
          onChange={onOutroChange}
          disabled={disabled}
          compact
        />
      </Module>

      {/* Watermark */}
      <Module
        id="watermark"
        icon={<IconType size={14} />}
        title="Watermark"
        description="Add a text overlay to every frame"
        active={watermarkActive}
        activeLabel="Active"
      >
        <div className="space-y-1">
          <label htmlFor="watermark-text" className="form-label">Text <span style={{ color: 'var(--text-muted)', fontWeight: 400, textTransform: 'none' }}>(leave empty to disable)</span></label>
          <input
            id="watermark-text"
            type="text"
            value={settings.watermarkText}
            onChange={e => set('watermarkText', e.target.value.slice(0, 60))}
            placeholder="@YourChannel or brand name"
            className="form-input"
            disabled={disabled}
            maxLength={60}
          />
        </div>

        <div className={`space-y-4 transition-opacity ${!watermarkActive ? 'opacity-40 pointer-events-none' : ''}`}>
          {/* Position mode + position */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="space-y-1 sm:w-[100px] shrink-0">
              <label htmlFor="watermark-position-mode" className="form-label">Mode</label>
              <select
                id="watermark-position-mode"
                value={settings.watermarkPositionMode}
                onChange={e => set('watermarkPositionMode', e.target.value as any)}
                className="form-select"
                disabled={!watermarkActive}
              >
                <option value="preset">Preset</option>
                <option value="custom">Custom</option>
              </select>
            </div>

            {settings.watermarkPositionMode === 'preset' ? (
              <div className="space-y-1 flex-1 animate-fade-in">
                <label htmlFor="watermark-position" className="form-label">Position</label>
                <select
                  id="watermark-position"
                  value={settings.watermarkPosition}
                  onChange={e => set('watermarkPosition', e.target.value as any)}
                  className="form-select"
                  disabled={!watermarkActive}
                >
                  <option value="white_default">White Default</option>
                  <option value="top_left">Top Left</option>
                  <option value="top_right">Top Right</option>
                  <option value="bottom_left">Bottom Left</option>
                  <option value="bottom_right">Bottom Right</option>
                  <option value="center">Center</option>
                </select>
              </div>
            ) : (
              <div className="flex flex-col gap-1 flex-1 animate-fade-in">
                <div className="flex gap-2">
                  <div className="space-y-1 flex-1 min-w-0">
                    <label htmlFor="watermark-x" className="form-label">X px</label>
                    <input
                      id="watermark-x"
                      type="number"
                      value={settings.watermarkX}
                      onChange={e => {
                        const v = parseInt(e.target.value);
                        set('watermarkX', isNaN(v) ? 0 : v);
                      }}
                      className="form-input px-2"
                      disabled={!watermarkActive}
                    />
                  </div>
                  <div className="space-y-1 flex-1 min-w-0">
                    <label htmlFor="watermark-y" className="form-label">Y px</label>
                    <input
                      id="watermark-y"
                      type="number"
                      value={settings.watermarkY}
                      onChange={e => {
                        const v = parseInt(e.target.value);
                        set('watermarkY', isNaN(v) ? 0 : v);
                      }}
                      className="form-input px-2"
                      disabled={!watermarkActive}
                    />
                  </div>
                </div>
                <div className="text-[10px] mt-1" style={{ color: 'var(--text-muted)' }}>
                  X = pixels from left, Y = pixels from top (of final export resolution).
                </div>
              </div>
            )}
          </div>

          {/* Size & Opacity */}
          <div className="grid grid-cols-2 gap-3">
            <Slider
              id="watermark-size-slider"
              label="Size"
              value={settings.watermarkSize}
              min={1} max={100} unit="%"
              onChange={v => set('watermarkSize', v)}
              disabled={!watermarkActive}
            />
            <Slider
              id="watermark-opacity-slider"
              label="Opacity"
              value={settings.watermarkOpacity}
              min={10} max={100} unit="%"
              onChange={v => set('watermarkOpacity', v)}
              disabled={!watermarkActive}
            />
          </div>

          {/* Margin (only for preset mode) */}
          {settings.watermarkPositionMode === 'preset' && (
            <Slider
              id="watermark-margin-slider"
              label="Edge Margin"
              value={settings.watermarkMargin}
              min={10} max={100} unit="px"
              onChange={v => set('watermarkMargin', v)}
              disabled={!watermarkActive}
            />
          )}
        </div>
      </Module>

      {(introActive || outroActive) && (
        <Tip>Intro and outro clips are automatically resized to your export resolution.</Tip>
      )}
    </div>
  )
}
