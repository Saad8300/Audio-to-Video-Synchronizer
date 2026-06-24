// components/EnhancementsPanel.tsx
// "Optional Enhancements" modules — Intro, Outro, Background Music, and Watermark

import React from 'react'
import FileDropZone from './FileDropZone'
import {
  IconMusic,
  IconVideo,
  IconType,
  IconInfo,
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
        {description && <p className="text-[10px] text-muted mt-0.5">{description}</p>}
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
          className={`text-[11px] font-semibold tabular-nums px-1.5 py-0.5 rounded ${disabled ? 'opacity-40' : 'text-brand-300'}`}
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
        <p className="text-[10px] text-muted leading-tight mt-1">{hint}</p>
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
          className={`text-[11px] font-semibold tabular-nums px-1.5 py-0.5 rounded ${disabled ? 'opacity-40' : 'text-brand-300'}`}
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
      className="flex items-start gap-2 rounded-lg px-3 py-2 text-[11px]"
      style={{ backgroundColor: s.bg, border: `1px solid ${s.border}` }}
    >
      <IconInfo size={12} className={`${s.icon} shrink-0 mt-0.5`} />
      <span className="text-muted leading-relaxed">{children}</span>
    </div>
  )
}

// ── Main component ───────────────────────────────────────────────────────────

export default function EnhancementsPanel({
  settings,
  onSettingsChange,
  introFile,
  onIntroChange,
  outroFile,
  onOutroChange,
  bgMusicFile,
  onBgMusicChange,
  disabled,
}: EnhancementsPanelProps) {

  const set = <K extends keyof GenerateSettings>(key: K, val: GenerateSettings[K]) =>
    onSettingsChange({ ...settings, [key]: val })

  const musicActive    = bgMusicFile !== null && !disabled
  const watermarkActive = settings.watermarkText.trim() !== '' && !disabled

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 pl-1">
        <h2 className="text-sm font-semibold text-primary uppercase tracking-widest opacity-80">Optional Enhancements</h2>
      </div>

      {/* ── MODULE: MEDIA (Intro, Outro, Music) ── */}
      <div className="card-glow p-5 space-y-5">
        <div className="flex items-center gap-2 border-b pb-2" style={{ borderColor: 'var(--color-surface-card-border)' }}>
          <IconVideo size={14} className="text-emerald-400" />
          <span className="text-xs font-bold text-primary tracking-wide">Additional Media</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FileDropZone
            id="intro-upload"
            label="Intro Video"
            description="MP4, MOV, WEBM"
            accept=".mp4,.mov,.webm,video/mp4,video/quicktime,video/webm"
            icon={<IconVideo size={16} />}
            file={introFile}
            onChange={onIntroChange}
            disabled={disabled}
          />
          <FileDropZone
            id="outro-upload"
            label="Outro Video"
            description="MP4, MOV, WEBM"
            accept=".mp4,.mov,.webm,video/mp4,video/quicktime,video/webm"
            icon={<IconVideo size={16} />}
            file={outroFile}
            onChange={onOutroChange}
            disabled={disabled}
          />
        </div>

        {(introFile || outroFile) && (
           <InfoTip color="emerald">Intro and outro clips are automatically resized to match your export resolution.</InfoTip>
        )}

        <div className="pt-2">
          <FileDropZone
            id="bg-music-upload"
            label="Background Music"
            description="MP3, WAV, M4A, AAC"
            accept=".mp3,.wav,.m4a,.aac,audio/*"
            icon={<IconMusic size={16} />}
            file={bgMusicFile}
            onChange={onBgMusicChange}
            disabled={disabled}
          />
        </div>

        <div className={`space-y-3 pt-1 transition-opacity ${!musicActive ? 'opacity-50 pointer-events-none' : ''}`}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-end">
            <PercentSlider
              id="music-volume-slider"
              label="Music Volume"
              value={settings.musicVolume}
              onChange={(v) => set('musicVolume', v)}
              disabled={!musicActive}
              hint="Keep at 10-15% for voice clarity"
            />
            <div className="pb-1 px-1">
              <Toggle
                id="music-fade-toggle"
                checked={settings.musicFade}
                onChange={(v) => set('musicFade', v)}
                disabled={!musicActive}
                label="Fade In / Out"
              />
            </div>
          </div>
        </div>
      </div>

      {/* ── MODULE: WATERMARK ── */}
      <div className="card-glow p-5 space-y-5">
        <div className="flex items-center gap-2 border-b pb-2" style={{ borderColor: 'var(--color-surface-card-border)' }}>
          <IconType size={14} className="text-amber-400" />
          <span className="text-xs font-bold text-primary tracking-wide">Watermark</span>
        </div>

        <div className="space-y-1.5">
          <label htmlFor="watermark-text" className="form-label">Watermark Text (Leave empty to disable)</label>
          <input
            id="watermark-text"
            type="text"
            value={settings.watermarkText}
            onChange={(e) => set('watermarkText', e.target.value.slice(0, 60))}
            placeholder="@YourChannel, Automist Labs"
            className="form-input"
            disabled={disabled}
            maxLength={60}
          />
        </div>

        <div className={`space-y-5 transition-opacity ${!watermarkActive ? 'opacity-50 pointer-events-none' : ''}`}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label htmlFor="watermark-position-mode" className="form-label">Position Mode</label>
              <select
                id="watermark-position-mode"
                value={settings.watermarkPositionMode}
                onChange={(e) => set('watermarkPositionMode', e.target.value as any)}
                className="form-select"
                disabled={!watermarkActive}
              >
                <option value="preset">Preset</option>
                <option value="custom">Custom X/Y</option>
              </select>
            </div>

            {settings.watermarkPositionMode === 'preset' ? (
              <div className="space-y-1.5 animate-fade-in">
                <label htmlFor="watermark-position" className="form-label">Position</label>
                <select
                  id="watermark-position"
                  value={settings.watermarkPosition}
                  onChange={(e) => set('watermarkPosition', e.target.value as any)}
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
            ) : (
              <div className="grid grid-cols-2 gap-3 animate-fade-in">
                <div className="space-y-1.5">
                  <label htmlFor="watermark-x" className="form-label">X Position</label>
                  <input
                    id="watermark-x"
                    type="number"
                    value={settings.watermarkX}
                    onChange={(e) => set('watermarkX', parseInt(e.target.value) || 0)}
                    className="form-input"
                    disabled={!watermarkActive}
                  />
                </div>
                <div className="space-y-1.5">
                  <label htmlFor="watermark-y" className="form-label">Y Position</label>
                  <input
                    id="watermark-y"
                    type="number"
                    value={settings.watermarkY}
                    onChange={(e) => set('watermarkY', parseInt(e.target.value) || 0)}
                    className="form-input"
                    disabled={!watermarkActive}
                  />
                </div>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <PercentSlider
              id="watermark-size-slider"
              label="Size"
              value={settings.watermarkSize}
              min={1}
              onChange={(v) => set('watermarkSize', v)}
              disabled={!watermarkActive}
            />
            <PercentSlider
              id="watermark-opacity-slider"
              label="Opacity"
              value={settings.watermarkOpacity}
              min={10}
              onChange={(v) => set('watermarkOpacity', v)}
              disabled={!watermarkActive}
            />
          </div>

          {settings.watermarkPositionMode === 'preset' && (
            <div className="animate-fade-in">
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
          )}
        </div>
      </div>
    </div>
  )
}
