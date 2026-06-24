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

// ── Main component ───────────────────────────────────────────────────────────

type EnhancementSection = 'music' | 'outro' | 'watermark' | null

export default function EnhancementsPanel({
  settings,
  onSettingsChange,
  outroFile,
  onOutroChange,
  bgMusicFile,
  onBgMusicChange,
  disabled,
}: EnhancementsPanelProps) {
  const [expandedSection, setExpandedSection] = useState<EnhancementSection>(null)

  const toggleSection = (section: EnhancementSection) => {
    setExpandedSection(prev => prev === section ? null : section)
  }

  const set = <K extends keyof GenerateSettings>(key: K, val: GenerateSettings[K]) =>
    onSettingsChange({ ...settings, [key]: val })

  const musicActive    = bgMusicFile !== null && settings.enableBgMusic && !disabled
  const watermarkActive = settings.enableWatermark && settings.watermarkText.trim() !== '' && !disabled

  return (
    <div className="space-y-4">
      {/* ── Background Music Accordion ───────────────────────────────────── */}
      <div className="card-glow overflow-hidden">
        <button
          id="music-toggle-btn"
          onClick={() => toggleSection('music')}
          className="w-full flex items-center justify-between gap-4 p-4 text-left transition-colors"
          style={{ backgroundColor: expandedSection === 'music' ? 'rgba(99,102,241,0.04)' : 'transparent' }}
          disabled={disabled}
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center text-brand-400 shrink-0"
              style={{ backgroundColor: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.2)' }}>
              <IconMusic size={14} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold text-primary leading-none">Background Music</h3>
                {bgMusicFile && (
                  <span className="w-1.5 h-1.5 rounded-full bg-brand-400"></span>
                )}
              </div>
              <p className="text-[11px] text-muted mt-1 leading-none">Low-volume music mixed behind main audio</p>
            </div>
          </div>
          <span className={`text-muted transition-transform duration-200 text-sm shrink-0 ${expandedSection === 'music' ? 'rotate-180' : ''}`}>▼</span>
        </button>

        {expandedSection === 'music' && (
          <div className="px-4 pb-5 pt-2 space-y-5 animate-fade-in border-t border-white/5">
            <FileDropZone
              id="bg-music-upload"
              label="Music File"
              description="MP3, WAV, M4A, AAC"
              accept=".mp3,.wav,.m4a,.aac,audio/*"
              icon={<IconMusic size={16} />}
              file={bgMusicFile}
              onChange={onBgMusicChange}
              disabled={disabled}
            />

            <div className="space-y-4">
              <Toggle
                id="enable-bg-music-toggle"
                checked={settings.enableBgMusic}
                onChange={(v) => set('enableBgMusic', v)}
                disabled={bgMusicFile === null || disabled}
                label="Enable Background Music"
              />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <PercentSlider
                  id="music-volume-slider"
                  label="Volume"
                  value={settings.musicVolume}
                  onChange={(v) => set('musicVolume', v)}
                  disabled={!musicActive}
                  hint="Keep at 10-15% for voice clarity"
                />
                <div className="mt-1">
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
        )}
      </div>

      {/* ── Outro Video Accordion ────────────────────────────────────────── */}
      <div className="card-glow overflow-hidden">
        <button
          id="outro-toggle-btn"
          onClick={() => toggleSection('outro')}
          className="w-full flex items-center justify-between gap-4 p-4 text-left transition-colors"
          style={{ backgroundColor: expandedSection === 'outro' ? 'rgba(16,185,129,0.04)' : 'transparent' }}
          disabled={disabled}
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center text-emerald-400 shrink-0"
              style={{ backgroundColor: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)' }}>
              <IconVideo size={14} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold text-primary leading-none">Outro Video</h3>
                {outroFile && (
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                )}
              </div>
              <p className="text-[11px] text-muted mt-1 leading-none">Appended after the main video</p>
            </div>
          </div>
          <span className={`text-muted transition-transform duration-200 text-sm shrink-0 ${expandedSection === 'outro' ? 'rotate-180' : ''}`}>▼</span>
        </button>

        {expandedSection === 'outro' && (
          <div className="px-4 pb-5 pt-2 space-y-4 animate-fade-in border-t border-white/5">
            <FileDropZone
              id="outro-upload"
              label="Outro File"
              description="MP4, MOV, WEBM"
              accept=".mp4,.mov,.webm,video/mp4,video/quicktime,video/webm"
              icon={<IconVideo size={16} />}
              file={outroFile}
              onChange={onOutroChange}
              disabled={disabled}
            />
            <InfoTip color="emerald">Automatically resized to match your resolution.</InfoTip>
          </div>
        )}
      </div>

      {/* ── Watermark Accordion ──────────────────────────────────────────── */}
      <div className="card-glow overflow-hidden">
        <button
          id="watermark-toggle-btn"
          onClick={() => toggleSection('watermark')}
          className="w-full flex items-center justify-between gap-4 p-4 text-left transition-colors"
          style={{ backgroundColor: expandedSection === 'watermark' ? 'rgba(245,158,11,0.04)' : 'transparent' }}
          disabled={disabled}
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center text-amber-400 shrink-0"
              style={{ backgroundColor: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.2)' }}>
              <IconType size={14} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold text-primary leading-none">Watermark</h3>
                {(settings.enableWatermark && settings.watermarkText.trim()) && (
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
                )}
              </div>
              <p className="text-[11px] text-muted mt-1 leading-none">Subtle text overlay</p>
            </div>
          </div>
          <span className={`text-muted transition-transform duration-200 text-sm shrink-0 ${expandedSection === 'watermark' ? 'rotate-180' : ''}`}>▼</span>
        </button>

        {expandedSection === 'watermark' && (
          <div className="px-4 pb-5 pt-2 space-y-5 animate-fade-in border-t border-white/5">
            <div className="space-y-1.5">
              <label htmlFor="watermark-text" className="form-label">Watermark Text</label>
              <input
                id="watermark-text"
                type="text"
                value={settings.watermarkText}
                onChange={(e) => set('watermarkText', e.target.value.slice(0, 60))}
                placeholder="@YourChannel, Atomis Labs"
                className="form-input"
                disabled={disabled}
                maxLength={60}
              />
            </div>

            <Toggle
              id="enable-watermark-toggle"
              checked={settings.enableWatermark}
              onChange={(v) => set('enableWatermark', v)}
              disabled={settings.watermarkText.trim() === '' || disabled}
              label="Enable Watermark"
            />

            <div className={`space-y-4 ${!watermarkActive ? 'opacity-50 pointer-events-none' : ''}`}>
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
                  <div className="space-y-1.5">
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
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label htmlFor="watermark-x" className="form-label">X Position</label>
                      <input
                        id="watermark-x"
                        type="number"
                        min={0}
                        value={settings.watermarkX}
                        onChange={(e) => set('watermarkX', Math.max(0, parseInt(e.target.value) || 0))}
                        className="form-input"
                        disabled={!watermarkActive}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label htmlFor="watermark-y" className="form-label">Y Position</label>
                      <input
                        id="watermark-y"
                        type="number"
                        min={0}
                        value={settings.watermarkY}
                        onChange={(e) => set('watermarkY', Math.max(0, parseInt(e.target.value) || 0))}
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
                <PxSlider
                  id="watermark-margin-slider"
                  label="Edge Margin"
                  value={settings.watermarkMargin}
                  min={10}
                  max={100}
                  onChange={(v) => set('watermarkMargin', v)}
                  disabled={!watermarkActive}
                />
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
