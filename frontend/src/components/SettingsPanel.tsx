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
    <div className="card-glow p-5 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-brand-500/10 border border-brand-500/20 flex items-center justify-center text-brand-400">
          <IconSettings size={16} />
        </div>
        <div>
          <h2 className="text-sm font-semibold text-primary leading-none">Settings</h2>
          <p className="text-[11px] text-muted mt-1 leading-none">Configure output and effects</p>
        </div>
      </div>

      {/* ── GROUP 1: OUTPUT ─────────────────────────────────────────────── */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 border-b pb-1.5" style={{ borderColor: 'var(--color-surface-card-border)' }}>
          <IconMonitor size={12} className="text-muted" />
          <span className="text-[10px] font-bold text-muted uppercase tracking-wider">Output</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <SelectField
            id="aspect-ratio"
            label="Aspect Ratio"
            value={settings.aspectRatio}
            onChange={(v) => set('aspectRatio', v as AspectRatio)}
            disabled={disabled}
            options={[
              { value: '9:16',  label: '9:16  Shorts / Reels' },
              { value: '16:9',  label: '16:9  YouTube' },
              { value: '1:1',   label: '1:1   Square' },
            ]}
          />
          <SelectField
            id="export-resolution"
            label="Resolution"
            value={settings.exportResolution}
            onChange={(v) => set('exportResolution', v as ExportResolution)}
            disabled={disabled}
            options={[
              { value: '720p',  label: '720p — Fast' },
              { value: '1080p', label: '1080p — Standard' },
              { value: '2K',    label: '2K — High' },
              { value: '4K',    label: '4K — Ultra HD' },
            ]}
          />
        </div>

        <RenderProfilePicker
          value={settings.renderProfile}
          onChange={(v) => set('renderProfile', v)}
          disabled={disabled}
        />

        {is4kHQZoom && (
          <InlineWarning message="4K + HQ + Zoom is very demanding." />
        )}
        {isHighResWarn && (
          <InlineWarning message={`${settings.exportResolution} resolution will increase render time.`} />
        )}
      </div>

      {/* ── GROUP 2: MOTION ─────────────────────────────────────────────── */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 border-b pb-1.5" style={{ borderColor: 'var(--color-surface-card-border)' }}>
          <span className="text-[10px] font-bold text-muted uppercase tracking-wider">Motion & Fit</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <SelectField
            id="fit-mode"
            label="Fit Mode"
            value={settings.fitMode}
            onChange={(v) => set('fitMode', v as FitMode)}
            disabled={disabled}
            options={[
              { value: 'cover',   label: 'Cover / Crop' },
              { value: 'contain', label: 'Contain / Fit' },
            ]}
          />
          <SelectField
            id="transition"
            label="Transition"
            value={settings.transition}
            onChange={(v) => set('transition', v as Transition)}
            disabled={disabled}
            options={[
              { value: 'none', label: 'None' },
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
              { value: 'none',         label: 'None' },
              { value: 'slow_zoom_in', label: 'Slow Zoom' },
            ]}
          />
        </div>
      </div>

      {/* ── GROUP 3: FILE ───────────────────────────────────────────────── */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 border-b pb-1.5" style={{ borderColor: 'var(--color-surface-card-border)' }}>
          <span className="text-[10px] font-bold text-muted uppercase tracking-wider">File</span>
        </div>

        <div className="space-y-1.5">
          <label htmlFor="output-name" className="form-label">Output Filename</label>
          <div className="flex items-center gap-2">
            <input
              id="output-name"
              type="text"
              value={settings.outputName}
              onChange={(e) => set('outputName', e.target.value)}
              placeholder="my_video"
              className="form-input flex-1"
              disabled={disabled}
              maxLength={80}
            />
            <span className="text-xs text-muted font-mono bg-black/20 px-2 py-1.5 rounded-md">
              _YYYYMMDD.mp4
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
