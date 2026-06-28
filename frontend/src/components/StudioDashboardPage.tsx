import React from 'react'
import {
  IconVideo,
  IconMusic,
  IconFileText,
  IconDownload,
  IconZap,
  IconHistory
} from './icons'

export default function StudioDashboardPage() {
  const stats = [
    { label: 'Videos Generated', value: '0', icon: <IconVideo size={20} className="text-violet-500" /> },
    { label: 'Audio Merged', value: '0', icon: <IconMusic size={20} className="text-emerald-500" /> },
    { label: 'Timestamps Created', value: '0', icon: <IconFileText size={20} className="text-amber-500" /> },
    { label: 'Total Exports', value: '0', icon: <IconDownload size={20} className="text-sky-500" /> },
    { label: 'Most Used Tool', value: 'None', icon: <IconZap size={20} className="text-blue-500" /> },
    { label: 'Last Activity', value: 'No data yet', icon: <IconHistory size={20} className="text-gray-400" /> },
  ]

  return (
    <div className="p-6 md:p-10 max-w-6xl mx-auto space-y-8">
      
      <header>
        <h1 className="text-2xl font-black mb-2" style={{ color: 'var(--text-primary)' }}>Dashboard</h1>
        <p className="text-sm font-medium" style={{ color: 'var(--text-muted)' }}>
          Overview of your local Studio activity.
        </p>
      </header>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {stats.map(s => (
          <div key={s.label} className="card p-5 flex items-center gap-4">
            <div className="p-3 rounded-xl bg-black/5 dark:bg-white/5">
              {s.icon}
            </div>
            <div>
              <p className="text-[11px] font-bold tracking-wider uppercase mb-1" style={{ color: 'var(--text-muted)' }}>{s.label}</p>
              <p className="text-xl font-black" style={{ color: 'var(--text-primary)' }}>{s.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Empty State */}
      <div className="card p-10 flex flex-col items-center justify-center text-center mt-8 border-dashed" style={{ borderColor: 'var(--border-default)' }}>
        <div className="w-16 h-16 rounded-full flex items-center justify-center mb-4 bg-black/5 dark:bg-white/5">
          <IconHistory size={28} style={{ color: 'var(--text-muted)' }} />
        </div>
        <h2 className="text-lg font-bold mb-2" style={{ color: 'var(--text-primary)' }}>No activity yet</h2>
        <p className="text-sm max-w-md" style={{ color: 'var(--text-secondary)' }}>
          Generate your first video or audio file to start building stats. All activity is stored locally on your machine.
        </p>
      </div>

    </div>
  )
}
