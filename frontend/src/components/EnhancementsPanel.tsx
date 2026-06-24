// components/EnhancementsPanel.tsx
// Collapsible "Optional Enhancements" card — outro video, background music, and watermark

import React, { useState } from 'react'
import FileDropZone from './FileDropZone'
import {
  IconMusic,
  IconVideo,
  IconType,
  IconSparkles,
  IconInfo,
  IconAlertTriangle,
} from './icons'
import type {
  GenerateSettings,
  WatermarkPosition,
  WatermarkSize,
} from '../types'

interface EnhancementsPanelProps {
  settings:         GenerateSettings
  onSettingsChange: (s: GenerateSettings) => void
  outroFile:        File | null
  onOutroChange:    (f: File | null) => void
  bgMusicFile:      File | null
  onBgMusicChange:  (f: File | null) => void
  disabled?:        boolean
}

// ── Small reusable toggle ───────────────────────────────────────────────────

interface ToggleProps {
  id:           string
  checked:      boolean
  onChange:     (v: boolean) => void
  disabled?:    boolean
  label:        string
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
          backgroundColor: checked && !disabled ? undefined : 'var(--color-surface-input-border)',
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
        {description && <p className="text-xs text-muted mt-0.5">{description}</p>}
      </div>
    </div>
  )
}

// ── Percentage slider ───────────────────────────────────────────────────────

interface PercentSliderProps {
  id:       string
  label:    string
  value:    number        // 0–100
  min?:     number
  onChange: (v: number) => void
  disabled?: boolean
  hint?:    string
}

function PercentSlider({ id, label, value, min = 0, onChange, disabled, hint }: PercentSliderProps) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <label htmlFor={id} className={`form-label mb-0 ${disabled ? 'opacity-40' : ''}`}>
          {label}
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
        min={min}
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
        aria-label={`${label}: ${value}%`}
      />
      {hint && (
        <p className="text-[10px] text-muted">{hint}</p>
      )}
    </div>
  )
}

// ── Pixel slider (for margin) ───────────────────────────────────────────────

interface PxSliderProps {
  id:       string
  label:    string
  value:    number
  min:      number
  max:      number
  onChange: (v: number) => void
  disabled?: boolean
}

function PxSlider({ id, label, value, min, max, onChange, disabled }: PxSliderProps) {
  const pct = ((value - min) / (max - min)) * 100
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <label htmlFor={id} className={`form-label mb-0 ${disabled ? 'opacity-40' : ''}`}>
          {label}
        </label>
        <span
          className={`text-sm font-semibold tabular-nums px-2 py-0.5 rounded-md ${disabled ? 'opacity-40' : 'text-brand-300'}`}
          style={{ backgroundColor: 'rgba(99,102,241,0.1)' }}
        >
          {value}px
        </span>
      </div>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={2}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full h-1.5 rounded-full appearance-none cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
        style={{
          background: disabled
            ? 'var(--color-surface-input-border)'
            : `linear-gradient(to right, #6366f1 ${pct}%, var(--color-surface-input-border) ${pct}%)`,
          accentColor: '#6366f1',
        }}
        aria-label={`${label}: ${value}px`}
      />
      <div className="flex justify-between text-[10px] text-muted">
        <span>{min}px</span>
        <span>{max}px</span>
      </div>
    </div>
  )
}

// ── Info tip ────────────────────────────────────────────────────────────────

function InfoTip({ children, color = 'brand' }: { children: React.ReactNode; color?: 'brand' | 'emerald' | 'amber' }) {
  const styles = {
    brand:   { bg: 'rgba(99,102,241,0.06)',  border: 'rgba(99,102,241,0.12)',  icon: 'text-brand-400' },
    emerald: { bg: 'rgba(16,185,129,0.06)',  border: 'rgba(16,185,129,0.15)',  icon: 'text-emerald-400' },
    amber:   { bg: 'rgba(245,158,11,0.08)',  border: 'rgba(245,158,11,0.25)',  icon: 'text-amber-400' },
  }
  const s = styles[color]
  return (
    <div
      className="flex items-start gap-2 rounded-lg px-3 py-2.5 text-xs"
      style={{ backgroundColor: s.bg, border: `1px solid ${s.border}` }}
    >
      <IconInfo size={13} className={`${s.icon} shrink-0 mt-0.5`} />
      <span className="text-muted leading-relaxed">{children}</span>
    </div>
  )
}

// ── Section divider ─────────────────────────────────────────────────────────

function SectionDivider() {
  return <div className="h-px" style={{ backgroundColor: 'var(--color-surface-card-border)' }} />
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

  const hasSomething   = outroFile !== null || bgMusicFile !== null || (settings.enableWatermark && settings.watermarkText.trim() !== '')
  const musicActive    = bgMusicFile !== null && settings.enableBgMusic && !disabled
  const watermarkActive = settings.enableWatermark && settings.watermarkText.trim() !== '' && !disabled

  // Badge labels
  const badges = [
    bgMusicFile && 'Music',
    outroFile   && 'Outro',
    (settings.enableWatermark && settings.watermarkText.trim()) && 'Watermark',
  ].filter(Boolean)

  return (
    <div className="card-glow overflow-hidden">
      {/* ── Collapsible header ────────────────────────────────────────────── */}
      <button
        id="enhancements-toggle-btn"
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center justify-between gap-4 p-5 text-left transition-colors"
        style={{ backgroundColor: expanded ? 'rgba(99,102,241,0.04)' : 'transparent' }}
        aria-expanded={expanded}
        disabled={disabled}
      >
        <div className="flex items-center gap-3">
          <div
            className="w-9 h-9 rounded-lg flex items-center justify-center text-violet-400 shrink-0"
            style={{ backgroundColor: 'rgba(139,92,246,0.1)', border: '1px solid rgba(139,92,246,0.2)' }}
          >
            <IconSparkles size={18} />
          </div>
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h2 className="text-base font-semibold text-primary">Optional Enhancements</h2>
              {hasSomething && badges.length > 0 && (
                <span
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold text-violet-300"
                  style={{ backgroundColor: 'rgba(139,92,246,0.15)', border: '1px solid rgba(139,92,246,0.25)' }}
                >
                  {badges.join(' + ')}
                </span>
              )}
            </div>
            <p className="text-xs text-muted mt-0.5">Background music · Outro video · Watermark / branding</p>
          </div>
        </div>
        <span className={`text-muted transition-transform duration-200 text-sm shrink-0 ${expanded ? 'rotate-180' : ''}`}>
          ▼
        </span>
      </button>

      {/* ── Expanded content ──────────────────────────────────────────────── */}
      {expanded && (
        <div className="px-5 pb-6 space-y-6">
          <SectionDivider />

          {/* ── Background Music ─────────────────────────────────────────── */}
          <div className="space-y-4">
            <div className="flex items-center gap-2.5">
              <div
                className="w-7 h-7 rounded-lg flex items-center justify-center text-brand-400 shrink-0"
                style={{ backgroundColor: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.2)' }}
              >
                <IconMusic size={14} />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-primary">Background Music</h3>
                <p className="text-xs text-muted">Low-volume music behind your main audio</p>
              </div>
            </div>

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

            <div className="space-y-4 pl-1">
              <Toggle
                id="enable-bg-music-toggle"
                checked={settings.enableBgMusic}
                onChange={(v) => set('enableBgMusic', v)}
                disabled={bgMusicFile === null || disabled}
                label="Enable Background Music"
                description={bgMusicFile === null ? 'Upload a music file above to enable this option' : 'Mix background music behind the main audio'}
              />
              <PercentSlider
                id="music-volume-slider"
                label="Music Volume"
                value={settings.musicVolume}
                onChange={(v) => set('musicVolume', v)}
                disabled={!musicActive}
                hint="Recommended: 10–15% to keep the voice clear"
              />
              <Toggle
                id="music-fade-toggle"
                checked={settings.musicFade}
                onChange={(v) => set('musicFade', v)}
                disabled={!musicActive}
                label="Fade In / Fade Out"
                description="Smoothly fade the music at the start and end of the video"
              />
            </div>

            <InfoTip color="brand">
              Music is automatically <strong className="text-secondary">looped</strong> if shorter than the video,
              or <strong className="text-secondary">trimmed</strong> if longer. Keep volume at{' '}
              <strong className="text-secondary">10–15%</strong> for the best balance.
            </InfoTip>
          </div>

          <SectionDivider />

          {/* ── Outro / Ending Video ─────────────────────────────────────── */}
          <div className="space-y-4">
            <div className="flex items-center gap-2.5">
              <div
                className="w-7 h-7 rounded-lg flex items-center justify-center text-emerald-400 shrink-0"
                style={{ backgroundColor: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)' }}
              >
                <IconVideo size={14} />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-primary">Outro / Ending Video</h3>
                <p className="text-xs text-muted">Appended after the main generated video</p>
              </div>
            </div>

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

            {outroFile ? (
              <InfoTip color="emerald">
                The outro will be automatically resized to match your selected resolution and aspect ratio.
                Its original audio will be preserved.
              </InfoTip>
            ) : (
              <InfoTip color="brand">
                Upload any short ending clip — Subscribe screens, social prompts, or branding.
                It will be matched to your selected aspect ratio and resolution.
              </InfoTip>
            )}
          </div>

          <SectionDivider />

          {/* ── Watermark / Branding ─────────────────────────────────────── */}
          <div className="space-y-4">
            <div className="flex items-center gap-2.5">
              <div
                className="w-7 h-7 rounded-lg flex items-center justify-center text-amber-400 shrink-0"
                style={{ backgroundColor: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.2)' }}
              >
                <IconType size={14} />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-primary">Watermark / Branding</h3>
                <p className="text-xs text-muted">Subtle text overlay — channel handle, brand name, or label</p>
              </div>
            </div>

            {/* Watermark text input */}
            <div className="space-y-1.5">
              <label htmlFor="watermark-text" className="form-label">Watermark Text</label>
              <input
                id="watermark-text"
                type="text"
                value={settings.watermarkText}
                onChange={(e) => set('watermarkText', e.target.value.slice(0, 60))}
                placeholder="@YourChannel, Atomis Labs, Follow for more…"
                className="form-input"
                disabled={disabled}
                maxLength={60}
              />
              <p className="text-xs text-muted text-right">
                {settings.watermarkText.length}/60 characters
              </p>
            </div>

            {/* Enable toggle — disabled if no text */}
            <Toggle
              id="enable-watermark-toggle"
              checked={settings.enableWatermark}
              onChange={(v) => set('enableWatermark', v)}
              disabled={settings.watermarkText.trim() === '' || disabled}
              label="Enable Watermark"
              description={
                settings.watermarkText.trim() === ''
                  ? 'Enter watermark text above to enable this option'
                  : 'Render text watermark over the final video'
              }
            />

            {/* Controls — shown always, disabled when watermark inactive */}
            <div className={`space-y-4 pl-1 ${!watermarkActive ? 'opacity-50 pointer-events-none' : ''}`}>
              {/* Position */}
              <div className="space-y-1.5">
                <label htmlFor="watermark-position" className="form-label">Position</label>
                <select
                  id="watermark-position"
                  value={settings.watermarkPosition}
                  onChange={(e) => set('watermarkPosition', e.target.value as WatermarkPosition)}
                  className="form-select"
                  disabled={!watermarkActive}
                >
                  <option value="top_left">Top Left</option>
                  <option value="top_right">Top Right</option>
                  <option value="bottom_left">Bottom Left</option>
                  <option value="bottom_right">Bottom Right</option>
                  <option value="center">Center</option>
                </select>
              </div>

              {/* Size */}
              <div className="space-y-1.5">
                <label htmlFor="watermark-size" className="form-label">Size</label>
                <select
                  id="watermark-size"
                  value={settings.watermarkSize}
                  onChange={(e) => set('watermarkSize', e.target.value as WatermarkSize)}
                  className="form-select"
                  disabled={!watermarkActive}
                >
                  <option value="small">Small (subtle, recommended)</option>
                  <option value="medium">Medium</option>
                  <option value="large">Large</option>
                </select>
              </div>

              {/* Opacity slider */}
              <PercentSlider
                id="watermark-opacity-slider"
                label="Opacity"
                value={settings.watermarkOpacity}
                min={10}
                onChange={(v) => set('watermarkOpacity', v)}
                disabled={!watermarkActive}
                hint="Default: 65% — readable but unobtrusive"
              />

              {/* Margin slider */}
              <PxSlider
                id="watermark-margin-slider"
                label="Edge Margin"
                value={settings.watermarkMargin}
                min={10}
                max={100}
                onChange={(v) => set('watermarkMargin', v)}
                disabled={!watermarkActive}
              />
            </div>

            {/* Info tip */}
            <InfoTip color="amber">
              The watermark uses a semi-transparent dark pill background for readability on both
              bright and dark images. It appears on the main video{outroFile ? ' and outro' : ''}.
              Keep <strong className="text-secondary">Small</strong> size and{' '}
              <strong className="text-secondary">65%</strong> opacity for a professional look.
            </InfoTip>
          </div>
        </div>
      )}
    </div>
  )
}
