// components/CsvGuide.tsx – CSV format reference card

import React, { useState } from 'react'
import { IconFileText, IconInfo } from './icons'

const SAMPLE_CSV = `image,start,end,text
1.jpg,00:00,00:02,First line here
2.jpg,00:02,00:05,Second line here
3.jpg,00:05,00:08,Third line here`

export default function CsvGuide() {
  const [copied, setCopied] = useState(false)

  const copy = () => {
    navigator.clipboard.writeText(SAMPLE_CSV).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <div className="card-glow p-6 space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg bg-violet-500/10 border border-violet-500/20 flex items-center justify-center text-violet-400">
          <IconFileText size={18} />
        </div>
        <div>
          <h2 className="text-base font-semibold text-slate-100">CSV Format Guide</h2>
          <p className="text-xs text-slate-500">How to format your timestamp file</p>
        </div>
      </div>

      <div className="h-px bg-slate-700/50" />

      {/* Sample table */}
      <div className="relative">
        <button
          onClick={copy}
          aria-label="Copy sample CSV"
          className="absolute top-2 right-2 text-xs px-2.5 py-1 rounded-md bg-slate-700 hover:bg-slate-600 text-slate-300 transition-colors z-10"
        >
          {copied ? '✓ Copied' : 'Copy'}
        </button>
        <div className="overflow-x-auto rounded-xl border border-slate-700/60 bg-surface-900/70">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-700/60">
                {['image', 'start', 'end', 'text'].map((h) => (
                  <th
                    key={h}
                    className="px-4 py-2.5 text-left text-xs font-semibold text-brand-400 uppercase tracking-wider"
                  >
                    {h}
                    {h !== 'text' && (
                      <span className="ml-1 text-red-400 text-[10px] align-top">*</span>
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/40">
              {[
                ['1.jpg', '00:00', '00:02', 'First line here'],
                ['2.jpg', '00:02', '00:05', 'Second line here'],
                ['3.jpg', '00:05', '00:08', 'Third line here'],
              ].map((row, i) => (
                <tr key={i} className="hover:bg-slate-800/40 transition-colors">
                  {row.map((cell, j) => (
                    <td key={j} className="px-4 py-2.5 font-mono text-xs text-slate-300">
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Time format info */}
      <div className="rounded-xl bg-brand-900/20 border border-brand-700/20 p-4 space-y-2">
        <div className="flex items-center gap-2 text-brand-300 text-xs font-semibold">
          <IconInfo size={14} />
          Accepted time formats
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {['00:02', '00:01.500', '00:00:02', '00:00:02.500'].map((fmt) => (
            <code
              key={fmt}
              className="block text-center text-xs bg-surface-900/60 border border-slate-700/50 rounded-lg px-2 py-1.5 text-slate-300 font-mono"
            >
              {fmt}
            </code>
          ))}
        </div>
      </div>

      {/* Rules */}
      <ul className="space-y-1.5 text-xs text-slate-400">
        <li className="flex items-start gap-2">
          <span className="mt-0.5 text-red-400 font-bold">*</span>
          <span>
            <strong className="text-slate-300">image</strong>, <strong className="text-slate-300">start</strong>, and{' '}
            <strong className="text-slate-300">end</strong> are required columns.
          </span>
        </li>
        <li className="flex items-start gap-2">
          <span className="mt-0.5 text-slate-500">·</span>
          <span>
            Image names must match files inside your ZIP (e.g. <code className="text-slate-300">1.jpg</code>).
          </span>
        </li>
        <li className="flex items-start gap-2">
          <span className="mt-0.5 text-slate-500">·</span>
          <span>
            <strong className="text-slate-300">end</strong> must always be greater than{' '}
            <strong className="text-slate-300">start</strong>.
          </span>
        </li>
        <li className="flex items-start gap-2">
          <span className="mt-0.5 text-slate-500">·</span>
          <span>Supported image formats: jpg, jpeg, png, webp.</span>
        </li>
      </ul>
    </div>
  )
}
