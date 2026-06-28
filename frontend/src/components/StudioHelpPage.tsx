import React from 'react'
import {
  IconFileText,
  IconVideo,
  IconImage,
  IconMusic,
  IconSparkles,
  IconAlertTriangle,
  IconZap
} from './icons'

export default function StudioHelpPage() {
  return (
    <div className="w-full px-5 sm:px-8 py-8 space-y-8 animate-fade-in" style={{ maxWidth: 900 }}>
      <header className="mb-8">
        <h1 className="text-2xl font-black mb-2" style={{ color: 'var(--text-primary)' }}>Help & Guide</h1>
        <p className="text-sm font-medium" style={{ color: 'var(--text-muted)' }}>
          Learn how to use SyncFrame Studio effectively.
        </p>
      </header>

      <div className="space-y-6">
        {/* 1. Quick Start */}
        <section className="card p-6">
          <h2 className="text-lg font-bold mb-4 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
            <IconZap size={20} className="text-indigo-500" /> Quick Start
          </h2>
          <ol className="list-decimal list-inside space-y-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
            <li>Enter the Studio and choose a tool from the sidebar or dashboard.</li>
            <li>Upload your required files (audio, image ZIP, CSV).</li>
            <li>Configure your generation settings like Aspect Ratio and Resolution.</li>
            <li>Click <strong>Generate</strong>. The process runs locally on your machine.</li>
            <li>Download your final export from the results panel!</li>
          </ol>
        </section>

        {/* 2. Timeline Tools */}
        <section className="card p-6">
          <h2 className="text-lg font-bold mb-4 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
            <IconVideo size={20} className="text-purple-500" /> Timeline Tools
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 rounded-xl border" style={{ borderColor: 'var(--border-subtle)', background: 'var(--bg-input)' }}>
              <div className="flex items-center gap-2 mb-2">
                <IconImage size={16} className="text-sky-500" />
                <h3 className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>Image Timeline</h3>
              </div>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                Create videos using a sequence of images (1.jpg, 2.jpg) timed precisely via a CSV file.
              </p>
            </div>
            <div className="p-4 rounded-xl border" style={{ borderColor: 'var(--border-subtle)', background: 'var(--bg-input)' }}>
              <div className="flex items-center gap-2 mb-2">
                <IconVideo size={16} className="text-purple-500" />
                <h3 className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>Video Timeline</h3>
              </div>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                Sequence pre-rendered video clips (1.mp4, 2.mov) into a continuous video.
              </p>
            </div>
            <div className="p-4 rounded-xl border" style={{ borderColor: 'var(--border-subtle)', background: 'var(--bg-input)' }}>
              <div className="flex items-center gap-2 mb-2">
                <IconSparkles size={16} className="text-blue-500" />
                <h3 className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>Media Timeline</h3>
              </div>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                Combine images, videos, and pure text screens into one complex sequence.
              </p>
            </div>
          </div>
        </section>

        {/* 3. Audio Tools */}
        <section className="card p-6">
          <h2 className="text-lg font-bold mb-4 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
            <IconMusic size={20} className="text-emerald-500" /> Audio Tools
          </h2>
          <ul className="space-y-4 text-sm" style={{ color: 'var(--text-secondary)' }}>
            <li>
              <strong>Audio Merger:</strong> Upload multiple audio tracks and stitch them together into one seamless file. Great for podcast segments or voiceover blocks.
            </li>
            <li>
              <strong>Script Timestamp:</strong> Upload a voiceover track. The local Whisper AI will transcribe it and generate timestamped captions, standard CSV timelines, or Scene Plans.
            </li>
          </ul>
        </section>

        {/* 4. File Naming Tips */}
        <section className="card p-6">
          <h2 className="text-lg font-bold mb-4 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
            <IconFileText size={20} className="text-amber-500" /> File Naming Tips
          </h2>
          <ul className="list-disc list-inside space-y-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
            <li>Your ZIP file contents must exactly match your CSV references.</li>
            <li>For Image Timelines, simple numbers work best: <code>1.jpg, 2.jpg, 3.jpg</code>.</li>
            <li>Do not place your media inside subfolders within the ZIP.</li>
            <li>Ensure CSV outputs do not contain restricted characters.</li>
          </ul>
        </section>

        {/* 5. Local Processing & 6. Troubleshooting */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <section className="card p-6">
            <h2 className="text-lg font-bold mb-4 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
              <IconZap size={20} className="text-zinc-500" /> Local Processing
            </h2>
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              Everything happens right here on your computer! No internet connection is needed for generating exports, and none of your files are ever uploaded to a cloud service. Just keep the backend server running.
            </p>
          </section>

          <section className="card p-6">
            <h2 className="text-lg font-bold mb-4 flex items-center gap-2 text-red-500">
              <IconAlertTriangle size={20} /> Troubleshooting
            </h2>
            <ul className="list-disc list-inside space-y-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
              <li><strong>Backend offline:</strong> Restart via <code>start_app.command</code></li>
              <li><strong>Missing FFmpeg:</strong> <code>brew install ffmpeg</code></li>
              <li><strong>Windows issues:</strong> Run <code>install_windows.bat</code></li>
              <li>Check <code>logs/backend.log</code> for errors.</li>
            </ul>
          </section>
        </div>

      </div>
    </div>
  )
}
