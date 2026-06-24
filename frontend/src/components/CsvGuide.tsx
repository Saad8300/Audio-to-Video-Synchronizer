// components/CsvGuide.tsx – Compact CSV template card with download button

import React, { useState } from 'react'
import { IconFileText, IconDownload, IconInfo } from './icons'

const TEMPLATE_CONTENT = `image,start,end,text
1.jpg,00:00,00:02,First line here
2.jpg,00:02,00:05,Second line here
3.jpg,00:05,00:08,Third line here`

export default function CsvGuide() {
  const [expanded, setExpanded] = useState(false)

  const downloadTemplate = () => {
    const blob = new Blob([TEMPLATE_CONTENT], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'timestamps_template.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="card-glow p-5 space-y-4">
      {/* Header row */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-violet-500/10 border border-violet-500/20 flex items-center justify-center text-violet-400">
            <IconFileText size={18} />
          </div>
          <div>
            <h2 className="text-base font-semibold text-primary">CSV Template</h2>
            <p className="text-xs text-muted">Timestamp file format guide</p>
          </div>
        </div>

        {/* Download button */}
        <button
          id="download-csv-template-btn"
          onClick={downloadTemplate}
          className="btn-secondary flex items-center gap-1.5 text-xs px-3 py-1.5 whitespace-nowrap"
          aria-label="Download CSV template file"
        >
          <IconDownload size={13} />
          Download Template
        </button>
      </div>

      <div className="h-px" style={{ backgroundColor: 'var(--color-surface-card-border)' }} />

      {/* Required columns summary — always visible */}
      <div className="flex flex-wrap gap-2 text-xs">
        {[
          { col: 'image', req: true },
          { col: 'start', req: true },
          { col: 'end', req: true },
          { col: 'text', req: false },
        ].map(({ col, req }) => (
          <span
            key={col}
            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full font-mono border ${
              req
                ? 'border-brand-500/30 text-brand-300'
                : 'border-slate-600/40 text-muted'
            }`}
            style={{ backgroundColor: req ? 'rgba(99,102,241,0.08)' : 'rgba(100,116,139,0.06)' }}
          >
            {col}
            {req && <span className="text-red-400 text-[9px] font-bold">REQ</span>}
          </span>
        ))}
      </div>

      {/* Toggle for expanded guide */}
      <button
        id="csv-guide-toggle-btn"
        onClick={() => setExpanded((v) => !v)}
        className="flex items-center gap-1.5 text-xs text-muted hover:text-secondary transition-colors"
        aria-expanded={expanded}
      >
        <IconInfo size={13} />
        {expanded ? 'Hide guide ▲' : 'Show format guide ▼'}
      </button>

      {/* Expanded details */}
      {expanded && (
        <div className="space-y-3 animate-fade-in">
          {/* Compact rules list */}
          <ul className="space-y-1.5 text-xs text-secondary">
            <li className="flex items-start gap-2">
              <span className="text-red-400 font-bold mt-0.5">*</span>
              <span><strong className="text-primary">image</strong>, <strong className="text-primary">start</strong>, and <strong className="text-primary">end</strong> are required. <strong className="text-primary">text</strong> is optional.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-muted mt-0.5">·</span>
              <span>Image names must match files inside your ZIP exactly (e.g. <code className="text-primary font-mono">1.jpg</code>).</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-muted mt-0.5">·</span>
              <span>Accepted image formats: <code className="font-mono">jpg jpeg png webp</code></span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-muted mt-0.5">·</span>
              <span><strong className="text-primary">end</strong> must be greater than <strong className="text-primary">start</strong>.</span>
            </li>
          </ul>

          {/* Accepted time formats */}
          <div className="rounded-xl border p-3 space-y-2" style={{ backgroundColor: 'rgba(99,102,241,0.05)', borderColor: 'rgba(99,102,241,0.15)' }}>
            <p className="text-xs font-semibold text-brand-300 flex items-center gap-1.5">
              <IconInfo size={12} />
              Accepted time formats
            </p>
            <div className="grid grid-cols-2 gap-1.5">
              {['00:02', '00:01.500', '00:00:02', '00:00:02.500'].map((fmt) => (
                <code
                  key={fmt}
                  className="block text-center text-xs rounded-md px-2 py-1 text-secondary font-mono"
                  style={{ backgroundColor: 'var(--color-surface-input)', border: '1px solid var(--color-surface-input-border)' }}
                >
                  {fmt}
                </code>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
