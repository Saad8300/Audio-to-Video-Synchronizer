import React, { useState, useEffect } from 'react'
import StudioPageHeader from './StudioPageHeader'
import {
  IconVideo,
  IconMusic,
  IconFileText,
  IconArrowRight,
  IconLayers
} from './icons'

function IconPlus({ size = 24, className = '' }: { size?: number, className?: string }) {
  return (
    <svg width={size} height={size} className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="5" x2="12" y2="19"></line>
      <line x1="5" y1="12" x2="19" y2="12"></line>
    </svg>
  )
}

function IconTrash2({ size = 24, className = '' }: { size?: number, className?: string }) {
  return (
    <svg width={size} height={size} className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6"></polyline>
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
      <line x1="10" y1="11" x2="10" y2="17"></line>
      <line x1="14" y1="11" x2="14" y2="17"></line>
    </svg>
  )
}
import {
  BUILT_IN_TEMPLATES,
  getSavedTemplates,
  deleteTemplate,
  saveTemplate,
  setPendingTemplate,
  StudioTemplate,
  ToolKey
} from '../utils/templateStore'

interface StudioTemplatesPageProps {
  onUseTemplate: (tool: ToolKey) => void
}

export default function StudioTemplatesPage({ onUseTemplate }: StudioTemplatesPageProps) {
  const [savedTemplates, setSavedTemplates] = useState<StudioTemplate[]>([])
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [newTemplateName, setNewTemplateName] = useState('')
  const [newTemplateTool, setNewTemplateTool] = useState<ToolKey>('image')
  const [newTemplateDesc, setNewTemplateDesc] = useState('')

  useEffect(() => {
    setSavedTemplates(getSavedTemplates())
  }, [])

  const handleUseTemplate = (template: StudioTemplate) => {
    setPendingTemplate(template)
    onUseTemplate(template.tool)
  }

  const handleDeleteTemplate = (id: string) => {
    deleteTemplate(id)
    setSavedTemplates(getSavedTemplates())
  }

  const handleCreateTemplate = () => {
    if (!newTemplateName.trim()) return
    saveTemplate({
      name: newTemplateName.trim(),
      tool: newTemplateTool,
      description: newTemplateDesc.trim() || 'Custom saved template',
      settings: {} // Empty settings for now from this form, but we can add inline saving from tools later
    })
    setSavedTemplates(getSavedTemplates())
    setShowCreateForm(false)
    setNewTemplateName('')
    setNewTemplateDesc('')
  }

  const renderCard = (template: StudioTemplate) => {
    const isSaved = !template.isBuiltIn
    const badgeColor = 
      template.tool === 'image' || template.tool === 'video' || template.tool === 'media' ? 'bg-indigo-500/10 text-indigo-500 border-indigo-500/20' :
      template.tool === 'audio_merger' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' :
      'bg-amber-500/10 text-amber-500 border-amber-500/20'

    const Icon = 
      template.tool === 'image' || template.tool === 'video' || template.tool === 'media' ? IconVideo :
      template.tool === 'audio_merger' ? IconMusic : IconFileText
      
    const toolName = 
      template.tool === 'image' ? 'Image Timeline' :
      template.tool === 'video' ? 'Video Timeline' :
      template.tool === 'media' ? 'Media Timeline' :
      template.tool === 'audio_merger' ? 'Audio Merger' : 'Script Timestamp'

    return (
      <div key={template.id} className="card p-5 flex flex-col hover:border-[var(--accent-primary)] transition-all group">
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1 min-w-0 pr-4">
            <h3 className="font-bold text-[var(--text-primary)] truncate">{template.name}</h3>
            <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border mt-2 ${badgeColor}`}>
              <Icon size={12} />
              {toolName}
            </span>
          </div>
          {isSaved && (
            <button 
              onClick={() => handleDeleteTemplate(template.id)}
              className="text-[var(--text-muted)] hover:text-red-500 transition-colors p-1"
              title="Delete template"
            >
              <IconTrash2 size={16} />
            </button>
          )}
        </div>
        
        <p className="text-xs text-[var(--text-secondary)] flex-1 mb-4 line-clamp-2">
          {template.description}
        </p>
        
        <div className="flex flex-wrap gap-1.5 mb-4">
          {Object.entries(template.settings).map(([k, v]) => {
            if (typeof v === 'boolean' || !v || k === 'outputName') return null;
            let displayVal = String(v);
            if (k === 'aspectRatio') displayVal = v;
            else if (k === 'exportResolution') displayVal = v;
            else if (k === 'renderProfile') displayVal = displayVal.replace('_', ' ');
            else if (k === 'outputFormat') displayVal = displayVal.toUpperCase();
            else if (k === 'outputMode') displayVal = displayVal.replace('_', ' ');
            else return null;

            return (
              <span key={k} className="px-2 py-0.5 bg-[var(--bg-input)] rounded-md text-[10px] text-[var(--text-secondary)] font-medium capitalize border border-[var(--border-subtle)]">
                {displayVal}
              </span>
            )
          })}
        </div>

        <button 
          onClick={() => handleUseTemplate(template)}
          className="w-full py-2 rounded-lg text-xs font-bold bg-[var(--bg-elevated)] text-[var(--text-primary)] hover:bg-[var(--accent-primary)] hover:text-white transition-colors border border-[var(--border-subtle)] hover:border-transparent flex items-center justify-center gap-2 group-hover:bg-[var(--accent-primary)] group-hover:text-white group-hover:border-transparent"
        >
          Use Template
          <IconArrowRight size={14} className="opacity-70 group-hover:opacity-100" />
        </button>
      </div>
    )
  }

  const videoTemplates = BUILT_IN_TEMPLATES.filter(t => ['image', 'video', 'media'].includes(t.tool))
  const audioTemplates = BUILT_IN_TEMPLATES.filter(t => t.tool === 'audio_merger')
  const scriptTemplates = BUILT_IN_TEMPLATES.filter(t => t.tool === 'script_timestamp')

  return (
    <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 py-8 space-y-10">
      <StudioPageHeader
        icon={<IconLayers size={17} />}
        title="Templates"
        subtitle="Start faster with local workflow presets for videos, audio, and timestamps."
      />

      {/* Saved Templates */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-bold text-[var(--text-primary)] uppercase tracking-wider">Saved Templates</h2>
          <button 
            onClick={() => setShowCreateForm(!showCreateForm)}
            className="flex items-center gap-2 text-xs font-bold text-[var(--accent-primary)] hover:brightness-110 transition-all"
          >
            <IconPlus size={14} />
            Create Template
          </button>
        </div>

        {showCreateForm && (
          <div className="card p-5 mb-6 border-[var(--accent-primary)]/30 border">
            <h3 className="text-xs font-bold mb-3">Create Blank Template</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-[var(--text-muted)] uppercase">Name</label>
                <input 
                  type="text" 
                  className="form-input text-sm" 
                  placeholder="My Template"
                  value={newTemplateName}
                  onChange={e => setNewTemplateName(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-[var(--text-muted)] uppercase">Tool</label>
                <select 
                  className="form-select text-sm"
                  value={newTemplateTool}
                  onChange={e => setNewTemplateTool(e.target.value as ToolKey)}
                >
                  <option value="image">Image Timeline</option>
                  <option value="video">Video Timeline</option>
                  <option value="media">Media Timeline</option>
                  <option value="audio_merger">Audio Merger</option>
                  <option value="script_timestamp">Script Timestamp</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-[var(--text-muted)] uppercase">Description (Optional)</label>
                <input 
                  type="text" 
                  className="form-input text-sm" 
                  placeholder="Brief description"
                  value={newTemplateDesc}
                  onChange={e => setNewTemplateDesc(e.target.value)}
                />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <button onClick={() => setShowCreateForm(false)} className="btn text-xs px-4 py-2">Cancel</button>
              <button onClick={handleCreateTemplate} className="btn-primary text-xs px-4 py-2" disabled={!newTemplateName.trim()}>Save Template</button>
            </div>
          </div>
        )}

        {savedTemplates.length === 0 ? (
          <div className="card p-8 text-center flex flex-col items-center justify-center text-[var(--text-muted)]">
            <IconFileText size={32} className="mb-3 opacity-50" />
            <p className="text-sm font-medium text-[var(--text-primary)]">No saved templates yet.</p>
            <p className="text-xs mt-1 max-w-md">Create a template to reuse your favorite workflow settings.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {savedTemplates.map(renderCard)}
          </div>
        )}
      </section>

      {/* Built-in Video Templates */}
      <section>
        <h2 className="text-sm font-bold text-[var(--text-primary)] uppercase tracking-wider mb-4">Video Templates</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {videoTemplates.map(renderCard)}
        </div>
      </section>

      {/* Built-in Audio Templates */}
      <section>
        <h2 className="text-sm font-bold text-[var(--text-primary)] uppercase tracking-wider mb-4">Audio Templates</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {audioTemplates.map(renderCard)}
        </div>
      </section>

      {/* Built-in Script Templates */}
      <section>
        <h2 className="text-sm font-bold text-[var(--text-primary)] uppercase tracking-wider mb-4">Script Templates</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {scriptTemplates.map(renderCard)}
        </div>
      </section>
    </div>
  )
}
