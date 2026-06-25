// components/FileDropZone.tsx – Compact professional drag-and-drop upload area

import React, { useCallback, useRef, useState } from 'react'
import { IconCheck, IconX } from './icons'

interface FileDropZoneProps {
  id:          string
  label:       string
  description: string
  accept:      string
  icon:        React.ReactNode
  file:        File | null
  onChange:    (file: File | null) => void
  disabled?:   boolean
  required?:   boolean
  compact?:    boolean
}

export default function FileDropZone({
  id,
  label,
  description,
  accept,
  icon,
  file,
  onChange,
  disabled,
  required,
  compact,
}: FileDropZoneProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)

  const handleFile = useCallback(
    (f: File | null) => { if (!f || disabled) return; onChange(f) },
    [onChange, disabled],
  )

  const onDragOver  = (e: React.DragEvent) => { if (disabled) return; e.preventDefault(); setDragging(true) }
  const onDragLeave = () => setDragging(false)
  const onDrop      = (e: React.DragEvent) => {
    e.preventDefault(); setDragging(false)
    if (disabled) return
    const dropped = e.dataTransfer.files[0]
    if (dropped) handleFile(dropped)
  }

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  const zoneClass = [
    'dropzone',
    compact ? 'px-3 py-2.5' : 'px-4 py-3',
    dragging && !disabled ? 'dropzone-active' : '',
    file ? 'dropzone-filled' : '',
    disabled ? 'opacity-50 pointer-events-none' : '',
  ].filter(Boolean).join(' ')

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between gap-2">
        <label htmlFor={id} className="form-label mb-0">{label}</label>
        {required && !file && (
          <span
            className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded"
            style={{ color: 'var(--color-error)', background: 'var(--color-error-bg)', border: '1px solid var(--color-error-border)' }}
          >
            Required
          </span>
        )}
        {file && (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onChange(null) }}
            className="btn-ghost p-0.5 rounded-md text-[10px]"
            aria-label={`Remove ${label}`}
            title="Remove file"
          >
            <IconX size={12} />
          </button>
        )}
      </div>

      <div
        className={zoneClass}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        onClick={() => !disabled && inputRef.current?.click()}
        role="button"
        tabIndex={disabled ? -1 : 0}
        aria-label={`Upload ${label}`}
        aria-disabled={disabled}
        onKeyDown={(e) => !disabled && e.key === 'Enter' && inputRef.current?.click()}
      >
        <input
          ref={inputRef}
          id={id}
          type="file"
          accept={accept}
          className="sr-only"
          disabled={disabled}
          onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
        />

        {file ? (
          <div className="flex items-center gap-2.5 w-full animate-fade-in">
            <div
              className="w-7 h-7 rounded-md shrink-0 flex items-center justify-center"
              style={{ background: 'var(--color-success-bg)', border: '1px solid var(--color-success-border)', color: 'var(--color-success)' }}
            >
              <IconCheck size={13} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold truncate" style={{ color: 'var(--color-success)' }}>{file.name}</p>
              <p className="text-[10px] truncate" style={{ color: 'var(--text-muted)' }}>{formatSize(file.size)}</p>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2.5 w-full">
            <div
              className="w-7 h-7 rounded-md shrink-0 flex items-center justify-center transition-colors"
              style={{ background: 'var(--bg-input)', border: '1px solid var(--border-input)', color: 'var(--text-muted)' }}
            >
              {icon}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium truncate" style={{ color: 'var(--text-secondary)' }}>
                Drop or <span style={{ color: 'var(--accent-primary)' }}>browse</span>
              </p>
              <p className="text-[10px] truncate mt-0.5" style={{ color: 'var(--text-muted)' }}>{description}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
