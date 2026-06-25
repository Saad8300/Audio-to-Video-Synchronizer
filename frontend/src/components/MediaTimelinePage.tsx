import React from 'react'
import {
  IconGrid,
  IconMusic,
  IconFileText,
  IconAlertTriangle,
  IconSettings,
  IconSparkles,
} from './icons'

export default function MediaTimelinePage() {
  return (
    <main className="max-w-7xl mx-auto w-full px-4 sm:px-6 py-6 animate-fade-in">
      <div className="flex flex-col xl:flex-row gap-6 items-start">

        {/* ── LEFT COLUMN ── */}
        <div className="flex-1 min-w-0 space-y-6">

          {/* Header */}
          <div className="flex items-center gap-3 mb-2">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: 'var(--accent-subtle)', border: '1px solid var(--accent-border)', color: 'var(--accent-primary)' }}
            >
              <IconGrid size={18} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-sm font-bold" style={{ color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>Media Timeline</h1>
                <span
                  className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded shrink-0"
                  style={{
                    background: 'var(--bg-input)',
                    border: '1px solid var(--border-default)',
                    color: 'var(--text-muted)',
                  }}
                >
                  Coming in Batch 11B
                </span>
              </div>
              <p className="text-[11px] mt-0.5" style={{ color: 'var(--text-muted)' }}>
                Build videos by combining images, video clips, and text rows in one timeline.
              </p>
            </div>
          </div>

          {/* Planned Inputs */}
          <div className="card p-5 space-y-4">
            <div>
              <h2 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>Planned Inputs</h2>
              <p className="text-[11px] mt-0.5" style={{ color: 'var(--text-muted)' }}>Required files for generating a media timeline video.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Main Audio */}
              <div className="p-4 rounded-xl flex flex-col gap-1.5" style={{ background: 'var(--bg-input)', border: '1px dashed var(--border-default)' }}>
                <div className="flex items-center gap-1.5 text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>
                  <IconMusic size={14} style={{ color: 'var(--accent-primary)' }} /> Main Audio
                </div>
                <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>Upload one audio file or multiple audio parts.</p>
              </div>
              
              {/* Media ZIP */}
              <div className="p-4 rounded-xl flex flex-col gap-1.5" style={{ background: 'var(--bg-input)', border: '1px dashed var(--border-default)' }}>
                <div className="flex items-center gap-1.5 text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>
                  <IconGrid size={14} style={{ color: 'var(--accent-primary)' }} /> Media ZIP
                </div>
                <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>ZIP containing images and video clips.</p>
                <div className="text-[9px] mt-1 space-y-0.5" style={{ color: 'var(--text-muted)' }}>
                  <p>Images: .png, .jpg, .jpeg, .webp</p>
                  <p>Videos: .mp4, .mov, .webm</p>
                </div>
              </div>

              {/* Timeline CSV */}
              <div className="p-4 rounded-xl flex flex-col gap-1.5" style={{ background: 'var(--bg-input)', border: '1px dashed var(--border-default)' }}>
                <div className="flex items-center gap-1.5 text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>
                  <IconFileText size={14} style={{ color: 'var(--accent-primary)' }} /> Media Timeline CSV
                </div>
                <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>Controls when each image, video, or text row appears.</p>
              </div>
            </div>
          </div>

          {/* Planned Behavior */}
          <div className="card p-5 space-y-4">
            <h2 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>Planned Behavior</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 text-[11px]" style={{ color: 'var(--text-secondary)' }}>
              <ul className="space-y-2 list-disc pl-4" style={{ marker: 'var(--text-muted)' }}>
                <li>Images will be converted into video clips.</li>
                <li>Videos will be trimmed or looped to match the CSV segment.</li>
                <li>Text can appear over images/videos.</li>
                <li>Empty asset + text will create a text-only screen.</li>
              </ul>
              <ul className="space-y-2 list-disc pl-4" style={{ marker: 'var(--text-muted)' }}>
                <li>Main audio will be used as the final soundtrack.</li>
                <li>Multiple audio parts will be supported.</li>
                <li>Existing export settings will later be reused (resolution, render profile, transitions, visual style, intro, outro, watermark).</li>
              </ul>
            </div>
          </div>

        </div>

        {/* ── RIGHT COLUMN ── */}
        <div className="xl:w-[320px] shrink-0 space-y-6">

          {/* CSV Guide */}
          <div className="card p-5 space-y-4">
            <h2 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>CSV Format Guide</h2>
            
            <div className="p-3 rounded-lg font-mono text-[10px] overflow-x-auto whitespace-pre" style={{ background: 'var(--bg-input)', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)' }}>
              start,end,asset,text<br/>
              0,5,1.png,"Opening line"<br/>
              5,10,clip_1.mp4,""<br/>
              10,15,2.jpg,"Important point"<br/>
              15,20,clip_2.mp4,"Final moment"<br/>
              20,25,,"Text-only screen"
            </div>

            <div className="space-y-2">
              <p className="text-[11px] font-semibold" style={{ color: 'var(--text-secondary)' }}>Columns:</p>
              <ul className="text-[10px] space-y-1.5" style={{ color: 'var(--text-muted)' }}>
                <li><code className="px-1 py-0.5 rounded bg-black/10 dark:bg-white/10 text-[9px] text-accent">start</code> = row start time in seconds</li>
                <li><code className="px-1 py-0.5 rounded bg-black/10 dark:bg-white/10 text-[9px] text-accent">end</code> = row end time in seconds</li>
                <li><code className="px-1 py-0.5 rounded bg-black/10 dark:bg-white/10 text-[9px] text-accent">asset</code> = filename inside Media ZIP</li>
                <li><code className="px-1 py-0.5 rounded bg-black/10 dark:bg-white/10 text-[9px] text-accent">text</code> = optional text overlay or text-only screen</li>
              </ul>
            </div>

            <div className="space-y-2">
              <p className="text-[11px] font-semibold" style={{ color: 'var(--text-secondary)' }}>Row Behavior:</p>
              <div className="text-[10px] space-y-2" style={{ color: 'var(--text-muted)' }}>
                <p><strong>Image row:</strong> If asset is an image, it stays on screen for the CSV duration.</p>
                <p><strong>Video row:</strong> If asset is a video, it plays during the CSV time range.</p>
                <p><strong>Text-only row:</strong> If asset is empty but text exists, the app will create a text-only screen.</p>
                <p><strong>Repeat behavior:</strong> Use the same asset filename multiple times to reuse it later in the timeline.</p>
              </div>
            </div>
          </div>

          {/* Disabled Generate Button */}
          <button
            className="w-full relative overflow-hidden transition-all duration-300 flex items-center justify-center gap-2 rounded-xl text-sm font-bold opacity-50 cursor-not-allowed"
            style={{
              height: 52,
              background: 'var(--accent-primary)',
              color: '#fff',
            }}
            disabled
          >
            <IconSparkles size={16} />
            Media Timeline generation coming in Batch 11B
          </button>

        </div>
      </div>
    </main>
  )
}
