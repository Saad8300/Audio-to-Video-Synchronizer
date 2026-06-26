import React from 'react'
import {
  IconLayers,
  IconFilm,
  IconGrid,
  IconType,
  IconMusic,
  IconFileText,
  IconVideo,
  IconSparkles,
  IconMonitor
} from './icons'

export type ViewMode = 'home' | 'image' | 'video' | 'media'

interface Props {
  onSelectTool: (tool: ViewMode) => void
}

export default function StudioHomePage({ onSelectTool }: Props) {
  return (
    <div className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 py-12 pb-24 space-y-12 animate-fade-in">
      
      {/* ── Hero Section ── */}
      <div className="text-center space-y-4 max-w-2xl mx-auto pt-8">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full mb-2" 
             style={{ background: 'var(--accent-subtle)', border: '1px solid var(--accent-border)' }}>
          <IconSparkles size={14} style={{ color: 'var(--accent-primary)' }} />
          <span className="text-xs font-semibold tracking-wide uppercase" style={{ color: 'var(--accent-primary)' }}>
            SyncFrame Studio
          </span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-gradient">
          Studio Home
        </h1>
        <p className="text-sm sm:text-base leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
          Choose a tool to create videos, manage audio, and build timeline-based content locally.
          SyncFrame Studio helps you create videos from images, video clips, text, and audio timelines — all running securely on your machine.
        </p>
        
        <div className="flex items-center justify-center gap-3 pt-2">
          <span className="text-[11px] font-medium px-2.5 py-1 rounded-md" style={{ background: 'var(--bg-elevated)', color: 'var(--text-muted)' }}>
            Local Processing
          </span>
          <span className="text-[11px] font-medium px-2.5 py-1 rounded-md" style={{ background: 'var(--bg-elevated)', color: 'var(--text-muted)' }}>
            Timeline Tools
          </span>
          <span className="text-[11px] font-medium px-2.5 py-1 rounded-md" style={{ background: 'var(--bg-elevated)', color: 'var(--text-muted)' }}>
            Audio & Video
          </span>
        </div>
      </div>

      {/* ── Active Tools ── */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 mb-4">
          <IconMonitor size={18} style={{ color: 'var(--text-primary)' }} />
          <h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>Active Tools</h2>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Image Timeline */}
          <button
            onClick={() => onSelectTool('image')}
            className="group card text-left p-6 flex flex-col items-start gap-4 transition-all duration-300 hover:-translate-y-1"
            style={{ cursor: 'pointer', outline: 'none' }}
          >
            <div className="w-12 h-12 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110"
                 style={{ background: 'var(--accent-subtle)', border: '1px solid var(--accent-border)' }}>
              <IconLayers size={24} style={{ color: 'var(--accent-primary)' }} />
            </div>
            <div className="space-y-1.5 flex-1">
              <h3 className="text-base font-bold" style={{ color: 'var(--text-primary)' }}>Image Timeline</h3>
              <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                Create videos from images, audio, and timestamp CSV files.
              </p>
            </div>
            <div className="w-full pt-4 mt-auto">
              <div className="text-xs font-semibold text-center py-2 rounded-lg transition-colors"
                   style={{ background: 'var(--bg-input)', color: 'var(--text-primary)' }}>
                Open Image Timeline &rarr;
              </div>
            </div>
          </button>

          {/* Video Timeline */}
          <button
            onClick={() => onSelectTool('video')}
            className="group card text-left p-6 flex flex-col items-start gap-4 transition-all duration-300 hover:-translate-y-1"
            style={{ cursor: 'pointer', outline: 'none' }}
          >
            <div className="w-12 h-12 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110"
                 style={{ background: 'var(--accent-subtle)', border: '1px solid var(--accent-border)' }}>
              <IconFilm size={24} style={{ color: 'var(--accent-primary)' }} />
            </div>
            <div className="space-y-1.5 flex-1">
              <h3 className="text-base font-bold" style={{ color: 'var(--text-primary)' }}>Video Timeline</h3>
              <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                Build videos from reusable video clips, main audio, and timeline CSV files.
              </p>
            </div>
            <div className="w-full pt-4 mt-auto">
              <div className="text-xs font-semibold text-center py-2 rounded-lg transition-colors"
                   style={{ background: 'var(--bg-input)', color: 'var(--text-primary)' }}>
                Open Video Timeline &rarr;
              </div>
            </div>
          </button>

          {/* Media Timeline */}
          <button
            onClick={() => onSelectTool('media')}
            className="group card text-left p-6 flex flex-col items-start gap-4 transition-all duration-300 hover:-translate-y-1"
            style={{ cursor: 'pointer', outline: 'none' }}
          >
            <div className="w-12 h-12 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110"
                 style={{ background: 'var(--accent-subtle)', border: '1px solid var(--accent-border)' }}>
              <IconGrid size={24} style={{ color: 'var(--accent-primary)' }} />
            </div>
            <div className="space-y-1.5 flex-1">
              <h3 className="text-base font-bold" style={{ color: 'var(--text-primary)' }}>Media Timeline</h3>
              <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                Mix images, videos, and text rows using one timeline CSV.
              </p>
            </div>
            <div className="w-full pt-4 mt-auto">
              <div className="text-xs font-semibold text-center py-2 rounded-lg transition-colors"
                   style={{ background: 'var(--bg-input)', color: 'var(--text-primary)' }}>
                Open Media Timeline &rarr;
              </div>
            </div>
          </button>
        </div>
      </div>

      {/* ── Coming Soon Tools ── */}
      <div className="space-y-4 pt-8">
        <div className="flex items-center gap-2 mb-4">
          <IconSparkles size={18} style={{ color: 'var(--text-muted)' }} />
          <h2 className="text-lg font-bold" style={{ color: 'var(--text-muted)' }}>Coming Soon</h2>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          
          <div className="card p-5 flex flex-col items-start gap-3 opacity-60 grayscale-[30%]">
            <div className="flex items-center justify-between w-full">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center"
                   style={{ background: 'var(--bg-input)', border: '1px solid var(--border-default)' }}>
                <IconType size={20} style={{ color: 'var(--text-muted)' }} />
              </div>
              <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded"
                    style={{ background: 'var(--bg-elevated)', color: 'var(--text-secondary)' }}>
                Coming Soon
              </span>
            </div>
            <div>
              <h3 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>Text to Speech</h3>
              <p className="text-xs mt-1 leading-snug" style={{ color: 'var(--text-muted)' }}>
                Generate voice audio from text for video projects.
              </p>
            </div>
          </div>

          <div className="card p-5 flex flex-col items-start gap-3 opacity-60 grayscale-[30%]">
            <div className="flex items-center justify-between w-full">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center"
                   style={{ background: 'var(--bg-input)', border: '1px solid var(--border-default)' }}>
                <IconMusic size={20} style={{ color: 'var(--text-muted)' }} />
              </div>
              <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded"
                    style={{ background: 'var(--bg-elevated)', color: 'var(--text-secondary)' }}>
                Coming Soon
              </span>
            </div>
            <div>
              <h3 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>Audio Merger</h3>
              <p className="text-xs mt-1 leading-snug" style={{ color: 'var(--text-muted)' }}>
                Combine multiple audio parts into one clean track.
              </p>
            </div>
          </div>

          <div className="card p-5 flex flex-col items-start gap-3 opacity-60 grayscale-[30%]">
            <div className="flex items-center justify-between w-full">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center"
                   style={{ background: 'var(--bg-input)', border: '1px solid var(--border-default)' }}>
                <IconMusic size={20} style={{ color: 'var(--text-muted)' }} />
              </div>
              <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded"
                    style={{ background: 'var(--bg-elevated)', color: 'var(--text-secondary)' }}>
                Coming Soon
              </span>
            </div>
            <div>
              <h3 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>Audio Mixer</h3>
              <p className="text-xs mt-1 leading-snug" style={{ color: 'var(--text-muted)' }}>
                Mix voice audio with background music and export.
              </p>
            </div>
          </div>

          <div className="card p-5 flex flex-col items-start gap-3 opacity-60 grayscale-[30%]">
            <div className="flex items-center justify-between w-full">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center"
                   style={{ background: 'var(--bg-input)', border: '1px solid var(--border-default)' }}>
                <IconFileText size={20} style={{ color: 'var(--text-muted)' }} />
              </div>
              <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded"
                    style={{ background: 'var(--bg-elevated)', color: 'var(--text-secondary)' }}>
                Coming Soon
              </span>
            </div>
            <div>
              <h3 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>CSV Helper</h3>
              <p className="text-xs mt-1 leading-snug" style={{ color: 'var(--text-muted)' }}>
                Create, validate, and fix timeline CSV files.
              </p>
            </div>
          </div>

          <div className="card p-5 flex flex-col items-start gap-3 opacity-60 grayscale-[30%]">
            <div className="flex items-center justify-between w-full">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center"
                   style={{ background: 'var(--bg-input)', border: '1px solid var(--border-default)' }}>
                <IconVideo size={20} style={{ color: 'var(--text-muted)' }} />
              </div>
              <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded"
                    style={{ background: 'var(--bg-elevated)', color: 'var(--text-secondary)' }}>
                Coming Soon
              </span>
            </div>
            <div>
              <h3 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>Media Tools</h3>
              <p className="text-xs mt-1 leading-snug" style={{ color: 'var(--text-muted)' }}>
                Prepare, convert, compress, and organize media.
              </p>
            </div>
          </div>

        </div>
      </div>

    </div>
  )
}
