// components/FileDropZone.tsx – Compact professional drag-and-drop upload area

import React, { useCallback, useRef, useState } from 'react'
import { IconCheck, IconX } from './icons'

interface FileDropZoneProps {
  id:          string
  label:       string
  description: string
  accept:      string
  icon:        React.ReactNode
  file?:       File | null
  files?:      File[]
  onChange?:   (file: File | null) => void
  onFilesChange?: (files: File[]) => void
  multiple?:   boolean
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
  files = [],
  onChange,
  onFilesChange,
  multiple,
  disabled,
  required,
  compact,
}: FileDropZoneProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)

  const handleFiles = useCallback(
    (droppedFiles: FileList | File[]) => {
      if (disabled) return
      const list = Array.from(droppedFiles)
      if (list.length === 0) {
        if (onChange) onChange(null)
        if (onFilesChange) onFilesChange([])
        return
      }

      // Natural sort by filename
      list.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' }))

      if (multiple && onFilesChange) {
        onFilesChange(list)
      } else if (onChange) {
        onChange(list[0])
      }
    },
    [onChange, onFilesChange, multiple, disabled],
  )

  const onDragOver  = (e: React.DragEvent) => { if (disabled) return; e.preventDefault(); setDragging(true) }
  const onDragLeave = () => setDragging(false)
  const onDrop      = (e: React.DragEvent) => {
    e.preventDefault(); setDragging(false)
    if (disabled) return
    handleFiles(e.dataTransfer.files)
  }

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  const hasFile = (file !== undefined && file !== null) || files.length > 0
  const zoneClass = [
    'dropzone',
    compact ? 'px-3 py-2.5' : 'px-4 py-3',
    dragging && !disabled ? 'dropzone-active' : '',
    hasFile ? 'dropzone-filled' : '',
    disabled ? 'opacity-50 pointer-events-none' : '',
  ].filter(Boolean).join(' ')

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between gap-2">
        <label htmlFor={id} className="form-label mb-0">{label}</label>
        {required && !hasFile && (
          <span
            className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded"
            style={{ color: 'var(--color-error)', background: 'var(--color-error-bg)', border: '1px solid var(--color-error-border)' }}
          >
            Required
          </span>
        )}
        {hasFile && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              if (onChange) onChange(null);
              if (onFilesChange) onFilesChange([]);
            }}
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
          multiple={multiple}
          className="sr-only"
          disabled={disabled}
          onChange={(e) => handleFiles(e.target.files ?? [])}
        />

        {hasFile ? (
          <div className="flex items-center gap-2.5 w-full animate-fade-in">
            <div
              className="w-7 h-7 rounded-md shrink-0 flex items-center justify-center"
              style={{ background: 'var(--color-success-bg)', border: '1px solid var(--color-success-border)', color: 'var(--color-success)' }}
            >
              <IconCheck size={13} />
            </div>
            <div className="flex-1 min-w-0">
              {files.length > 1 ? (
                <>
                  <p className="text-xs font-semibold truncate" style={{ color: 'var(--color-success)' }}>
                    {files.length} audio parts selected
                  </p>
                  <p className="text-[10px] truncate" style={{ color: 'var(--text-muted)' }}>
                    {files.slice(0, 2).map(f => f.name).join(' → ')}
                    {files.length > 2 && ` (+ ${files.length - 2} more)`}
                  </p>
                </>
              ) : (
                <>
                  <p className="text-xs font-semibold truncate" style={{ color: 'var(--color-success)' }}>
                    {file ? file.name : files[0]?.name}
                  </p>
                  <p className="text-[10px] truncate" style={{ color: 'var(--text-muted)' }}>
                    {formatSize(file ? file.size : (files[0]?.size ?? 0))}
                  </p>
                </>
              )}
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
