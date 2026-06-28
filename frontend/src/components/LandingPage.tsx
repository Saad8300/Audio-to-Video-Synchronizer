import React from 'react'
import {
  IconVideo,
  IconImage,
  IconMusic,
  IconFileText,
  IconSparkles,
  IconZap
} from './icons'

interface LandingPageProps {
  onEnterStudio: () => void
  onViewTools: () => void
}

export default function LandingPage({ onEnterStudio, onViewTools }: LandingPageProps) {
  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--bg-default)', color: 'var(--text-primary)' }}>
      {/* Hero Section */}
      <main className="flex-1 flex flex-col items-center justify-center text-center px-6 py-20">
        
        {/* Chips */}
        <div className="flex flex-wrap items-center justify-center gap-2 mb-8 max-w-2xl">
          {['Local Processing', 'Timeline Tools', 'Audio Tools', 'Script Timestamp', 'No Cloud Upload'].map(chip => (
            <span key={chip} className="px-3 py-1 rounded-full text-[10px] font-bold tracking-widest uppercase"
                  style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-default)', color: 'var(--text-muted)' }}>
              {chip}
            </span>
          ))}
        </div>

        <h1 className="text-5xl md:text-6xl font-black tracking-tight mb-6">
          <span className="text-gradient">SyncFrame Studio</span>
        </h1>
        
        <p className="text-lg md:text-xl font-medium mb-4 max-w-2xl" style={{ color: 'var(--text-secondary)' }}>
          Create videos, timestamps, audio tools, and media timelines locally.
        </p>
        
        <p className="text-sm md:text-base mb-10 max-w-2xl" style={{ color: 'var(--text-muted)' }}>
          A local-first studio for image timelines, video timelines, media timelines, audio merging, and script timestamps.
        </p>

        <div className="flex flex-col sm:flex-row items-center gap-4 w-full max-w-md mx-auto justify-center">
          <button
            onClick={onEnterStudio}
            className="w-full sm:w-auto px-8 py-3 rounded-xl font-bold transition-all hover:scale-105 active:scale-95 flex items-center justify-center gap-2"
            style={{
              background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
              color: '#fff',
              boxShadow: '0 4px 16px rgba(99,102,241,0.35)'
            }}
          >
            Enter Studio <IconZap size={18} />
          </button>
          
          <button
            onClick={onViewTools}
            className="w-full sm:w-auto px-8 py-3 rounded-xl font-bold transition-all hover:scale-105 active:scale-95 flex items-center justify-center gap-2"
            style={{
              background: 'var(--bg-elevated)',
              color: 'var(--text-primary)',
              border: '1px solid var(--border-default)'
            }}
          >
            View Tools
          </button>
        </div>

        {/* Feature Cards Showcase */}
        <div className="mt-20 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 w-full max-w-6xl mx-auto">
          {[
            { title: 'Image Timeline', icon: <IconImage size={24} color="#0ea5e9" /> },
            { title: 'Video Timeline', icon: <IconVideo size={24} color="#8b5cf6" /> },
            { title: 'Media Timeline', icon: <IconSparkles size={24} color="#3b82f6" /> },
            { title: 'Audio Merger', icon: <IconMusic size={24} color="#10b981" /> },
            { title: 'Script Timestamp', icon: <IconFileText size={24} color="#f59e0b" /> },
          ].map(feat => (
            <div key={feat.title} className="card p-5 flex flex-col items-center justify-center text-center hover:scale-105 transition-transform duration-300">
              <div className="mb-3 p-3 rounded-xl" style={{ background: 'var(--bg-input)' }}>
                {feat.icon}
              </div>
              <span className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>{feat.title}</span>
            </div>
          ))}
        </div>
        
      </main>
    </div>
  )
}
