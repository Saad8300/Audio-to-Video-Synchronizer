// components/CsvGuide.tsx – Compact CSV template reference card

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
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href = url; a.download = 'timestamps_template.csv'; a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}
    >
      {/* Header row */}
      <div className="flex items-center justify-between gap-3 px-4 py-3">
        <div className="flex items-center gap-2.5">
          <div
            className="w-7 h-7 rounded-lg shrink-0 flex items-center justify-center"
            style={{ background: 'var(--accent-subtle)', border: '1px solid var(--accent-border)', color: 'var(--accent-primary)' }}
          >
            <IconFileText size={14} />
          </div>
          <div>
            <p className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>CSV Format</p>
            <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>Timestamp file reference</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            id="csv-guide-toggle-btn"
            onClick={() => setExpanded(v => !v)}
            className="btn-ghost text-[11px] py-1 px-2"
            aria-expanded={expanded}
          >
            <IconInfo size={12} />
            {expanded ? 'Hide' : 'Guide'}
          </button>
          <button
            id="download-csv-template-btn"
            onClick={downloadTemplate}
            className="btn-secondary text-[11px] py-1.5 px-2.5 gap-1"
            aria-label="Download CSV template file"
          >
            <IconDownload size={12} />
            Template
          </button>
        </div>
      </div>

      {/* Column pills — always visible */}
      <div className="flex flex-wrap gap-1.5 px-4 pb-3">
        {[
          { col: 'image', req: true },
          { col: 'start', req: true },
          { col: 'end',   req: true },
          { col: 'text',  req: false },
        ].map(({ col, req }) => (
          <span
            key={col}
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded font-mono text-[10px]"
            style={{
              background: req ? 'var(--accent-subtle)' : 'var(--bg-input)',
              border: `1px solid ${req ? 'var(--accent-border)' : 'var(--border-subtle)'}`,
              color: req ? 'var(--accent-primary)' : 'var(--text-muted)',
            }}
          >
            {col}
            {req && <span style={{ color: 'var(--color-error)', fontSize: '8px', fontWeight: 700 }}> REQ</span>}
          </span>
        ))}
      </div>

      {/* Expanded guide */}
      {expanded && (
        <div
          className="px-4 pb-4 space-y-3 animate-fade-in"
          style={{ borderTop: '1px solid var(--border-subtle)' }}
        >
          <ul className="space-y-1.5 text-[11px] pt-3" style={{ color: 'var(--text-secondary)' }}>
            <li className="flex items-start gap-1.5">
              <span style={{ color: 'var(--color-error)' }} className="shrink-0">*</span>
              <span><strong style={{ color: 'var(--text-primary)' }}>image</strong>, <strong style={{ color: 'var(--text-primary)' }}>start</strong>, and <strong style={{ color: 'var(--text-primary)' }}>end</strong> are required. <strong style={{ color: 'var(--text-primary)' }}>text</strong> is optional.</span>
            </li>
            <li className="flex items-start gap-1.5">
              <span className="shrink-0" style={{ color: 'var(--text-muted)' }}>·</span>
              <span>Image names must match filenames inside your ZIP exactly (e.g. <code style={{ color: 'var(--text-primary)' }}>1.jpg</code>).</span>
            </li>
            <li className="flex items-start gap-1.5">
              <span className="shrink-0" style={{ color: 'var(--text-muted)' }}>·</span>
              <span>Formats: <code>jpg jpeg png webp</code> · <strong style={{ color: 'var(--text-primary)' }}>end</strong> must be greater than <strong style={{ color: 'var(--text-primary)' }}>start</strong>.</span>
            </li>
          </ul>

          <div
            className="rounded-lg p-2.5 space-y-2"
            style={{ background: 'var(--accent-subtle)', border: '1px solid var(--accent-border)' }}
          >
            <p className="text-[10px] font-semibold flex items-center gap-1.5" style={{ color: 'var(--accent-primary)' }}>
              <IconInfo size={11} />
              Accepted time formats
            </p>
            <div className="grid grid-cols-2 gap-1.5">
              {['00:02', '00:01.500', '00:00:02', '00:00:02.500'].map(fmt => (
                <code
                  key={fmt}
                  className="block text-center text-[10px] rounded px-2 py-1 font-mono"
                  style={{ background: 'var(--bg-input)', border: '1px solid var(--border-input)', color: 'var(--text-secondary)' }}
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
