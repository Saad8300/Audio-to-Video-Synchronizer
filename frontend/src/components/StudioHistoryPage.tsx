import React from 'react'
import { IconHistory } from './icons'

export default function StudioHistoryPage() {
  return (
    <div className="p-6 md:p-10 max-w-6xl mx-auto space-y-8">
      
      <header>
        <h1 className="text-2xl font-black mb-2" style={{ color: 'var(--text-primary)' }}>History</h1>
        <p className="text-sm font-medium" style={{ color: 'var(--text-muted)' }}>
          Log of your locally generated files and exports.
        </p>
      </header>

      {/* History Table Container */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead>
              <tr style={{ background: 'var(--bg-elevated)', color: 'var(--text-muted)' }} className="border-b border-[var(--border-subtle)]">
                <th className="px-6 py-4 font-bold text-[11px] uppercase tracking-wider">Date</th>
                <th className="px-6 py-4 font-bold text-[11px] uppercase tracking-wider">Tool</th>
                <th className="px-6 py-4 font-bold text-[11px] uppercase tracking-wider">File Name</th>
                <th className="px-6 py-4 font-bold text-[11px] uppercase tracking-wider">Type</th>
                <th className="px-6 py-4 font-bold text-[11px] uppercase tracking-wider">Duration</th>
                <th className="px-6 py-4 font-bold text-[11px] uppercase tracking-wider text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {/* Empty state embedded in table for clean look */}
              <tr>
                <td colSpan={6} className="px-6 py-16 text-center">
                  <div className="flex flex-col items-center justify-center">
                    <div className="w-16 h-16 rounded-full flex items-center justify-center mb-4 bg-black/5 dark:bg-white/5">
                      <IconHistory size={28} style={{ color: 'var(--text-muted)' }} />
                    </div>
                    <h2 className="text-lg font-bold mb-2" style={{ color: 'var(--text-primary)' }}>No history yet</h2>
                    <p className="text-sm max-w-md" style={{ color: 'var(--text-secondary)' }}>
                      Your generated videos, audio files, and timestamp exports will appear here.
                    </p>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

    </div>
  )
}
