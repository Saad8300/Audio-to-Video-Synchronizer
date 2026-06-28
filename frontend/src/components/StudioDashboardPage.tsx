import React, { useEffect, useState } from 'react'
import {
  IconVideo,
  IconMusic,
  IconFileText,
  IconDownload,
  IconZap,
  IconHistory
} from './icons'
import { getHistoryStats } from '../utils/api'

export default function StudioDashboardPage() {
  const [stats, setStats] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getHistoryStats()
      .then(data => {
        setStats(data)
        setLoading(false)
      })
      .catch(err => {
        console.error("Failed to load dashboard stats", err)
        setLoading(false)
      })
  }, [])

  if (loading) {
    return (
      <div className="p-6 md:p-10 max-w-6xl mx-auto flex items-center justify-center">
        <p className="text-sm font-medium" style={{ color: 'var(--text-muted)' }}>Loading stats...</p>
      </div>
    )
  }

  const hasActivity = stats && stats.total_exports > 0

  const statCards = [
    { label: 'Videos Generated', value: stats?.total_videos || 0, icon: <IconVideo size={20} className="text-violet-500" /> },
    { label: 'Audio Merged', value: stats?.tool_counts?.audio_merger || 0, icon: <IconMusic size={20} className="text-emerald-500" /> },
    { label: 'Timestamps Created', value: stats?.tool_counts?.script_timestamp || 0, icon: <IconFileText size={20} className="text-amber-500" /> },
    { label: 'Total Exports', value: stats?.total_exports || 0, icon: <IconDownload size={20} className="text-sky-500" /> },
    { label: 'Most Used Tool', value: stats?.most_used_tool || 'None', icon: <IconZap size={20} className="text-blue-500" /> },
    { label: 'Last Activity', value: stats?.last_activity || 'No data yet', icon: <IconHistory size={20} className="text-gray-400" /> },
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
        {statCards.map(s => (
          <div key={s.label} className="card p-5 flex items-center gap-4">
            <div className="p-3 rounded-xl bg-black/5 dark:bg-white/5 shrink-0">
              {s.icon}
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-bold tracking-wider uppercase mb-1" style={{ color: 'var(--text-muted)' }}>{s.label}</p>
              <p className="text-xl font-black truncate" style={{ color: 'var(--text-primary)' }}>{s.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Empty State */}
      {!hasActivity && (
        <div className="card p-12 flex flex-col items-center justify-center text-center mt-8 border-dashed animate-fade-in-up" style={{ borderColor: 'var(--border-default)', animationDelay: '100ms' }}>
          <div className="w-16 h-16 rounded-full flex items-center justify-center mb-5 bg-[var(--bg-input)]">
            <IconHistory size={28} style={{ color: 'var(--text-muted)' }} />
          </div>
          <h2 className="text-xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>No activity yet</h2>
          <p className="text-sm font-medium max-w-md" style={{ color: 'var(--text-secondary)' }}>
            Generate your first video, audio file, or timestamp export to start building stats.
          </p>
        </div>
      )}

      {hasActivity && stats.total_generated_duration > 0 && (
        <div className="card p-5 flex items-center justify-between">
          <div>
            <p className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>Total Generated Duration</p>
            <p className="text-[12px] font-medium mt-1" style={{ color: 'var(--text-muted)' }}>Sum of all exported media durations</p>
          </div>
          <p className="text-xl font-black" style={{ color: 'var(--text-primary)' }}>
            {(stats.total_generated_duration / 60).toFixed(1)} mins
          </p>
        </div>
      )}
    </div>
  )
}
