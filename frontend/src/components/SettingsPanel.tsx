// components/SettingsPanel.tsx – Project inspector panel

import React from 'react'
import { IconAlertTriangle } from './icons'
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

// ── Reusable select ─────────────────────────────────────────────────────────

function Sel({
  id, label, value, options, onChange, disabled,
}: {
  id: string; label: string; value: string;
  options: { value: string; label: string }[];
  onChange: (v: string) => void; disabled?: boolean;
}) {
  return (
    <div className="space-y-1">
      <label htmlFor={id} className="form-label">{label}</label>
      <select id={id} value={value} onChange={e => onChange(e.target.value)} className="form-select" disabled={disabled}>
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  )
}

// ── Render Profile picker ───────────────────────────────────────────────────

const PROFILES: { value: RenderProfile; label: string; desc: string; badge?: string }[] = [
  { value: 'fast_preview', label: 'Preview',  desc: '24fps · ultrafast'  },
  { value: 'balanced',     label: 'Balanced', desc: '30fps · medium', badge: '★' },
  { value: 'high_quality', label: 'HQ',       desc: '30fps · slow'   },
]

function ProfilePicker({ value, onChange, disabled }: { value: RenderProfile; onChange: (v: RenderProfile) => void; disabled?: boolean }) {
  return (
    <div className="space-y-1">
      <label className="form-label">Render Profile</label>
      <div className="grid grid-cols-3 gap-1.5">
        {PROFILES.map(p => {
          const active = value === p.value
          return (
            <button
              key={p.value}
              id={`render-profile-${p.value}`}
              type="button"
              disabled={disabled}
              onClick={() => !disabled && onChange(p.value)}
              className="relative flex flex-col items-start gap-0.5 rounded-lg px-2.5 py-2 text-left transition-all duration-100 focus:outline-none focus:ring-2 focus:ring-brand-500/40"
              style={{
                background: active ? 'var(--accent-subtle)' : 'var(--bg-input)',
                border: `1px solid ${active ? 'var(--accent-border)' : 'var(--border-input)'}`,
                opacity: disabled ? 0.5 : 1,
                cursor: disabled ? 'not-allowed' : 'pointer',
              }}
              aria-pressed={active}
            >
              {p.badge && (
                <span className="absolute top-1 right-1.5 text-[9px] font-bold" style={{ color: 'var(--accent-primary)' }}>{p.badge}</span>
              )}
              <span className="text-[11px] font-semibold" style={{ color: active ? 'var(--accent-primary)' : 'var(--text-primary)' }}>{p.label}</span>
              <span className="text-[9px] leading-tight" style={{ color: 'var(--text-muted)' }}>{p.desc}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ── Section header ──────────────────────────────────────────────────────────

function SectionHead({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-2 pt-1">
      <span className="section-label">{label}</span>
      <div className="flex-1 h-px" style={{ background: 'var(--border-subtle)' }} />
    </div>
  )
}

// ── Inline warning ──────────────────────────────────────────────────────────

function Warn({ msg }: { msg: string }) {
  return (
    <div className="alert-warning animate-fade-in">
      <IconAlertTriangle size={12} className="shrink-0 mt-0.5" />
      <span className="leading-relaxed">{msg}</span>
    </div>
  )
}

// ── Main component ───────────────────────────────────────────────────────────

export default function SettingsPanel({ settings, onChange, disabled }: SettingsPanelProps) {
  const set = <K extends keyof GenerateSettings>(key: K, val: GenerateSettings[K]) =>
    onChange({ ...settings, [key]: val })

  const isHighRes   = settings.exportResolution === '2K' || settings.exportResolution === '4K'
  const is4kHQZoom  = settings.exportResolution === '4K' && settings.renderProfile === 'high_quality' && settings.zoomEffect === 'slow_zoom_in'
  const isSlowZoom  = settings.zoomEffect === 'slow_zoom_in'

  return (
    <div className="space-y-5">

      {/* OUTPUT */}
      <div className="space-y-3">
        <SectionHead label="Output" />
        <div className="grid grid-cols-2 gap-2">
          <Sel
            id="aspect-ratio" label="Aspect Ratio" value={settings.aspectRatio}
            onChange={v => set('aspectRatio', v as AspectRatio)} disabled={disabled}
            options={[
              { value: '9:16', label: '9:16 — Shorts' },
              { value: '16:9', label: '16:9 — YouTube' },
              { value: '1:1',  label: '1:1  — Square' },
            ]}
          />
          <Sel
            id="export-resolution" label="Resolution" value={settings.exportResolution}
            onChange={v => set('exportResolution', v as ExportResolution)} disabled={disabled}
            options={[
              { value: '720p',  label: '720p' },
              { value: '1080p', label: '1080p' },
              { value: '2K',    label: '2K' },
              { value: '4K',    label: '4K' },
            ]}
          />
        </div>
        <ProfilePicker value={settings.renderProfile} onChange={v => set('renderProfile', v)} disabled={disabled} />
        {is4kHQZoom && <Warn msg="4K + HQ + Slow Zoom is very demanding — may take a long time." />}
        {!is4kHQZoom && isHighRes && <Warn msg={`${settings.exportResolution} will increase render time.`} />}
        {!is4kHQZoom && isSlowZoom && !isHighRes && <Warn msg="Slow Zoom In adds render time for each clip." />}
        <p className="text-[10px] leading-tight" style={{ color: 'var(--text-muted)' }}>
          <span className="font-semibold" style={{ color: 'var(--color-warning)' }}>Tip:</span>{' '}
          Use 720p Fast Preview to check timing before your final export.
        </p>
      </div>

      {/* MOTION & FIT */}
      <div className="space-y-3">
        <SectionHead label="Motion & Fit" />
        <div className="grid grid-cols-3 gap-2">
          <Sel
            id="fit-mode" label="Fit Mode" value={settings.fitMode}
            onChange={v => set('fitMode', v as FitMode)} disabled={disabled}
            options={[
              { value: 'cover',   label: 'Cover' },
              { value: 'contain', label: 'Contain' },
            ]}
          />
          <Sel
            id="transition" label="Transition" value={settings.transition}
            onChange={v => set('transition', v as Transition)} disabled={disabled}
            options={[
              { value: 'none', label: 'None' },
              { value: 'fade', label: 'Fade' },
            ]}
          />
          <Sel
            id="zoom-effect" label="Zoom" value={settings.zoomEffect}
            onChange={v => set('zoomEffect', v as ZoomEffect)} disabled={disabled}
            options={[
              { value: 'none',         label: 'None' },
              { value: 'slow_zoom_in', label: 'Slow In' },
            ]}
          />
        </div>
      </div>

      {/* FILE */}
      <div className="space-y-3">
        <SectionHead label="Output File" />
        <div className="space-y-1">
          <label htmlFor="output-name" className="form-label">Filename</label>
          <div className="flex items-center gap-2">
            <input
              id="output-name"
              type="text"
              value={settings.outputName}
              onChange={e => set('outputName', e.target.value)}
              placeholder="my_video"
              className="form-input flex-1"
              disabled={disabled}
              maxLength={80}
            />
            <span className="text-[10px] font-mono shrink-0 px-2 py-1.5 rounded-md" style={{ background: 'var(--bg-input)', border: '1px solid var(--border-subtle)', color: 'var(--text-muted)' }}>
              _YYYYMMDD.mp4
            </span>
          </div>
        </div>
      </div>

    </div>
  )
}
