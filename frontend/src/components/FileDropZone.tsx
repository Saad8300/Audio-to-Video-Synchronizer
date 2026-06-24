// components/FileDropZone.tsx – Drag-and-drop file upload area

import React, { useCallback, useRef, useState } from 'react'
import { IconCheck } from './icons'

interface FileDropZoneProps {
  id: string
  label: string
  description: string
  accept: string
  icon: React.ReactNode
  file: File | null
  onChange: (file: File | null) => void
  disabled?: boolean
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
}: FileDropZoneProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)

  const handleFile = useCallback(
    (f: File | null) => {
      if (!f || disabled) return
      onChange(f)
    },
    [onChange, disabled],
  )

  const onDragOver = (e: React.DragEvent) => {
    if (disabled) return
    e.preventDefault()
    setDragging(true)
  }

  const onDragLeave = () => setDragging(false)

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
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
    'dropzone min-h-[4.5rem] px-4 py-3',
    dragging && !disabled ? 'dropzone-active' : '',
    file ? 'dropzone-filled' : '',
    disabled ? 'opacity-50 pointer-events-none' : '',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className={`form-label ${disabled ? 'opacity-50' : ''}`}>
        {label}
      </label>

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
          // Filled state
          <div className="flex items-center gap-3 w-full animate-fade-in">
            <div className="w-8 h-8 rounded-full shrink-0 bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <IconCheck size={14} />
            </div>
            <div className="flex-1 min-w-0 text-left">
              <p className="text-sm font-semibold text-emerald-400 truncate">
                {file.name}
              </p>
              <p className="text-xs text-muted truncate">{formatSize(file.size)} · Click to replace</p>
            </div>
          </div>
        ) : (
          // Empty state
          <div className="flex items-center gap-3 w-full">
            <div
              className="w-8 h-8 rounded-full shrink-0 flex items-center justify-center text-muted transition-colors"
              style={{ backgroundColor: 'var(--color-surface-input)', border: '1px solid var(--color-surface-input-border)' }}
            >
              {icon}
            </div>
            <div className="flex-1 min-w-0 text-left">
              <p className="text-sm font-medium text-secondary truncate">
                Drop file or <span className="text-brand-400 hover:text-brand-300">browse</span>
              </p>
              <p className="text-[11px] text-muted truncate mt-0.5">{description}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
