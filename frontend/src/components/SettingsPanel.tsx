// components/SettingsPanel.tsx – Project inspector panel (Batch 9A)

import React from 'react'
import { IconAlertTriangle } from './icons'
import type {
  GenerateSettings,
  AspectRatio,
  ExportResolution,
  FitMode,
  Transition,
  RenderProfile,
  StylePreset,
  MotionEffect,
  MotionIntensity,
  TransitionDuration,
  VisualEffect,
  EffectStrength,
} from '../types'

interface SettingsPanelProps {
  settings:  GenerateSettings
  onChange:  (s: GenerateSettings) => void
  disabled?: boolean
  audioDuration?: number | null
}

// ── Style preset configuration ───────────────────────────────────────────────

interface PresetConfig {
  motionEffect:       MotionEffect
  motionIntensity:    MotionIntensity
  transition:         Transition
  transitionDuration: TransitionDuration
  visualEffect:       VisualEffect
  effectStrength:     EffectStrength
}

const PRESET_MAP: Record<StylePreset, PresetConfig> = {
  clean_default: {
    motionEffect: 'slow_zoom_in', motionIntensity: 'medium',
    transition: 'fade', transitionDuration: '0.5',
    visualEffect: 'none', effectStrength: 'medium',
  },
  youtube_documentary: {
    motionEffect: 'ken_burns', motionIntensity: 'medium',
    transition: 'crossfade', transitionDuration: '0.8',
    visualEffect: 'cinematic', effectStrength: 'medium',
  },
  tiktok_reels: {
    motionEffect: 'dynamic_shorts', motionIntensity: 'high',
    transition: 'flash', transitionDuration: '0.2',
    visualEffect: 'high_contrast', effectStrength: 'medium',
  },
  cinematic_story: {
    motionEffect: 'ken_burns', motionIntensity: 'medium',
    transition: 'fade_black', transitionDuration: '0.8',
    visualEffect: 'cinematic', effectStrength: 'medium',
  },
  news_report: {
    motionEffect: 'pan_left', motionIntensity: 'low',
    transition: 'fade', transitionDuration: '0.5',
    visualEffect: 'clean_bright', effectStrength: 'low',
  },
  calm_educational: {
    motionEffect: 'slow_zoom_in', motionIntensity: 'low',
    transition: 'crossfade', transitionDuration: '0.8',
    visualEffect: 'clean_bright', effectStrength: 'low',
  },
  dramatic_shorts: {
    motionEffect: 'dynamic_shorts', motionIntensity: 'high',
    transition: 'zoom_in', transitionDuration: '0.2',
    visualEffect: 'high_contrast', effectStrength: 'high',
  },
}

const PRESET_DESCRIPTIONS: Record<StylePreset, string> = {
  clean_default: 'Balanced motion and clean export for general videos.',
  youtube_documentary: 'Smooth Ken Burns movement with cinematic color and soft transitions.',
  tiktok_reels: 'Fast, energetic motion and punchier visuals for short-form videos.',
  cinematic_story: 'Slow premium motion with cinematic color and soft dramatic transitions.',
  news_report: 'Clean bright visuals with low motion for report-style videos.',
  calm_educational: 'Gentle motion and clean visuals for lessons or explainer videos.',
  dramatic_shorts: 'Strong motion and high contrast for intense short-form storytelling.',
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
              className="relative flex flex-col items-start gap-0.5 rounded-lg px-2.5 py-2 text-left transition-all duration-100 focus:outline-none"
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

export default function SettingsPanel({ settings, onChange, disabled, audioDuration }: SettingsPanelProps) {
  const set = <K extends keyof GenerateSettings>(key: K, val: GenerateSettings[K]) =>
    onChange({ ...settings, [key]: val })

  // Apply a style preset — sets matching fields, does not lock them
  const applyPreset = (preset: StylePreset) => {
    const cfg = PRESET_MAP[preset]
    onChange({
      ...settings,
      stylePreset:        preset,
      motionEffect:       cfg.motionEffect,
      motionIntensity:    cfg.motionIntensity,
      transition:         cfg.transition,
      transitionDuration: cfg.transitionDuration,
      visualEffect:       cfg.visualEffect,
      effectStrength:     cfg.effectStrength,
      // Keep zoomEffect in sync for backward compat
      zoomEffect: cfg.motionEffect === 'slow_zoom_in' ? 'slow_zoom_in' : 'none',
    })
  }

  // Derived warning flags
  const is4K           = settings.exportResolution === '4K'
  const isHQ           = settings.renderProfile === 'high_quality'
  const isHeavyMotion  = ['ken_burns', 'subtle_random', 'dynamic_shorts'].includes(settings.motionEffect)
  const isLong         = audioDuration && audioDuration > 600
  const isVeryLong     = audioDuration && audioDuration > 1200

  return (
    <div className="space-y-5">

      {/* ── OUTPUT ──────────────────────────────────────────────────────── */}
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
        {is4K && isHQ && settings.motionEffect !== 'none' && (
          <Warn msg="4K High Quality with motion effects can be slow and CPU-heavy." />
        )}
        {isVeryLong && (
          <Warn msg="This is longer than the recommended tested range. Render time depends on your machine and selected effects." />
        )}
        <p className="text-[10px] leading-tight" style={{ color: 'var(--text-muted)' }}>
          <span className="font-semibold" style={{ color: 'var(--color-warning)' }}>Tip:</span>{' '}
          Use 720p Fast Preview to check timing before your final export.
        </p>
      </div>

      {/* ── MOTION & TRANSITIONS ────────────────────────────────────────── */}
      <div className="space-y-3">
        <SectionHead label="Motion & Transitions" />

        {/* Style Preset */}
        <div className="space-y-1">
          <label htmlFor="style-preset" className="form-label">Style Preset</label>
          <select
            id="style-preset"
            value={settings.stylePreset}
            onChange={e => applyPreset(e.target.value as StylePreset)}
            className="form-select"
            disabled={disabled}
          >
            <option value="clean_default">Clean Default</option>
            <option value="youtube_documentary">YouTube Documentary</option>
            <option value="tiktok_reels">TikTok / Reels Dynamic</option>
            <option value="cinematic_story">Cinematic Story</option>
            <option value="news_report">News / Report Style</option>
            <option value="calm_educational">Calm Educational</option>
            <option value="dramatic_shorts">Dramatic Shorts</option>
          </select>
          <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
            {PRESET_DESCRIPTIONS[settings.stylePreset]}
          </p>
        </div>

        {/* Motion Effect + Intensity */}
        <div className="grid grid-cols-2 gap-2">
          <Sel
            id="motion-effect" label="Motion Effect" value={settings.motionEffect}
            onChange={v => {
              const me = v as MotionEffect
              set('motionEffect', me)
              // keep legacy zoomEffect in sync
              onChange({
                ...settings,
                motionEffect: me,
                zoomEffect: me === 'slow_zoom_in' ? 'slow_zoom_in' : 'none',
              })
            }}
            disabled={disabled}
            options={[
              { value: 'none',           label: 'None' },
              { value: 'slow_zoom_in',   label: 'Slow Zoom In' },
              { value: 'slow_zoom_out',  label: 'Slow Zoom Out' },
              { value: 'ken_burns',      label: 'Ken Burns' },
              { value: 'pan_left',       label: 'Pan Left' },
              { value: 'pan_right',      label: 'Pan Right' },
              { value: 'pan_up',         label: 'Pan Up' },
              { value: 'pan_down',       label: 'Pan Down' },
              { value: 'subtle_random',  label: 'Subtle Random' },
              { value: 'dynamic_shorts', label: 'Dynamic Shorts' },
            ]}
          />
          <Sel
            id="motion-intensity" label="Intensity" value={settings.motionIntensity}
            onChange={v => set('motionIntensity', v as MotionIntensity)} disabled={disabled}
            options={[
              { value: 'low',    label: 'Low' },
              { value: 'medium', label: 'Medium' },
              { value: 'high',   label: 'High' },
            ]}
          />
        </div>

        {/* Transition + Duration */}
        <div className="grid grid-cols-2 gap-2">
          <Sel
            id="transition" label="Transition" value={settings.transition}
            onChange={v => set('transition', v as Transition)} disabled={disabled}
            options={[
              { value: 'none', label: 'None' },
              { value: 'fade', label: 'Fade' },
              { value: 'crossfade', label: 'Crossfade' },
              { value: 'fade_black', label: 'Fade to Black' },
              { value: 'fade_white', label: 'Fade to White' },
              { value: 'slide_left', label: 'Slide Left' },
              { value: 'slide_right', label: 'Slide Right' },
              { value: 'slide_up', label: 'Slide Up' },
              { value: 'slide_down', label: 'Slide Down' },
              { value: 'push_left', label: 'Push Left' },
              { value: 'push_right', label: 'Push Right' },
              { value: 'zoom_in', label: 'Zoom In' },
              { value: 'zoom_out', label: 'Zoom Out' },
              { value: 'blur_crossfade', label: 'Blur Crossfade' },
              { value: 'flash', label: 'Flash' },
            ]}
          />
          <Sel
            id="transition-duration" label="Duration" value={settings.transitionDuration}
            onChange={v => set('transitionDuration', v as TransitionDuration)} disabled={disabled}
            options={[
              { value: '0.2', label: '0.2s' },
              { value: '0.5', label: '0.5s' },
              { value: '0.8', label: '0.8s' },
              { value: '1.0', label: '1.0s' },
            ]}
          />
        </div>

        {/* Fit mode */}
        <Sel
          id="fit-mode" label="Fit Mode" value={settings.fitMode}
          onChange={v => set('fitMode', v as FitMode)} disabled={disabled}
          options={[
            { value: 'cover',   label: 'Cover (crop to fill)' },
            { value: 'contain', label: 'Contain (letterbox)' },
          ]}
        />

        {/* Performance warnings for heavy motion */}
        {isLong && isHeavyMotion && (
          <Warn msg="Long video with motion effects may take longer. For testing, use 720p Fast Preview first." />
        )}
        {settings.transition === 'blur_crossfade' && isLong && (
          <Warn msg="Blur transitions can increase render time for long videos." />
        )}
        {settings.motionEffect === 'dynamic_shorts' && settings.transition === 'flash' && (
          <Warn msg="Dynamic shorts settings create energetic output. Use Fast Preview first if testing." />
        )}
      </div>

      {/* ── VISUAL STYLE ────────────────────────────────────────────────── */}
      <div className="space-y-3">
        <SectionHead label="Visual Style" />
        <div className="grid grid-cols-2 gap-2">
          <Sel
            id="visual-effect" label="Visual Style" value={settings.visualEffect}
            onChange={v => set('visualEffect', v as VisualEffect)} disabled={disabled}
            options={[
              { value: 'none',           label: 'None' },
              { value: 'cinematic',      label: 'Cinematic' },
              { value: 'warm',           label: 'Warm' },
              { value: 'high_contrast',  label: 'High Contrast' },
              { value: 'black_and_white',label: 'Black & White' },
              { value: 'clean_bright',   label: 'Clean Bright' },
            ]}
          />
          <Sel
            id="effect-strength" label="Strength" value={settings.effectStrength}
            onChange={v => set('effectStrength', v as EffectStrength)} disabled={disabled}
            options={[
              { value: 'low',    label: 'Low' },
              { value: 'medium', label: 'Medium' },
              { value: 'high',   label: 'High' },
            ]}
          />
        </div>
        {settings.effectStrength === 'high' && settings.visualEffect !== 'none' && isLong && (
          <Warn msg="High visual effect strength may increase preprocessing time for long videos." />
        )}
      </div>

      {/* ── SELECTED STYLE SUMMARY ────────────────────────────────────── */}
      <div className="space-y-3">
        <SectionHead label="Selected Style Summary" />
        <div className="text-[11px] space-y-1 p-3 rounded-lg" style={{ background: 'var(--bg-input)', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)' }}>
          <div className="flex justify-between">
            <span style={{ color: 'var(--text-muted)' }}>Preset:</span>
            <span className="font-semibold">{settings.stylePreset.replace(/_/g, ' ')}</span>
          </div>
          <div className="flex justify-between">
            <span style={{ color: 'var(--text-muted)' }}>Motion:</span>
            <span>{settings.motionEffect.replace(/_/g, ' ')} <span style={{ opacity: 0.5 }}>/</span> {settings.motionIntensity}</span>
          </div>
          <div className="flex justify-between">
            <span style={{ color: 'var(--text-muted)' }}>Transition:</span>
            <span>{settings.transition.replace(/_/g, ' ')} <span style={{ opacity: 0.5 }}>/</span> {settings.transitionDuration}s</span>
          </div>
          <div className="flex justify-between">
            <span style={{ color: 'var(--text-muted)' }}>Visual:</span>
            <span>{settings.visualEffect.replace(/_/g, ' ')} <span style={{ opacity: 0.5 }}>/</span> {settings.effectStrength}</span>
          </div>
        </div>
      </div>

      {/* ── FILE ────────────────────────────────────────────────────────── */}
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
