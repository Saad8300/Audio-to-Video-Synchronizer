import React from 'react'
import { IconSun, IconMoon, IconSettings } from './icons'

interface StudioSettingsPageProps {
  isDark: boolean
  toggleTheme: () => void
}

export default function StudioSettingsPage({ isDark, toggleTheme }: StudioSettingsPageProps) {
  return (
    <div className="p-6 md:p-10 max-w-4xl mx-auto space-y-8">
      
      <header>
        <h1 className="text-2xl font-black mb-2" style={{ color: 'var(--text-primary)' }}>Settings</h1>
        <p className="text-sm font-medium" style={{ color: 'var(--text-muted)' }}>
          Manage your local Studio preferences and defaults.
        </p>
      </header>

      <div className="space-y-6">
        
        {/* Appearance */}
        <section className="card p-6 space-y-5">
          <h2 className="text-sm font-bold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>Appearance</h2>
          
          <div className="flex items-center justify-between">
            <div>
              <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>Theme Mode</p>
              <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>Toggle between light and dark mode</p>
            </div>
            <button
              onClick={toggleTheme}
              className="px-4 py-2 rounded-lg font-medium text-sm flex items-center gap-2 border"
              style={{
                background: 'var(--bg-elevated)',
                color: 'var(--text-primary)',
                borderColor: 'var(--border-default)'
              }}
            >
              {isDark ? <IconSun size={16} /> : <IconMoon size={16} />}
              {isDark ? 'Switch to Light' : 'Switch to Dark'}
            </button>
          </div>

          <div className="flex items-center justify-between opacity-50">
            <div>
              <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>Accent Color</p>
              <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>Customize the primary app color (Coming soon)</p>
            </div>
            <select disabled className="form-select w-32 cursor-not-allowed">
              <option>Indigo</option>
            </select>
          </div>
        </section>

        {/* Defaults */}
        <section className="card p-6 space-y-5">
          <h2 className="text-sm font-bold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>Defaults</h2>
          
          <div className="flex items-center justify-between opacity-50">
            <div>
              <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>Default Video Filename</p>
              <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>Base name for video exports (Coming soon)</p>
            </div>
            <input type="text" disabled value="video_timeline" className="form-input w-40 cursor-not-allowed" />
          </div>

          <div className="flex items-center justify-between opacity-50">
            <div>
              <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>Default Audio Filename</p>
              <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>Base name for audio exports (Coming soon)</p>
            </div>
            <input type="text" disabled value="merged_audio" className="form-input w-40 cursor-not-allowed" />
          </div>

          <div className="flex items-center justify-between opacity-50">
            <div>
              <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>Default Export Preset</p>
              <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>Auto-apply specific aspect ratio and quality (Coming soon)</p>
            </div>
            <select disabled className="form-select w-40 cursor-not-allowed">
              <option>Default 1080p</option>
            </select>
          </div>
        </section>

        {/* App Behavior */}
        <section className="card p-6 space-y-5">
          <h2 className="text-sm font-bold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>App Behavior</h2>
          
          <div className="flex items-center justify-between opacity-50">
            <div>
              <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>Show Landing Page on Startup</p>
              <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>Always show the landing page when opening (Coming soon)</p>
            </div>
            <input type="checkbox" disabled checked className="w-5 h-5 rounded cursor-not-allowed" />
          </div>

          <div className="flex items-center justify-between opacity-50">
            <div>
              <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>Open Last Used Tool</p>
              <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>Automatically navigate to the tool you used last (Coming soon)</p>
            </div>
            <input type="checkbox" disabled className="w-5 h-5 rounded cursor-not-allowed" />
          </div>
        </section>

      </div>
    </div>
  )
}
