import React, { useState, useEffect } from 'react'
import StudioPageHeader from './StudioPageHeader'
import {
  IconFilm, IconPlay, IconPause, IconSquare, IconTrash,
  IconLoader, IconPlus
} from './icons'
import {
  getBatchJobs, getBatchStats, deleteBatchJob,
  clearCompletedBatchJobs, getBatchState, startBatchQueue,
  pauseBatchAfterCurrent, stopBatchQueue, retryFailedBatchJobs,
  retryBatchJob, BatchState
} from '../utils/api'

export default function BatchVideoGeneratorPage() {
  const [jobs, setJobs] = useState<any[]>([])
  const [stats, setStats] = useState<any>({
    total: 0, queued: 0, running: 0, completed: 0, failed: 0, cancelled: 0
  })
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  const [batchState, setBatchState] = useState<BatchState | null>(null)
  const [isQueueLoading, setIsQueueLoading] = useState(false)
  
  const loadData = async () => {
    try {
      const [j, s, st] = await Promise.all([getBatchJobs(), getBatchStats(), getBatchState()])
      setJobs(j)
      setStats(s)
      setBatchState(st)
      setError(null)
    } catch (err) {
      setError(String(err))
    } finally {
      setIsLoading(false)
    }
  }

  // Polling logic
  useEffect(() => {
    loadData()
    const interval = setInterval(() => {
      loadData()
    }, batchState?.is_running ? 2000 : 8000)
    return () => clearInterval(interval)
  }, [batchState?.is_running])

  const handleDelete = async (id: string) => {
    if (batchState?.current_job_id === id) {
      alert("Cannot delete a running job. Stop the queue after current job first.")
      return
    }
    try {
      await deleteBatchJob(id)
      loadData()
    } catch (err) {
      alert("Failed to delete job: " + err)
    }
  }

  const handleClearCompleted = async () => {
    try {
      await clearCompletedBatchJobs()
      loadData()
    } catch (err) {
      alert("Failed to clear completed: " + err)
    }
  }

  const handleStartQueue = async () => {
    setIsQueueLoading(true)
    try {
      await startBatchQueue()
      await loadData()
    } catch (e) {
      alert("Failed to start queue: " + e)
    } finally { setIsQueueLoading(false) }
  }

  const handlePauseQueue = async () => {
    setIsQueueLoading(true)
    try {
      await pauseBatchAfterCurrent()
      await loadData()
    } catch (e) {
      alert("Failed to pause queue: " + e)
    } finally { setIsQueueLoading(false) }
  }

  const handleStopQueue = async () => {
    setIsQueueLoading(true)
    try {
      await stopBatchQueue()
      await loadData()
    } catch (e) {
      alert("Failed to stop queue: " + e)
    } finally { setIsQueueLoading(false) }
  }

  const handleRetryFailed = async () => {
    setIsQueueLoading(true)
    try {
      await retryFailedBatchJobs()
      await loadData()
    } catch (e) {
      alert("Failed to retry jobs: " + e)
    } finally { setIsQueueLoading(false) }
  }

  const handleRetrySingle = async (id: string) => {
    try {
      await retryBatchJob(id)
      await loadData()
    } catch (e) {
      alert("Failed to retry job: " + e)
    }
  }



  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-[400px]">
        <IconLoader size={32} className="animate-spin" style={{ color: 'var(--text-muted)' }} />
      </div>
    )
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 pt-8 pb-12">
        <StudioPageHeader icon={<IconFilm size={16} />} title="Batch Video Generator" />
        <div className="mt-8 p-6 rounded-2xl border" style={{ background: 'var(--color-error-bg)', borderColor: 'var(--color-error-border)' }}>
          <h3 className="text-sm font-bold" style={{ color: 'var(--color-error)' }}>Failed to connect to backend</h3>
          <p className="text-xs mt-2 opacity-80" style={{ color: 'var(--color-error)' }}>{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 pt-8 pb-12">
      <StudioPageHeader
        icon={<IconFilm size={16} />}
        title="Batch Video Generator"
      />

      <div className="mt-8 space-y-6">
        
        {/* ── QUEUE OVERVIEW ── */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <StatCard title="Total Jobs" value={stats.total} color="var(--text-primary)" />
          <StatCard title="Queued" value={stats.queued} color="#3b82f6" />
          <StatCard title="Running" value={stats.running} color="#a855f7" />
          <StatCard title="Completed" value={stats.completed} color="#10b981" />
          <StatCard title="Failed" value={stats.failed} color="#ef4444" />
        </div>

        {/* ── QUEUE STATUS BANNER ── */}
        {batchState && batchState.is_running && (
          <div className="card p-4 flex items-center justify-between" style={{ background: 'var(--bg-input)', borderColor: '#a855f7' }}>
            <div className="flex items-center gap-3">
              <IconLoader size={18} className="animate-spin" style={{ color: '#a855f7' }} />
              <div>
                <div className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
                  {batchState.stopping ? "Stopping Queue..." : batchState.paused_after_current ? "Pausing after current job..." : "Queue is Running"}
                </div>
                <div className="text-xs" style={{ color: 'var(--text-muted)' }}>{batchState.message}</div>
              </div>
            </div>
            <div className="text-sm font-semibold" style={{ color: '#a855f7' }}>
              {stats.completed} / {stats.total} Completed
            </div>
          </div>
        )}

        {/* ── QUEUE CONTROLS ── */}
        <div className="card p-4 flex flex-wrap items-center gap-3">
          <button 
            onClick={handleStartQueue}
            disabled={isQueueLoading || stats.queued === 0 || (batchState?.is_running && !batchState.stopping)} 
            className={`btn-control ${(!batchState?.is_running && stats.queued > 0) ? 'hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer' : 'opacity-50 cursor-not-allowed'}`}
          >
            <IconPlay size={16} /> Start Queue
          </button>
          <button 
            onClick={handlePauseQueue}
            disabled={isQueueLoading || !batchState?.is_running || batchState.paused_after_current || batchState.stopping} 
            className={`btn-control ${batchState?.is_running && !batchState.paused_after_current && !batchState.stopping ? 'hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer' : 'opacity-50 cursor-not-allowed'}`}
          >
            <IconPause size={16} /> Pause After Current
          </button>
          <button 
            onClick={handleStopQueue}
            disabled={isQueueLoading || !batchState?.is_running || batchState.stopping} 
            className={`btn-control ${batchState?.is_running && !batchState.stopping ? 'hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer' : 'opacity-50 cursor-not-allowed'}`}
          >
            <IconSquare size={16} /> Stop Queue
          </button>
          <button 
            onClick={handleRetryFailed}
            disabled={isQueueLoading || stats.failed === 0} 
            className={`btn-control ${stats.failed > 0 ? 'hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer' : 'opacity-50 cursor-not-allowed'}`}
          >
            <IconLoader size={16} /> Retry Failed
          </button>
          
          <div className="flex-1" />
          <button 
            onClick={handleClearCompleted}
            disabled={stats.completed === 0 && stats.failed === 0 && stats.cancelled === 0}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${stats.completed > 0 || stats.failed > 0 ? 'hover:bg-red-500/10' : 'opacity-50 cursor-not-allowed'}`}
            style={{ color: 'var(--color-error)' }}
          >
            <IconTrash size={14} /> Clear Completed
          </button>
        </div>

        {/* ── EMPTY STATE ── */}
        {jobs.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 text-center rounded-2xl border border-dashed" style={{ borderColor: 'var(--border-default)', background: 'var(--bg-elevated)' }}>
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4" style={{ background: 'var(--bg-input)' }}>
              <IconFilm size={28} style={{ color: 'var(--text-muted)' }} />
            </div>
            <h3 className="text-base font-bold mb-2" style={{ color: 'var(--text-primary)' }}>No batch jobs yet</h3>
            <p className="text-sm max-w-md mx-auto" style={{ color: 'var(--text-muted)' }}>
              Add videos to the batch queue from Image Timeline, Video Timeline, or Media Timeline. In the next step, queued jobs will render one by one automatically.
            </p>
          </div>
        ) : (
          /* ── JOB LIST ── */
          <div className="space-y-3">
            {jobs.map(job => (
              <div key={job.id} className="card p-4 flex flex-col md:flex-row md:items-center gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-bold px-2 py-0.5 rounded" style={{ background: 'var(--bg-input)', color: 'var(--text-primary)' }}>
                      {job.source_tool_label}
                    </span>
                    <span className="text-[11px] font-semibold tracking-wide uppercase" style={{ color: getStatusColor(job.status) }}>
                      {job.status}
                    </span>
                  </div>
                  <h4 className="text-sm font-bold truncate" style={{ color: 'var(--text-primary)' }}>{job.title}</h4>
                  <p className="text-xs truncate mt-0.5" style={{ color: 'var(--text-muted)' }}>
                    {job.export_preset || job.aspect_ratio} • {job.output_name}
                  </p>
                  
                  {/* Progress and messages */}
                  {job.status === 'running' && (
                    <div className="mt-2 w-full max-w-xs bg-gray-200 rounded-full h-1.5 dark:bg-gray-700">
                      <div className="bg-purple-500 h-1.5 rounded-full" style={{ width: `${job.progress}%` }}></div>
                      <div className="text-[10px] mt-1 text-purple-500 font-medium">{job.progress}% - {job.message}</div>
                    </div>
                  )}
                  {job.status === 'failed' && (
                    <div className="mt-1 text-[11px] font-semibold text-red-500 truncate max-w-md">
                      {job.message}
                    </div>
                  )}
                </div>
                
                <div className="shrink-0 flex items-center gap-2">
                  {job.status === 'completed' && job.output_url && (
                    <>
                      <a 
                        href={`http://127.0.0.1:8000${job.output_url}`}
                        target="_blank" rel="noreferrer"
                        className="px-3 py-1.5 rounded-lg text-xs font-bold transition-colors hover:bg-black/5 dark:hover:bg-white/5"
                        style={{ color: 'var(--text-primary)', border: '1px solid var(--border-default)' }}
                      >
                        Open
                      </a>
                      <a 
                        href={`http://127.0.0.1:8000${job.output_url}`}
                        download
                        className="px-3 py-1.5 rounded-lg text-xs font-bold text-white transition-colors hover:opacity-90 shadow-sm"
                        style={{ background: 'var(--color-accent)' }}
                      >
                        Download
                      </a>
                    </>
                  )}
                  {job.status === 'failed' && (
                    <button 
                      onClick={() => handleRetrySingle(job.id)}
                      className="px-3 py-1.5 rounded-lg text-xs font-bold transition-colors hover:bg-black/5 dark:hover:bg-white/5"
                      style={{ color: 'var(--text-primary)', border: '1px solid var(--border-default)' }}
                    >
                      Retry
                    </button>
                  )}
                  <button 
                    onClick={() => handleDelete(job.id)}
                    disabled={job.status === 'running'}
                    className={`p-2 rounded-lg transition-colors ${job.status === 'running' ? 'opacity-30 cursor-not-allowed' : 'hover:bg-black/10 dark:hover:bg-white/10'}`}
                    style={{ color: 'var(--text-muted)' }}
                    title={job.status === 'running' ? "Cannot delete running job" : "Delete Job"}
                  >
                    <IconTrash size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <style>{`
        .btn-control {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.5rem 1rem;
          border-radius: 0.75rem;
          font-size: 0.875rem;
          font-weight: 600;
          background: var(--bg-input);
          color: var(--text-primary);
          border: 1px solid var(--border-default);
          transition: all 0.2s;
        }
      `}</style>
    </div>
  )
}

function StatCard({ title, value, color }: { title: string; value: number; color: string }) {
  return (
    <div className="card p-4 flex flex-col gap-1 border-t-2" style={{ borderTopColor: color }}>
      <span className="text-[11px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>{title}</span>
      <span className="text-2xl font-black" style={{ color: 'var(--text-primary)' }}>{value}</span>
    </div>
  )
}

function getStatusColor(status: string) {
  switch (status) {
    case 'queued': return '#3b82f6'
    case 'running': return '#a855f7'
    case 'completed': return '#10b981'
    case 'failed': return '#ef4444'
    case 'cancelled': return '#9ca3af'
    default: return 'var(--text-muted)'
  }
}
