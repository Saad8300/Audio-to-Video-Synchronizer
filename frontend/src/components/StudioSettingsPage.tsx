import React, { useEffect, useState } from 'react'
import { IconSun, IconMoon, IconSettings, IconMonitor } from './icons'
import { AppSettings, loadSettings, saveSettings, resetSettings, applyThemeMode, ThemeMode, AccentColor, StartupPage, ExportPreset } from '../utils/appSettings'
import StudioPageHeader from './StudioPageHeader'

export default function StudioSettingsPage() {
  const [settings, setSettings] = useState<AppSettings | null>(null)

  useEffect(() => {
    setSettings(loadSettings())
  }, [])

  if (!settings) return null

  const updateSetting = <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => {
    const updated = saveSettings({ [key]: value })
    setSettings(updated)
    
    // Immediate apply for theme
    if (key === 'themeMode') {
      applyThemeMode(value as ThemeMode)
    }
  }

  const handleReset = () => {
    if (confirm("Are you sure you want to reset all settings to their defaults? Your history and generated files will not be deleted.")) {
      const reset = resetSettings()
      setSettings(reset)
      applyThemeMode(reset.themeMode)
    }
  }

  return (
    <div className="w-full px-5 sm:px-8 py-8 space-y-8 pb-20 animate-fade-in" style={{ maxWidth: 900 }}>
      
      <StudioPageHeader
        icon={<IconSettings size={17} />}
        title="Settings"
        subtitle="Customize SyncFrame Studio preferences for your local workflow."
      />

      <div className="space-y-6">
        
        {/* Appearance */}
        <section className="card p-6 space-y-6">
          <h2 className="text-sm font-bold uppercase tracking-widest border-b pb-2 mb-2" style={{ color: 'var(--text-muted)', borderColor: 'var(--border-subtle)' }}>Appearance</h2>
          
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <p className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>Theme Mode</p>
              <p className="text-[11px] mt-0.5" style={{ color: 'var(--text-muted)' }}>Toggle between light, dark, or system preference</p>
            </div>
            <select 
              className="form-select w-full sm:w-40 bg-[var(--bg-input)]"
              value={settings.themeMode}
              onChange={(e) => updateSetting('themeMode', e.target.value as ThemeMode)}
            >
              <option value="light">Light</option>
              <option value="dark">Dark</option>
              <option value="system">System Default</option>
            </select>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 opacity-70">
            <div>
              <p className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>Accent Color</p>
              <p className="text-[11px] mt-0.5" style={{ color: 'var(--text-muted)' }}>Customize the primary app color (Saves locally, styling coming soon)</p>
            </div>
            <select 
              className="form-select w-full sm:w-40 bg-[var(--bg-input)]"
              value={settings.accentColor}
              onChange={(e) => updateSetting('accentColor', e.target.value as AccentColor)}
            >
              <option value="purple">Purple</option>
              <option value="blue">Blue</option>
              <option value="cyan">Cyan</option>
              <option value="green">Green</option>
              <option value="orange">Orange</option>
            </select>
          </div>
        </section>

        {/* Defaults */}
        <section className="card p-6 space-y-6">
          <h2 className="text-sm font-bold uppercase tracking-widest border-b pb-2 mb-2" style={{ color: 'var(--text-muted)', borderColor: 'var(--border-subtle)' }}>Default Export Settings</h2>
          
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <p className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>Default Export Preset</p>
              <p className="text-[11px] mt-0.5" style={{ color: 'var(--text-muted)' }}>Auto-apply specific aspect ratio and quality on fresh timelines</p>
            </div>
            <select 
              className="form-select w-full sm:w-48 bg-[var(--bg-input)]"
              value={settings.defaultExportPreset}
              onChange={(e) => updateSetting('defaultExportPreset', e.target.value as ExportPreset)}
            >
              <option value="default_1080p">Studio Default (1080p)</option>
              <option value="tiktok_4k">TikTok / Shorts 4K</option>
              <option value="tiktok_1080">TikTok / Shorts 1080p</option>
              <option value="youtube_4k">YouTube Landscape 4K</option>
              <option value="youtube_1080">YouTube Landscape 1080p</option>
              <option value="instagram_reel">Instagram Reel</option>
              <option value="square_post">Square Post</option>
              <option value="fast_test">Fast Test Render</option>
            </select>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <p className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>Default Video Filename</p>
              <p className="text-[11px] mt-0.5" style={{ color: 'var(--text-muted)' }}>Base name for all timeline video exports</p>
            </div>
            <input 
              type="text" 
              className="form-input w-full sm:w-48 bg-[var(--bg-input)]" 
              value={settings.defaultVideoFilename}
              onChange={(e) => updateSetting('defaultVideoFilename', e.target.value)}
            />
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <p className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>Default Audio Filename</p>
              <p className="text-[11px] mt-0.5" style={{ color: 'var(--text-muted)' }}>Base name for Audio Merger exports</p>
            </div>
            <input 
              type="text" 
              className="form-input w-full sm:w-48 bg-[var(--bg-input)]" 
              value={settings.defaultAudioFilename}
              onChange={(e) => updateSetting('defaultAudioFilename', e.target.value)}
            />
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <p className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>Default Script Filename</p>
              <p className="text-[11px] mt-0.5" style={{ color: 'var(--text-muted)' }}>Base name for Script Timestamp exports</p>
            </div>
            <input 
              type="text" 
              className="form-input w-full sm:w-48 bg-[var(--bg-input)]" 
              value={settings.defaultScriptFilename}
              onChange={(e) => updateSetting('defaultScriptFilename', e.target.value)}
            />
          </div>
        </section>

        {/* Startup Behavior */}
        <section className="card p-6 space-y-6">
          <h2 className="text-sm font-bold uppercase tracking-widest border-b pb-2 mb-2" style={{ color: 'var(--text-muted)', borderColor: 'var(--border-subtle)' }}>Startup Behavior</h2>
          
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <p className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>Open app to</p>
              <p className="text-[11px] mt-0.5" style={{ color: 'var(--text-muted)' }}>Choose the initial screen shown when starting the app</p>
            </div>
            <select 
              className="form-select w-full sm:w-40 bg-[var(--bg-input)]"
              value={settings.startupPage}
              onChange={(e) => updateSetting('startupPage', e.target.value as StartupPage)}
            >
              <option value="landing">Landing Page</option>
              <option value="studio-tools">Tools Page</option>
              <option value="last-used">Last Used Page</option>
            </select>
          </div>
        </section>

        {/* App Behavior */}
        <section className="card p-6 space-y-6">
          <h2 className="text-sm font-bold uppercase tracking-widest border-b pb-2 mb-2" style={{ color: 'var(--text-muted)', borderColor: 'var(--border-subtle)' }}>App Behavior</h2>
          
          <label className="flex items-center justify-between gap-4 cursor-pointer group">
            <div>
              <p className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>Auto-open result after generation</p>
              <p className="text-[11px] mt-0.5" style={{ color: 'var(--text-muted)' }}>Automatically trigger preview when generation finishes</p>
            </div>
            <input 
              type="checkbox" 
              className="w-5 h-5 rounded border-[var(--border-default)] checked:bg-violet-500 cursor-pointer" 
              checked={settings.autoOpenResult}
              onChange={(e) => updateSetting('autoOpenResult', e.target.checked)}
            />
          </label>

          <label className="flex items-center justify-between gap-4 cursor-pointer group">
            <div>
              <p className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>Confirm before clearing history</p>
              <p className="text-[11px] mt-0.5" style={{ color: 'var(--text-muted)' }}>Ask for confirmation before wiping the History log</p>
            </div>
            <input 
              type="checkbox" 
              className="w-5 h-5 rounded border-[var(--border-default)] checked:bg-violet-500 cursor-pointer"
              checked={settings.confirmBeforeClearHistory}
              onChange={(e) => updateSetting('confirmBeforeClearHistory', e.target.checked)}
            />
          </label>
        </section>

        {/* Reset */}
        <section className="card p-6 border-red-500/20 bg-red-500/5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <p className="font-bold text-red-500 text-sm">Reset All Settings</p>
              <p className="text-[11px] mt-0.5" style={{ color: 'var(--text-muted)' }}>Restores default preferences. Does not delete history or files.</p>
            </div>
            <button 
              onClick={handleReset}
              className="px-4 py-2 rounded-lg font-bold text-sm bg-red-500 hover:bg-red-600 text-white transition-colors"
            >
              Reset Settings
            </button>
          </div>
        </section>

      </div>
    </div>
  )
}
