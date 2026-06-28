import React, { useEffect, useState, useMemo } from 'react'
import {
  IconHistory,
  IconTrash,
  IconDownload,
  IconAlertCircle,
  IconZap,
  IconFilm,
  IconGrid,
  IconMusic,
  IconFileText,
} from './icons'

function IconSearch({ size = 16, className = '' }: { size?: number, className?: string }) {
  return (
    <svg width={size} height={size} className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8"></circle>
      <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
    </svg>
  )
}
import { getHistory, deleteHistoryItem, clearHistory } from '../utils/api'
import { loadSettings } from '../utils/appSettings'
import StudioPageHeader from './StudioPageHeader'

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleString(undefined, {
      month: 'short', day: 'numeric', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    })
  } catch { return iso }
}

function getToolMeta(tool: string): { label: string; color: string; bg: string; border: string; icon: React.ReactNode } {
  switch (tool) {
    case 'image_timeline': case 'image':
      return { label: 'Image Timeline', color: '#0ea5e9', bg: 'rgba(14,165,233,0.10)', border: 'rgba(14,165,233,0.25)', icon: <IconFilm size={13} /> }
    case 'video_timeline': case 'video':
      return { label: 'Video Timeline', color: '#8b5cf6', bg: 'rgba(139,92,246,0.10)', border: 'rgba(139,92,246,0.25)', icon: <IconFilm size={13} /> }
    case 'media_timeline': case 'media':
      return { label: 'Media Timeline', color: '#3b82f6', bg: 'rgba(59,130,246,0.10)', border: 'rgba(59,130,246,0.25)', icon: <IconGrid size={13} /> }
    case 'audio_merger':
      return { label: 'Audio Merger', color: '#10b981', bg: 'rgba(16,185,129,0.10)', border: 'rgba(16,185,129,0.25)', icon: <IconMusic size={13} /> }
    case 'script_timestamp':
      return { label: 'Script Timestamp', color: '#f59e0b', bg: 'rgba(245,158,11,0.10)', border: 'rgba(245,158,11,0.25)', icon: <IconFileText size={13} /> }
    default:
      return { label: tool || 'Unknown', color: '#94a3b8', bg: 'rgba(148,163,184,0.10)', border: 'rgba(148,163,184,0.20)', icon: <IconZap size={13} /> }
  }
}

const FILTER_OPTIONS = [
  { key: 'all',              label: 'All' },
  { key: 'image_timeline',   label: 'Image Timeline' },
  { key: 'video_timeline',   label: 'Video Timeline' },
  { key: 'media_timeline',   label: 'Media Timeline' },
  { key: 'audio_merger',     label: 'Audio Merger' },
  { key: 'script_timestamp', label: 'Script Timestamp' },
]

// ── Inline icon ───────────────────────────────────────────────────────────────
function IconSearch2({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
    </svg>
  )
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function StudioHistoryPage() {
  const [history, setHistory]           = useState<any[]>([])
  const [loading, setLoading]           = useState(true)
  const [showClearConfirm, setShowClearConfirm] = useState(false)
  const [deletingId, setDeletingId]     = useState<string | null>(null)
  const [filterTool, setFilterTool]     = useState('all')
  const [searchQuery, setSearchQuery]   = useState('')

  const loadHistory = async () => {
    setLoading(true)
    try {
      const data = await getHistory()
      setHistory(data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadHistory() }, [])

  const handleDelete = async (id: string) => {
    try {
      setDeletingId(id)
      await deleteHistoryItem(id)
      setHistory(prev => prev.filter(item => item.id !== id))
    } catch {
      alert('Failed to delete history item')
    } finally {
      setDeletingId(null)
    }
  }

  const handleClearAll = async () => {
    try {
      await clearHistory()
      setHistory([])
      setShowClearConfirm(false)
    } catch {
      alert('Failed to clear history')
    }
  }

  const handleDownload = (item: any) => {
    if (!item.output_url) return
    const a = document.createElement('a')
    a.href = item.output_url
    a.download = item.output_name || 'export'
    a.target = '_blank'
    a.rel = 'noopener noreferrer'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
  }

  const filtered = useMemo(() => {
    let list = history
    if (filterTool !== 'all') {
      list = list.filter(item => {
        const t = (item.tool || '').toLowerCase()
        const key = filterTool.replace('_timeline', '').replace('_merger', '').replace('_timestamp', '')
        return t === filterTool || t === key
      })
    }
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase()
      list = list.filter(item =>
        (item.output_name || '').toLowerCase().includes(q) ||
        (item.tool_label || item.tool || '').toLowerCase().includes(q)
      )
    }
    return [...list].sort((a, b) => b.created_at.localeCompare(a.created_at))
  }, [history, filterTool, searchQuery])

  return (
    <div className="w-full px-5 sm:px-8 py-8 space-y-6 animate-fade-in" style={{ maxWidth: 1280 }}>

      <StudioPageHeader
        icon={<IconHistory size={17} />}
        title="History"
        subtitle="Review, open, and download your generated videos, audio files, and timestamp exports."
        actions={
          history.length > 0 ? (
            <button
              onClick={() => {
                const s = loadSettings()
                if (s.confirmBeforeClearHistory) { setShowClearConfirm(true) } else { handleClearAll() }
              }}
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-all hover:bg-red-500/10 text-red-500"
              style={{ border: '1px solid rgba(239,68,68,0.25)' }}
            >
              <IconTrash size={13} />
              Clear History
            </button>
          ) : undefined
        }
      />

      {/* Clear confirm */}
      {showClearConfirm && (
        <div className="card p-5 flex flex-col sm:flex-row items-start sm:items-center gap-4" style={{ background: 'rgba(239,68,68,0.04)', borderColor: 'rgba(239,68,68,0.20)' }}>
          <IconAlertCircle size={20} style={{ color: '#ef4444', flexShrink: 0 }} />
          <div className="flex-1">
            <h3 className="font-bold text-sm mb-0.5" style={{ color: '#ef4444' }}>Clear all history?</h3>
            <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
              This only removes history records — it does not delete generated files from your disk.
            </p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setShowClearConfirm(false)} className="px-3 py-1.5 rounded-xl text-xs font-bold" style={{ background: 'var(--bg-elevated)', color: 'var(--text-primary)', border: '1px solid var(--border-default)' }}>
              Cancel
            </button>
            <button onClick={handleClearAll} className="px-3 py-1.5 rounded-xl text-xs font-bold text-white" style={{ background: '#ef4444' }}>
              Confirm Clear
            </button>
          </div>
        </div>
      )}

      {/* ── Filters + Search ── */}
      {!loading && history.length > 0 && (
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
          {/* Tool filter pills */}
          <div className="flex items-center gap-1.5 flex-wrap">
            {FILTER_OPTIONS.map(opt => (
              <button
                key={opt.key}
                onClick={() => setFilterTool(opt.key)}
                className="text-[11px] font-bold px-2.5 py-1 rounded-lg transition-all"
                style={{
                  background: filterTool === opt.key ? 'var(--accent-subtle)' : 'var(--bg-elevated)',
                  color: filterTool === opt.key ? 'var(--accent-primary)' : 'var(--text-secondary)',
                  border: filterTool === opt.key ? '1px solid var(--accent-border)' : '1px solid var(--border-subtle)',
                }}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {/* Search */}
          <div className="relative flex-1 sm:max-w-xs ml-auto">
            <span className="absolute left-2.5 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }}>
              <IconSearch2 size={13} />
            </span>
            <input
              type="text"
              placeholder="Search by filename…"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="form-input text-xs pl-7 py-1.5"
            />
          </div>
        </div>
      )}

      {/* ── Table ── */}
      <div className="card overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20 gap-3" style={{ color: 'var(--text-muted)' }}>
            <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin opacity-60" />
            <span className="text-sm font-medium">Loading history…</span>
          </div>
        ) : history.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center px-8">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-5" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)' }}>
              <IconHistory size={26} style={{ color: 'var(--text-muted)' }} />
            </div>
            <h2 className="text-lg font-bold mb-2" style={{ color: 'var(--text-primary)' }}>No history yet</h2>
            <p className="text-sm max-w-sm" style={{ color: 'var(--text-secondary)' }}>
              No history yet. Your generated videos, audio files, and timestamp exports will appear here.
            </p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center px-8">
            <p className="text-sm font-medium" style={{ color: 'var(--text-muted)' }}>No results match your current filter.</p>
            <button onClick={() => { setFilterTool('all'); setSearchQuery('') }} className="mt-3 text-xs font-bold" style={{ color: 'var(--accent-primary)' }}>Clear filters</button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead>
                <tr style={{ background: 'var(--bg-elevated)', color: 'var(--text-muted)', borderColor: 'var(--border-subtle)' }} className="border-b">
                  <th className="px-5 py-3.5 font-bold text-[10px] uppercase tracking-widest">Date</th>
                  <th className="px-5 py-3.5 font-bold text-[10px] uppercase tracking-widest">Tool</th>
                  <th className="px-5 py-3.5 font-bold text-[10px] uppercase tracking-widest">File Name</th>
                  <th className="px-5 py-3.5 font-bold text-[10px] uppercase tracking-widest hidden md:table-cell">Type</th>
                  <th className="px-5 py-3.5 font-bold text-[10px] uppercase tracking-widest hidden lg:table-cell">Duration</th>
                  <th className="px-5 py-3.5 font-bold text-[10px] uppercase tracking-widest text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((item, idx) => {
                  const meta = getToolMeta(item.tool_label || item.tool || '')
                  const isLast = idx === filtered.length - 1
                  return (
                    <tr
                      key={item.id}
                      className="group transition-colors"
                      style={{
                        borderBottom: !isLast ? '1px solid var(--border-subtle)' : undefined,
                      }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-card-hover)')}
                      onMouseLeave={e => (e.currentTarget.style.background = '')}
                    >
                      {/* Date */}
                      <td className="px-5 py-3.5 text-[11px] font-medium whitespace-nowrap" style={{ color: 'var(--text-muted)' }}>
                        {formatDate(item.created_at)}
                      </td>

                      {/* Tool badge */}
                      <td className="px-5 py-3.5">
                        <span
                          className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-lg"
                          style={{ background: meta.bg, color: meta.color, border: `1px solid ${meta.border}` }}
                        >
                          {meta.icon}
                          {meta.label}
                        </span>
                      </td>

                      {/* Filename */}
                      <td className="px-5 py-3.5 font-medium max-w-[200px]" style={{ color: 'var(--text-primary)' }}>
                        <span className="block truncate" title={item.output_name}>{item.output_name || '—'}</span>
                      </td>

                      {/* Type */}
                      <td className="px-5 py-3.5 text-xs hidden md:table-cell" style={{ color: 'var(--text-secondary)' }}>
                        {item.output_type
                          ? item.output_type.charAt(0).toUpperCase() + item.output_type.slice(1)
                          : '—'}
                        {item.file_extension && <span style={{ color: 'var(--text-muted)' }}>{` .${item.file_extension}`}</span>}
                      </td>

                      {/* Duration */}
                      <td className="px-5 py-3.5 text-xs hidden lg:table-cell" style={{ color: 'var(--text-secondary)' }}>
                        {item.duration_seconds ? `${item.duration_seconds}s` : '—'}
                      </td>

                      {/* Actions */}
                      <td className="px-5 py-3.5">
                        <div className="flex items-center justify-end gap-2">
                          {item.output_url ? (
                            <>
                              <a
                                href={item.output_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-[11px] font-bold flex items-center gap-1 px-2.5 py-1 rounded-lg transition-all"
                                style={{ background: 'var(--accent-subtle)', color: 'var(--accent-primary)', border: '1px solid var(--accent-border)' }}
                              >
                                Open
                              </a>
                              <button
                                onClick={() => handleDownload(item)}
                                className="flex items-center justify-center p-1.5 rounded-lg transition-all"
                                style={{ color: 'var(--text-secondary)', border: '1px solid var(--border-subtle)' }}
                                title="Download"
                              >
                                <IconDownload size={13} />
                              </button>
                            </>
                          ) : (
                            <span className="text-[10px] uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>No file link</span>
                          )}

                          <button
                            onClick={() => handleDelete(item.id)}
                            disabled={deletingId === item.id}
                            className="flex items-center justify-center p-1.5 rounded-lg transition-all hover:bg-red-500/10 disabled:opacity-40"
                            style={{ color: '#ef4444', border: '1px solid rgba(239,68,68,0.20)' }}
                            title="Delete record"
                          >
                            {deletingId === item.id
                              ? <div className="w-3 h-3 border border-current border-t-transparent rounded-full animate-spin" />
                              : <IconTrash size={13} />
                            }
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Footer count */}
        {!loading && filtered.length > 0 && (
          <div className="px-5 py-3 border-t flex items-center justify-between" style={{ borderColor: 'var(--border-subtle)' }}>
            <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
              Showing {filtered.length} of {history.length} record{history.length !== 1 ? 's' : ''}
            </span>
            {(filterTool !== 'all' || searchQuery) && (
              <button onClick={() => { setFilterTool('all'); setSearchQuery('') }} className="text-[11px] font-bold" style={{ color: 'var(--accent-primary)' }}>
                Clear filter
              </button>
            )}
          </div>
        )}
      </div>

    </div>
  )
}
