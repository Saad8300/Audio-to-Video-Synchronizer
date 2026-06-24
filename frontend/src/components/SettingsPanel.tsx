// components/SettingsPanel.tsx – Video generation settings

import React from 'react'
import { IconSettings } from './icons'
import type { GenerateSettings, VideoFormat, FitMode, Transition, ZoomEffect } from '../types'

interface SettingsPanelProps {
  settings: GenerateSettings
  onChange: (s: GenerateSettings) => void
  disabled?: boolean
}

interface SelectFieldProps {
  id: string
  label: string
  value: string
  options: { value: string; label: string }[]
  onChange: (v: string) => void
  disabled?: boolean
}

function SelectField({ id, label, value, options, onChange, disabled }: SelectFieldProps) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="form-label">
        {label}
      </label>
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="form-select"
        disabled={disabled}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  )
}

export default function SettingsPanel({ settings, onChange, disabled }: SettingsPanelProps) {
  const set = <K extends keyof GenerateSettings>(key: K, val: GenerateSettings[K]) =>
    onChange({ ...settings, [key]: val })

  return (
    <div className="card-glow p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg bg-brand-500/10 border border-brand-500/20 flex items-center justify-center text-brand-400">
          <IconSettings size={18} />
        </div>
        <div>
          <h2 className="text-base font-semibold text-slate-100">Settings</h2>
          <p className="text-xs text-slate-500">Configure output format and effects</p>
        </div>
      </div>

      <div className="h-px bg-slate-700/50" />

      {/* Grid of settings */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <SelectField
          id="video-format"
          label="Video Format"
          value={settings.videoFormat}
          onChange={(v) => set('videoFormat', v as VideoFormat)}
          disabled={disabled}
          options={[
            { value: '16:9', label: '16:9 YouTube (1920×1080)' },
            { value: '9:16', label: '9:16 Shorts / Reels / TikTok (1080×1920)' },
            { value: '1:1', label: '1:1 Square (1080×1080)' },
          ]}
        />

        <SelectField
          id="fit-mode"
          label="Image Fit Mode"
          value={settings.fitMode}
          onChange={(v) => set('fitMode', v as FitMode)}
          disabled={disabled}
          options={[
            { value: 'cover', label: 'Cover / Crop (fill screen)' },
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
            { value: 'none', label: 'None (static)' },
            { value: 'slow_zoom_in', label: 'Slow Zoom In (Ken Burns)' },
          ]}
        />
      </div>

      {/* Output name */}
      <div className="space-y-1.5">
        <label htmlFor="output-name" className="form-label">
          Output Filename
        </label>
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
        <p className="text-xs text-slate-500">
          Timestamp will be appended automatically. E.g.{' '}
          <span className="text-slate-400 font-mono">
            {settings.outputName || 'video'}_20240101_120000.mp4
          </span>
        </p>
      </div>
    </div>
  )
}
