import React, { useEffect, useState } from 'react'
import { IconHistory, IconTrash, IconDownload, IconAlertCircle } from './icons'
import { getHistory, deleteHistoryItem, clearHistory } from '../utils/api'

export default function StudioHistoryPage() {
  const [history, setHistory] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showClearConfirm, setShowClearConfirm] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

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

  useEffect(() => {
    loadHistory()
  }, [])

  const handleDelete = async (id: string) => {
    try {
      setDeletingId(id)
      await deleteHistoryItem(id)
      setHistory(prev => prev.filter(item => item.id !== id))
    } catch (err) {
      console.error("Failed to delete history item", err)
      alert("Failed to delete history item")
    } finally {
      setDeletingId(null)
    }
  }

  const handleClearAll = async () => {
    try {
      await clearHistory()
      setHistory([])
      setShowClearConfirm(false)
    } catch (err) {
      console.error("Failed to clear history", err)
      alert("Failed to clear history")
    }
  }

  const formatDate = (isoString: string) => {
    try {
      const dt = new Date(isoString)
      return dt.toLocaleString()
    } catch {
      return isoString
    }
  }

  return (
    <div className="p-6 md:p-10 max-w-6xl mx-auto space-y-8">
      
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black mb-2" style={{ color: 'var(--text-primary)' }}>History</h1>
          <p className="text-sm font-medium" style={{ color: 'var(--text-muted)' }}>
            Log of your locally generated files and exports.
          </p>
        </div>
        
        {history.length > 0 && (
          <button 
            onClick={() => setShowClearConfirm(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all self-start sm:self-auto hover:bg-red-500/10 text-red-500"
            style={{ border: '1px solid var(--border-subtle)' }}
          >
            <IconTrash size={16} />
            Clear History
          </button>
        )}
      </header>

      {showClearConfirm && (
        <div className="card p-6 flex flex-col sm:flex-row items-center gap-4 bg-red-500/5 border-red-500/20">
          <IconAlertCircle size={24} className="text-red-500 shrink-0" />
          <div className="flex-1">
            <h3 className="font-bold text-red-500 mb-1">Clear all history?</h3>
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              Are you sure you want to clear all history? This only removes history records, not necessarily the output files from disk.
            </p>
          </div>
          <div className="flex gap-2 w-full sm:w-auto mt-4 sm:mt-0">
            <button 
              onClick={() => setShowClearConfirm(false)}
              className="flex-1 sm:flex-none px-4 py-2 rounded-xl text-sm font-bold bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10"
              style={{ color: 'var(--text-primary)' }}
            >
              Cancel
            </button>
            <button 
              onClick={handleClearAll}
              className="flex-1 sm:flex-none px-4 py-2 rounded-xl text-sm font-bold bg-red-500 text-white hover:bg-red-600 shadow-[0_4px_16px_rgba(239,68,68,0.35)]"
            >
              Confirm Clear
            </button>
          </div>
        </div>
      )}

      {/* History Table Container */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead>
              <tr style={{ background: 'var(--bg-elevated)', color: 'var(--text-muted)' }} className="border-b border-[var(--border-subtle)]">
                <th className="px-6 py-4 font-bold text-[11px] uppercase tracking-wider">Date</th>
                <th className="px-6 py-4 font-bold text-[11px] uppercase tracking-wider">Tool</th>
                <th className="px-6 py-4 font-bold text-[11px] uppercase tracking-wider">File Name</th>
                <th className="px-6 py-4 font-bold text-[11px] uppercase tracking-wider">Type / Format</th>
                <th className="px-6 py-4 font-bold text-[11px] uppercase tracking-wider">Duration</th>
                <th className="px-6 py-4 font-bold text-[11px] uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-16 text-center text-sm font-medium" style={{ color: 'var(--text-muted)' }}>
                    Loading history...
                  </td>
                </tr>
              ) : history.length === 0 ? (
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
              ) : (
                history.map(item => (
                  <tr key={item.id} className="border-b border-[var(--border-subtle)] hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
                    <td className="px-6 py-4 text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
                      {formatDate(item.created_at)}
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-2.5 py-1 rounded-md text-[11px] font-bold tracking-wide" style={{ background: 'var(--bg-elevated)', color: 'var(--text-primary)' }}>
                        {item.tool_label || item.tool}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-medium" style={{ color: 'var(--text-primary)' }}>
                      {item.output_name}
                    </td>
                    <td className="px-6 py-4 text-[13px]" style={{ color: 'var(--text-secondary)' }}>
                      {item.output_type ? (item.output_type.charAt(0).toUpperCase() + item.output_type.slice(1)) : '—'}
                      {item.file_extension && ` / .${item.file_extension}`}
                    </td>
                    <td className="px-6 py-4 text-[13px]" style={{ color: 'var(--text-secondary)' }}>
                      {item.duration_seconds ? `${item.duration_seconds}s` : '—'}
                    </td>
                    <td className="px-6 py-4 text-right flex items-center justify-end gap-3">
                      {item.output_url ? (
                        <a 
                          href={item.output_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-violet-500 hover:text-violet-400 font-bold text-sm flex items-center gap-1"
                        >
                          <IconDownload size={14} /> Open
                        </a>
                      ) : (
                        <span className="text-[11px] uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>No file link</span>
                      )}
                      
                      <button 
                        onClick={() => handleDelete(item.id)}
                        disabled={deletingId === item.id}
                        className="text-red-500 hover:text-red-400 p-1 rounded hover:bg-red-500/10 transition-colors disabled:opacity-50"
                        title="Delete record"
                      >
                        <IconTrash size={16} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  )
}
