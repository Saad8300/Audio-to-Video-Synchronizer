import React, { useState, useEffect } from 'react'
import {
  IconVideo,
  IconImage,
  IconMusic,
  IconFileText,
  IconSparkles,
  IconZap,
  IconLayers,
  IconGrid,
  IconHistory,
  IconSettings,
  IconFilm,
  IconCheck,
  IconAlertCircle,
  IconArrowRight
} from './icons'

function IconMic({ size = 24 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2a3 3 0 0 1 3 3v7a3 3 0 0 1-6 0V5a3 3 0 0 1 3-3Z"/>
      <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
      <line x1="12" x2="12" y1="19" y2="22"/>
    </svg>
  )
}

function IconCpu({ size = 24 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="4" width="16" height="16" rx="2"/><rect x="9" y="9" width="6" height="6"/>
      <line x1="9" y1="1" x2="9" y2="4"/><line x1="15" y1="1" x2="15" y2="4"/>
      <line x1="9" y1="20" x2="9" y2="23"/><line x1="15" y1="20" x2="15" y2="23"/>
      <line x1="20" y1="9" x2="23" y2="9"/><line x1="20" y1="14" x2="23" y2="14"/>
      <line x1="1" y1="9" x2="4" y2="9"/><line x1="1" y1="14" x2="4" y2="14"/>
    </svg>
  )
}

function IconBook({ size = 24 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
    </svg>
  )
}

interface Props {
  onSelectTool: (toolId: string) => void
  backendStatusOk: boolean | null
}

const ACTIVE_TOOLS = [
  { id: 'image', icon: <IconLayers size={22} />, title: 'Image Timeline', desc: 'Create videos from images, main audio, and timestamp CSV files.', accentColor: '#0ea5e9' },
  { id: 'video', icon: <IconFilm size={22} />, title: 'Video Timeline', desc: 'Create videos from reusable video clips and timeline CSV files.', accentColor: '#8b5cf6' },
  { id: 'media', icon: <IconGrid size={22} />, title: 'Media Timeline', desc: 'Mix images, videos, and text-only rows in one flexible media timeline.', accentColor: '#3b82f6' },
  { id: 'audio_merger', icon: <IconMusic size={22} />, title: 'Audio Merger', desc: 'Combine multiple audio files or audio parts ZIP into one track.', accentColor: '#10b981' },
  { id: 'batch_video', icon: <IconFilm size={22} />, title: 'Batch Video Generator', desc: 'Queue multiple generation jobs and run them one by one locally.', accentColor: '#4ade80' },
  { id: 'history', icon: <IconHistory size={22} />, title: 'Output History', desc: 'View recent generated videos and open output files quickly.', accentColor: '#f59e0b' },
  { id: 'settings', icon: <IconSettings size={22} />, title: 'Settings', desc: 'Manage app preferences, export defaults, and saved presets.', accentColor: '#64748b' },
]

const COMING_SOON_TOOLS = [
  { title: 'Text to Speech', desc: 'Generate narration audio from text scripts.', icon: <IconMic size={20} />, accentColor: '#a78bfa' },
  { title: 'Audio Mixer', desc: 'Mix voice audio with background music and export a final audio track.', icon: <IconCpu size={20} />, accentColor: '#f472b6' },
  { title: 'CSV Helper', desc: 'Validate, preview, and fix timeline CSV files before generation.', icon: <IconFileText size={20} />, accentColor: '#38bdf8' },
  { title: 'Media Converter', desc: 'Prepare images, videos, and audio for timeline generation.', icon: <IconImage size={20} />, accentColor: '#fb923c' },
]

export default function StudioHome({ onSelectTool, backendStatusOk }: Props) {
  
  return (
    <div className="min-h-screen flex flex-col relative overflow-hidden bg-[var(--bg-default)] text-[var(--text-primary)]">
      
      {/* ── Background Glow ── */}
      <div className="absolute top-0 left-0 right-0 h-[600px] opacity-20 pointer-events-none"
           style={{
             background: 'radial-gradient(ellipse at 50% 0%, var(--accent-primary) 0%, transparent 60%)',
             filter: 'blur(80px)'
           }}
      />

      <main className="flex-1 flex flex-col items-center w-full max-w-7xl mx-auto px-6 py-12 lg:py-20 relative z-10 space-y-24">
        
        {/* ── 1. Hero Section ── */}
        <section className="text-center w-full max-w-3xl mx-auto animate-fade-in-up">
          <div className="flex flex-wrap items-center justify-center gap-2 mb-6">
            <Badge text="Runs locally" />
            <Badge text="No cloud upload" />
            <Badge text="4K export ready" />
            {backendStatusOk === true && <Badge text="Backend live" color="#10b981" pulse />}
          </div>
          
          <h1 className="text-4xl md:text-6xl font-black tracking-tight mb-5 leading-tight">
            <span className="text-gradient">SyncFrame Studio</span>
          </h1>
          <h2 className="text-xl md:text-2xl font-bold mb-4" style={{ color: 'var(--text-primary)' }}>
            Create synchronized videos faster
          </h2>
          <p className="text-sm md:text-base font-medium mb-10 max-w-2xl mx-auto" style={{ color: 'var(--text-secondary)' }}>
            A local video automation studio for building videos from audio, images, video clips, media timelines, and CSV timing files.
          </p>

          <div className="flex flex-col sm:flex-row items-center gap-4 justify-center">
            <button
              onClick={() => onSelectTool('image')}
              className="w-full sm:w-auto px-8 py-3.5 rounded-xl font-bold transition-all hover:scale-105 active:scale-95 flex items-center justify-center gap-2"
              style={{ background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)', color: '#fff', boxShadow: '0 8px 24px rgba(99,102,241,0.3)' }}
            >
              Start Image Timeline <IconZap size={18} />
            </button>
            <button
              onClick={() => onSelectTool('media')}
              className="w-full sm:w-auto px-8 py-3.5 rounded-xl font-bold transition-all hover:bg-black/5 dark:hover:bg-white/5 active:scale-95 flex items-center justify-center gap-2"
              style={{ background: 'var(--bg-elevated)', color: 'var(--text-primary)', border: '1px solid var(--border-default)' }}
            >
              Open Media Timeline
            </button>
          </div>
        </section>

        {/* ── 2. Tool Cards Grid ── */}
        <section className="w-full animate-fade-in-up" style={{ animationDelay: '100ms' }}>
          <SectionHeader title="Active Tools" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mb-12">
            {ACTIVE_TOOLS.map(tool => (
              <ToolCard key={tool.id} title={tool.title} desc={tool.desc} icon={tool.icon} color={tool.accentColor}
                        status="Ready" onClick={() => onSelectTool(tool.id)} />
            ))}
          </div>

          <SectionHeader title="Coming Soon" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {COMING_SOON_TOOLS.map(tool => (
              <ToolCard key={tool.title} title={tool.title} desc={tool.desc} icon={tool.icon} color={tool.accentColor}
                        status="Coming Soon" />
            ))}
          </div>
        </section>

        {/* ── 3. Quick Workflow Section ── */}
        <section className="w-full max-w-4xl mx-auto text-center animate-fade-in-up" style={{ animationDelay: '200ms' }}>
          <h3 className="text-xl font-black mb-8" style={{ color: 'var(--text-primary)' }}>Recommended workflow</h3>
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 relative">
            <div className="hidden md:block absolute top-1/2 left-8 right-8 h-0.5 -translate-y-1/2" style={{ background: 'var(--border-subtle)' }} />
            
            {[
              { num: 1, label: 'Prepare audio' },
              { num: 2, label: 'Prepare ZIP' },
              { num: 3, label: 'Prepare CSV' },
              { num: 4, label: 'Generate video' },
              { num: 5, label: 'Review output' },
            ].map((step, idx) => (
              <div key={idx} className="relative z-10 flex flex-col items-center bg-[var(--bg-default)] px-4 py-2">
                <div className="w-10 h-10 rounded-full flex items-center justify-center font-black text-sm mb-3"
                     style={{ background: 'var(--bg-input)', border: '1px solid var(--border-default)', color: 'var(--text-primary)' }}>
                  {step.num}
                </div>
                <div className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--text-secondary)' }}>
                  {step.label}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── 4. System Status Section ── */}
        <section className="w-full animate-fade-in-up" style={{ animationDelay: '300ms' }}>
          <div className="card p-6 flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ background: 'rgba(16,185,129,0.1)', color: '#10b981' }}>
                <IconCheck size={24} />
              </div>
              <div>
                <h4 className="font-bold text-sm mb-1" style={{ color: 'var(--text-primary)' }}>System Status</h4>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>All local services are operational.</p>
              </div>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-4">
              <StatusItem label="Frontend running" ok={true} />
              <StatusItem label="Local mode" ok={true} />
              <StatusItem label="FFmpeg required" ok={true} />
              <StatusItem label="Backend live" ok={backendStatusOk === true} 
                          warning={backendStatusOk === false} loading={backendStatusOk === null} />
            </div>
          </div>
        </section>
        
      </main>
    </div>
  )
}

// ── Components ─────────────────────────────────────────────────────────────

function Badge({ text, color = 'var(--text-secondary)', pulse = false }: { text: string, color?: string, pulse?: boolean }) {
  return (
    <span className="flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold tracking-widest uppercase"
          style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-default)', color }}>
      {pulse && (
        <span className="relative flex h-1.5 w-1.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" style={{ background: color }} />
          <span className="relative inline-flex rounded-full h-1.5 w-1.5" style={{ background: color }} />
        </span>
      )}
      {text}
    </span>
  )
}

function SectionHeader({ title }: { title: string }) {
  return (
    <div className="flex items-center gap-3 mb-6">
      <span className="text-xs font-black uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>{title}</span>
      <div className="flex-1 h-px" style={{ background: 'var(--border-subtle)' }} />
    </div>
  )
}

function ToolCard({ title, desc, icon, color, status, onClick }: { title: string, desc: string, icon: React.ReactNode, color: string, status: string, onClick?: () => void }) {
  const [hovered, setHovered] = useState(false)
  const isReady = status === 'Ready'

  return (
    <div
      onClick={isReady ? onClick : undefined}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="group flex flex-col gap-4 text-left rounded-2xl p-6 transition-all duration-300 relative overflow-hidden"
      style={{
        cursor: isReady ? 'pointer' : 'default',
        background: hovered && isReady ? `linear-gradient(145deg, ${color}12, var(--bg-card-hover))` : 'var(--bg-card)',
        border: hovered && isReady ? `1px solid ${color}40` : '1px solid var(--border-default)',
        boxShadow: hovered && isReady ? `0 8px 32px ${color}20, 0 2px 8px rgba(0,0,0,0.1)` : 'var(--shadow-card)',
        transform: hovered && isReady ? 'translateY(-2px)' : 'translateY(0)',
        opacity: isReady ? 1 : 0.6,
      }}
    >
      <div className="flex items-start justify-between w-full">
        <div
          className="w-12 h-12 rounded-xl flex items-center justify-center transition-transform duration-300"
          style={{
            background: `${color}15`, border: `1px solid ${color}30`, color: color,
            transform: hovered && isReady ? 'scale(1.08)' : 'scale(1)',
          }}
        >
          {icon}
        </div>
        <span className="text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-md"
              style={{ background: isReady ? 'var(--bg-input)' : 'var(--bg-elevated)', color: isReady ? 'var(--text-secondary)' : 'var(--text-muted)', border: '1px solid var(--border-subtle)' }}>
          {status}
        </span>
      </div>

      <div className="flex-1 space-y-1.5 mt-2">
        <h3 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>{title}</h3>
        <p className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{desc}</p>
      </div>

      {isReady && (
        <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest transition-all duration-300 mt-2"
             style={{ color: hovered ? color : 'transparent' }}>
          Open Tool <IconArrowRight size={12} className={hovered ? "translate-x-1 transition-transform" : ""} />
        </div>
      )}
    </div>
  )
}

function StatusItem({ label, ok, warning, loading }: { label: string, ok: boolean, warning?: boolean, loading?: boolean }) {
  let icon = <IconCheck size={14} />
  let color = '#10b981'
  if (loading) { icon = <IconSparkles size={14} className="animate-spin" />; color = 'var(--text-muted)' }
  else if (warning) { icon = <IconAlertCircle size={14} />; color = 'var(--color-error)' }

  return (
    <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold"
         style={{ background: 'var(--bg-input)', border: '1px solid var(--border-subtle)' }}>
      <span style={{ color }}>{icon}</span>
      <span style={{ color: 'var(--text-secondary)' }}>{label}</span>
    </div>
  )
}
