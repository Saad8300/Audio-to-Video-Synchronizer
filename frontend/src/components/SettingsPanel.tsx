// components/SettingsPanel.tsx – Video generation settings (Batch 3)

import React from 'react'
import { IconSettings, IconMonitor, IconAlertTriangle } from './icons'
import type {
  GenerateSettings,
  AspectRatio,
  ExportResolution,
  FitMode,
  Transition,
  ZoomEffect,
  RenderProfile,
} from '../types'

interface SettingsPanelProps {
  settings:  GenerateSettings
  onChange:  (s: GenerateSettings) => void
  disabled?: boolean
}

// ── Reusable select field ───────────────────────────────────────────────────

interface SelectFieldProps {
  id:       string
  label:    string
  value:    string
  options:  { value: string; label: string }[]
  onChange: (v: string) => void
  disabled?: boolean
}

function SelectField({ id, label, value, options, onChange, disabled }: SelectFieldProps) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="form-label">{label}</label>
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="form-select"
        disabled={disabled}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </div>
  )
}

// ── Render Profile card picker ──────────────────────────────────────────────

const PROFILE_OPTIONS: { value: RenderProfile; label: string; description: string; badge?: string }[] = [
  {
    value:       'fast_preview',
    label:       'Fast Preview',
    description: '24fps · Fastest export for timing checks',
  },
  {
    value:       'balanced',
    label:       'Balanced',
    description: '30fps · Recommended for most exports',
    badge:       'Recommended',
  },
  {
    value:       'high_quality',
    label:       'High Quality',
    description: '30fps · Best output, slower rendering',
  },
]

interface RenderProfilePickerProps {
  value:    RenderProfile
  onChange: (v: RenderProfile) => void
  disabled?: boolean
}

function RenderProfilePicker({ value, onChange, disabled }: RenderProfilePickerProps) {
  return (
    <div className="space-y-1.5">
      <label className="form-label">Render Profile</label>
      <div className="grid grid-cols-3 gap-2">
        {PROFILE_OPTIONS.map((opt) => {
          const active = value === opt.value
          return (
            <button
              key={opt.value}
              id={`render-profile-${opt.value}`}
              type="button"
              disabled={disabled}
              onClick={() => !disabled && onChange(opt.value)}
              className={`
                relative flex flex-col items-start gap-1 rounded-xl px-3 py-2.5 text-left
                border transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-brand-500/50
                ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
              `}
              style={{
                backgroundColor: active
                  ? 'rgba(99,102,241,0.12)'
                  : 'var(--color-surface-input)',
                borderColor: active
                  ? 'rgba(99,102,241,0.45)'
                  : 'var(--color-surface-card-border)',
              }}
              aria-pressed={active}
            >
              {opt.badge && (
                <span
                  className="absolute top-1.5 right-1.5 text-[9px] font-bold px-1.5 py-0.5 rounded-full text-brand-300"
                  style={{ backgroundColor: 'rgba(99,102,241,0.2)' }}
                >
                  {opt.badge}
                </span>
              )}
              <span className={`text-xs font-semibold ${active ? 'text-brand-300' : 'text-primary'}`}>
                {opt.label}
              </span>
              <span className="text-[10px] leading-tight text-muted">{opt.description}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ── Inline warning banner ───────────────────────────────────────────────────

function InlineWarning({ message }: { message: string }) {
  return (
    <div
      className="flex items-start gap-2 rounded-lg px-3 py-2 text-xs animate-fade-in"
      style={{ backgroundColor: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.25)' }}
    >
      <IconAlertTriangle size={13} className="text-amber-400 shrink-0 mt-0.5" />
      <span className="text-amber-300 leading-relaxed">{message}</span>
    </div>
  )
}

// ── Main component ───────────────────────────────────────────────────────────

export default function SettingsPanel({ settings, onChange, disabled }: SettingsPanelProps) {
  const set = <K extends keyof GenerateSettings>(key: K, val: GenerateSettings[K]) =>
    onChange({ ...settings, [key]: val })

  // Inline warnings
  const isHighRes = settings.exportResolution === '2K' || settings.exportResolution === '4K'
  const is4kHQZoom =
    settings.exportResolution === '4K' &&
    settings.renderProfile === 'high_quality' &&
    settings.zoomEffect === 'slow_zoom_in'
  const isHighResWarn = isHighRes && !is4kHQZoom

  return (
    <div className="card-glow p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg bg-brand-500/10 border border-brand-500/20 flex items-center justify-center text-brand-400">
          <IconSettings size={18} />
        </div>
        <div>
          <h2 className="text-base font-semibold text-primary">Settings</h2>
          <p className="text-xs text-muted">Configure output format, resolution, and effects</p>
        </div>
      </div>

      <div className="h-px" style={{ backgroundColor: 'var(--color-surface-card-border)' }} />

      {/* ── Resolution section ─────────────────────────────────────────────── */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <IconMonitor size={14} className="text-muted" />
          <span className="text-xs font-semibold text-muted uppercase tracking-wide">Output Resolution</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <SelectField
            id="aspect-ratio"
            label="Aspect Ratio"
            value={settings.aspectRatio}
            onChange={(v) => set('aspectRatio', v as AspectRatio)}
            disabled={disabled}
            options={[
              { value: '9:16',  label: '9:16  Shorts / Reels / TikTok' },
              { value: '16:9',  label: '16:9  YouTube / Landscape' },
              { value: '1:1',   label: '1:1   Square' },
            ]}
          />

          <div className="space-y-1.5">
            <SelectField
              id="export-resolution"
              label="Export Resolution"
              value={settings.exportResolution}
              onChange={(v) => set('exportResolution', v as ExportResolution)}
              disabled={disabled}
              options={[
                { value: '720p',  label: '720p  — Fast (recommended for testing)' },
                { value: '1080p', label: '1080p — Standard HD' },
                { value: '2K',    label: '2K    — High resolution' },
                { value: '4K',    label: '4K    — Ultra HD (slow)' },
              ]}
            />
          </div>
        </div>

        {/* Resolution dimension hint */}
        <p className="text-[11px] text-muted">
          {(() => {
            const map: Record<string, Record<string, string>> = {
              '9:16':  { '720p': '720×1280', '1080p': '1080×1920', '2K': '1440×2560', '4K': '2160×3840' },
              '16:9':  { '720p': '1280×720',  '1080p': '1920×1080', '2K': '2560×1440', '4K': '3840×2160' },
              '1:1':   { '720p': '720×720',   '1080p': '1080×1080', '2K': '1440×1440', '4K': '2160×2160' },
            }
            const dim = map[settings.aspectRatio]?.[settings.exportResolution]
            return dim ? `Output size: ${dim} pixels` : null
          })()}
        </p>

        {/* Warnings */}
        {is4kHQZoom && (
          <InlineWarning message="4K + High Quality + Slow Zoom In is a very demanding combination. Generation may take significantly longer." />
        )}
        {isHighResWarn && (
          <InlineWarning message={`${settings.exportResolution} resolution can take longer, especially with Slow Zoom In, Fade transitions, background music, outro, and watermark.`} />
        )}
      </div>

      <div className="h-px" style={{ backgroundColor: 'var(--color-surface-card-border)' }} />

      {/* ── Render Profile ────────────────────────────────────────────────── */}
      <RenderProfilePicker
        value={settings.renderProfile}
        onChange={(v) => set('renderProfile', v)}
        disabled={disabled}
      />

      <div className="h-px" style={{ backgroundColor: 'var(--color-surface-card-border)' }} />

      {/* ── Effects grid ──────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <SelectField
          id="fit-mode"
          label="Image Fit Mode"
          value={settings.fitMode}
          onChange={(v) => set('fitMode', v as FitMode)}
          disabled={disabled}
          options={[
            { value: 'cover',   label: 'Cover / Crop (fill screen)' },
            { value: 'contain', label: 'Contain / Fit (blurred bg)' },
          ]}
        />

        <SelectField
          id="transition"
          label="Transition"
          value={settings.transition}
          onChange={(v) => set('transition', v as Transition)}
          disabled={disabled}
          options={[
            { value: 'none', label: 'None (direct cut)' },
            { value: 'fade', label: 'Fade' },
          ]}
        />

        <SelectField
          id="zoom-effect"
          label="Zoom Effect"
          value={settings.zoomEffect}
          onChange={(v) => set('zoomEffect', v as ZoomEffect)}
          disabled={disabled}
          options={[
            { value: 'none',         label: 'None (static)' },
            { value: 'slow_zoom_in', label: 'Slow Zoom In (Ken Burns)' },
          ]}
        />
      </div>

      <div className="h-px" style={{ backgroundColor: 'var(--color-surface-card-border)' }} />

      {/* ── Output filename ────────────────────────────────────────────────── */}
      <div className="space-y-1.5">
        <label htmlFor="output-name" className="form-label">Output Filename</label>
        <input
          id="output-name"
          type="text"
          value={settings.outputName}
          onChange={(e) => set('outputName', e.target.value)}
          placeholder="my_video"
          className="form-input"
          disabled={disabled}
          maxLength={80}
        />
        <p className="text-xs text-muted">
          Timestamp will be appended automatically. E.g.{' '}
          <span className="font-mono text-secondary">
            {settings.outputName || 'video'}_20240101_120000.mp4
          </span>
        </p>
      </div>
    </div>
  )
}
