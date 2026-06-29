import React, { useState, useEffect } from 'react';
import { GenerateSettings } from '../types';
import { getAllPresets, savePreset, deletePreset, TextOverlayPreset } from '../utils/textOverlayPresets';

export function TextOverlayPanel({
  settings,
  onChange
}: {
  settings: any;
  onChange: (updates: any) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [presets, setPresets] = useState<TextOverlayPreset[]>([]);
  const [selectedPresetId, setSelectedPresetId] = useState<string>('');

  useEffect(() => {
    setPresets(getAllPresets());
  }, []);

  const handleApplyPreset = () => {
    const preset = presets.find(p => p.id === selectedPresetId);
    if (!preset) return;
    onChange({
      ...preset.settings
    });
  };

  const handleSavePreset = () => {
    const name = prompt('Enter preset name:', 'My Text Overlay Preset');
    if (!name || !name.trim()) return;
    const {
      textOverlayEnabled, textOverlayMode = 'whole_video', textOverlayItems = [], textOverlayText, textOverlayFontFamily, textOverlayFontSizePercent,
      textOverlayFontWeight, textOverlayColor, textOverlayOpacity, textOverlayXPercent,
      textOverlayYPercent, textOverlayAlign, textOverlayMaxWidthPercent, textOverlayShadowEnabled,
      textOverlayStrokeEnabled, textOverlayStrokeColor, textOverlayBackgroundEnabled,
      textOverlayBackgroundColor, textOverlayBackgroundOpacity
    } = settings;
    
    const newPreset = savePreset(name.trim(), {
      textOverlayEnabled, textOverlayMode, textOverlayItems, textOverlayText, textOverlayFontFamily, textOverlayFontSizePercent,
      textOverlayFontWeight, textOverlayColor, textOverlayOpacity, textOverlayXPercent,
      textOverlayYPercent, textOverlayAlign, textOverlayMaxWidthPercent, textOverlayShadowEnabled,
      textOverlayStrokeEnabled, textOverlayStrokeColor, textOverlayBackgroundEnabled,
      textOverlayBackgroundColor, textOverlayBackgroundOpacity
    });
    setPresets(getAllPresets());
    setSelectedPresetId(newPreset.id);
    alert('Text overlay preset saved');
  };

  const handleDeletePreset = () => {
    if (!selectedPresetId) return;
    const preset = presets.find(p => p.id === selectedPresetId);
    if (!preset || preset.type === 'built-in') return;
    
    if (confirm(`Delete preset "${preset.name}"?`)) {
      deletePreset(preset.id);
      setPresets(getAllPresets());
      setSelectedPresetId('');
    }
  };

  const {
    textOverlayEnabled: enabled,
    textOverlayMode: mode = 'whole_video',
    textOverlayItems: items = [],
    textOverlayText: text,
    textOverlayFontFamily: fontFamily,
    textOverlayFontSizePercent: fontSize,
    textOverlayFontWeight: fontWeight,
    textOverlayColor: color,
    textOverlayOpacity: opacity,
    textOverlayXPercent: x,
    textOverlayYPercent: y,
    textOverlayAlign: align,
    textOverlayMaxWidthPercent: maxWidth,
    textOverlayShadowEnabled: shadow,
    textOverlayStrokeEnabled: stroke,
    textOverlayStrokeColor: strokeColor,
    textOverlayBackgroundEnabled: bgEnabled,
    textOverlayBackgroundColor: bgColor,
    textOverlayBackgroundOpacity: bgOpacity,
  } = settings;

  const previewText = mode === 'whole_video' 
    ? (text || 'Sample Text')
    : mode === 'timed_text'
    ? (items[0]?.text || 'Timed text preview')
    : 'CSV caption preview';

  const fonts = [
    'Inter', 'Arial', 'Helvetica', 'Georgia', 'Times New Roman', 'Courier New', 'Impact'
  ];

  return (
    <div className="card">
      <div 
        className="p-5 flex items-center justify-between cursor-pointer select-none"
        onClick={() => setIsOpen(!isOpen)}
      >
        <div>
          <h2 className="text-sm font-bold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
            Text Overlay
            {enabled && (
              <span className="px-1.5 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider" style={{ background: 'var(--accent-subtle)', color: 'var(--accent-primary)' }}>
                On
              </span>
            )}
          </h2>
          <p className="text-[11px] mt-0.5" style={{ color: 'var(--text-muted)' }}>
            Add custom text, branding, or watermark-style text over the full video.
          </p>
        </div>
        <div 
          className="transition-transform duration-200"
          style={{ transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)', color: 'var(--text-muted)' }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="6 9 12 15 18 9"></polyline>
          </svg>
        </div>
      </div>

      {isOpen && (
        <div className="px-5 pb-5 pt-0 border-t" style={{ borderColor: 'var(--border-subtle)' }}>
          <div className="mt-4 flex items-center justify-between">
            <label className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>Enable Text Overlay</label>
            <input 
              type="checkbox" 
              checked={enabled}
              onChange={e => onChange({ textOverlayEnabled: e.target.checked })}
              className="w-4 h-4 rounded"
              style={{ accentColor: 'var(--accent-primary)' }}
            />
          </div>

          {enabled && (
            <div className="mt-4 space-y-1">
              <label className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>Overlay Mode</label>
              <select 
                value={mode}
                onChange={e => onChange({ textOverlayMode: e.target.value })}
                className="form-select"
              >
                <option value="whole_video">Whole Video</option>
                <option value="timed_text">Timed Text</option>
                <option value="csv_text">CSV Text Column</option>
              </select>
            </div>
          )}

          <div className="space-y-4 mt-5 transition-opacity" style={{ opacity: enabled ? 1 : 0.4, pointerEvents: enabled ? 'auto' : 'none' }}>
            
            {/* Overlay Presets Section */}
            <div className="p-4 rounded border space-y-3" style={{ background: 'var(--bg-elevated)', borderColor: 'var(--border-subtle)' }}>
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Overlay Presets</label>
                <button 
                  onClick={handleSavePreset}
                  className="text-[10px] font-semibold px-2 py-1 rounded transition-colors hover:opacity-80"
                  style={{ background: 'var(--bg-input)', color: 'var(--text-primary)' }}
                  title="Save Current as Preset"
                >
                  Save Current
                </button>
              </div>
              <div className="flex gap-2">
                <select 
                  className="form-select flex-1"
                  value={selectedPresetId}
                  onChange={e => setSelectedPresetId(e.target.value)}
                >
                  <option value="" disabled>Load Preset...</option>
                  <optgroup label="Built-in Presets">
                    {presets.filter(p => p.type === 'built-in').map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </optgroup>
                  {presets.filter(p => p.type === 'saved').length > 0 && (
                    <optgroup label="Saved Presets">
                      {presets.filter(p => p.type === 'saved').map(p => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </optgroup>
                  )}
                </select>
                <button 
                  onClick={handleApplyPreset}
                  disabled={!selectedPresetId}
                  className="px-3 rounded text-xs font-bold transition-opacity"
                  style={{ 
                    background: 'var(--accent-primary)', color: 'white',
                    opacity: selectedPresetId ? 1 : 0.5,
                    cursor: selectedPresetId ? 'pointer' : 'not-allowed'
                  }}
                >
                  Apply
                </button>
                {presets.find(p => p.id === selectedPresetId)?.type === 'saved' && (
                  <button 
                    onClick={handleDeletePreset}
                    className="px-2 rounded text-xs font-bold opacity-70 hover:opacity-100 transition-opacity"
                    style={{ background: '#ef4444', color: 'white' }}
                    title="Delete Preset"
                  >
                    ×
                  </button>
                )}
              </div>
            </div>

            {/* Live Preview */}
            <div className="rounded overflow-hidden relative" style={{ aspectRatio: settings.aspectRatio.replace(':', '/'), background: 'linear-gradient(135deg, #1e293b, #0f172a)' }}>
              <div 
                className="absolute"
                style={{
                  left: align === 'center' ? '50%' : align === 'right' ? '100%' : '0%',
                  top: `${y}%`,
                  transform: `translate(${align === 'center' ? '-50%' : align === 'right' ? `calc(-100% - ${100 - x}%)` : `${x}%`}, -50%)`,
                  width: '100%',
                  textAlign: align,
                  pointerEvents: 'none',
                }}
              >
                <div 
                  style={{
                    display: 'inline-block',
                    maxWidth: `${maxWidth}%`,
                    fontFamily: `${fontFamily}, sans-serif`,
                    fontWeight: fontWeight === 'Regular' ? 400 : fontWeight === 'Medium' ? 500 : fontWeight === 'Bold' ? 700 : 800,
                    fontSize: `calc(100cqh * ${fontSize / 100})`, // We can use cqh if container has container-type
                    color: color,
                    opacity: opacity / 100,
                    textShadow: shadow ? '0px 2px 4px rgba(0,0,0,0.5)' : 'none',
                    WebkitTextStroke: stroke ? `1px ${strokeColor}` : 'none',
                    backgroundColor: bgEnabled ? `${bgColor}${Math.round(bgOpacity * 2.55).toString(16).padStart(2, '0')}` : 'transparent',
                    padding: bgEnabled ? '0.2em 0.4em' : '0',
                    borderRadius: bgEnabled ? '0.2em' : '0',
                    lineHeight: 1.2,
                    wordWrap: 'break-word',
                  }}
                >
                  {previewText}
                </div>
              </div>
              <div className="absolute inset-0 border rounded pointer-events-none" style={{ borderColor: 'var(--border-subtle)' }} />
            </div>

            {mode === 'whole_video' && (
              <div className="space-y-1">
                <label className="form-label">Overlay Text</label>
                <input 
                  type="text" 
                  value={text}
                  onChange={e => onChange({ textOverlayText: e.target.value })}
                  placeholder="Your channel name, title, CTA, or custom text"
                  className="form-input"
                />
              </div>
            )}
            
            {mode === 'timed_text' && (
              <div className="space-y-3 p-4 rounded border" style={{ background: 'var(--bg-elevated)', borderColor: 'var(--border-subtle)' }}>
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Timed Text Items</label>
                  <button 
                    onClick={() => {
                      const newItems = [...items, { id: Date.now().toString(), text: 'New Text', start: '00:00', end: '00:05' }];
                      onChange({ textOverlayItems: newItems });
                    }}
                    className="text-[10px] font-semibold px-2 py-1 rounded transition-colors hover:opacity-80"
                    style={{ background: 'var(--accent-primary)', color: 'white' }}
                  >
                    + Add Text Item
                  </button>
                </div>
                
                {items.length === 0 ? (
                  <p className="text-xs text-center py-4" style={{ color: 'var(--text-muted)' }}>
                    No timed text items yet. Add a text item to show text during a specific part of the video.
                  </p>
                ) : (
                  <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1 custom-scrollbar">
                    {items.map((item: any, idx: number) => (
                      <div key={item.id} className="p-3 rounded border space-y-2 relative" style={{ borderColor: 'var(--border-subtle)', background: 'var(--bg-input)' }}>
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold text-gray-400">Item {idx + 1}</span>
                          <button 
                            onClick={() => {
                              const newItems = [...items];
                              newItems.splice(idx, 1);
                              onChange({ textOverlayItems: newItems });
                            }}
                            className="text-red-500 hover:text-red-400 text-xs font-bold"
                          >
                            Delete
                          </button>
                        </div>
                        <input 
                          type="text" 
                          value={item.text}
                          onChange={e => {
                            const newItems = [...items];
                            newItems[idx].text = e.target.value;
                            onChange({ textOverlayItems: newItems });
                          }}
                          placeholder="Text to display"
                          className="form-input text-xs p-1.5"
                        />
                        <div className="flex gap-2">
                          <div className="flex-1">
                            <label className="text-[10px] text-gray-400">Start (e.g. 00:02)</label>
                            <input 
                              type="text" 
                              value={item.start}
                              onChange={e => {
                                const newItems = [...items];
                                newItems[idx].start = e.target.value;
                                onChange({ textOverlayItems: newItems });
                              }}
                              className="form-input text-xs p-1.5 font-mono"
                            />
                          </div>
                          <div className="flex-1">
                            <label className="text-[10px] text-gray-400">End (e.g. 00:08)</label>
                            <input 
                              type="text" 
                              value={item.end}
                              onChange={e => {
                                const newItems = [...items];
                                newItems[idx].end = e.target.value;
                                onChange({ textOverlayItems: newItems });
                              }}
                              className="form-input text-xs p-1.5 font-mono"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
            
            {mode === 'csv_text' && (
              <div className="space-y-3 p-4 rounded border" style={{ background: 'var(--bg-elevated)', borderColor: 'var(--border-subtle)' }}>
                <p className="text-xs" style={{ color: 'var(--text-primary)' }}>
                  Use the text column from your timeline CSV as timed captions.
                </p>
                <pre className="text-[10px] p-2 rounded overflow-x-auto font-mono" style={{ background: 'var(--bg-input)', color: 'var(--text-muted)' }}>
                  image,start,end,text<br/>
                  1.jpg,00:00,00:03,"A wolf does not love you."<br/>
                  2.jpg,00:03,00:06,"It only learns your pattern."
                </pre>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="form-label">Font Family</label>
                <select 
                  value={fontFamily}
                  onChange={e => onChange({ textOverlayFontFamily: e.target.value })}
                  className="form-select"
                >
                  {fonts.map(f => <option key={f} value={f}>{f}</option>)}
                </select>
              </div>
              <div className="space-y-1">
                <label className="form-label">Font Weight</label>
                <select 
                  value={fontWeight}
                  onChange={e => onChange({ textOverlayFontWeight: e.target.value })}
                  className="form-select"
                >
                  <option value="Regular">Regular</option>
                  <option value="Medium">Medium</option>
                  <option value="Bold">Bold</option>
                  <option value="Extra Bold">Extra Bold</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="form-label flex justify-between">
                  <span>Size</span> <span style={{ color: 'var(--text-muted)' }}>{fontSize}%</span>
                </label>
                <input 
                  type="range" min="1" max="20" step="1"
                  value={fontSize}
                  onChange={e => onChange({ textOverlayFontSizePercent: Number(e.target.value) })}
                  className="w-full"
                  style={{ accentColor: 'var(--accent-primary)' }}
                />
              </div>
              <div className="space-y-1">
                <label className="form-label flex justify-between">
                  <span>Opacity</span> <span style={{ color: 'var(--text-muted)' }}>{opacity}%</span>
                </label>
                <input 
                  type="range" min="0" max="100" step="1"
                  value={opacity}
                  onChange={e => onChange({ textOverlayOpacity: Number(e.target.value) })}
                  className="w-full"
                  style={{ accentColor: 'var(--accent-primary)' }}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1 flex flex-col">
                <label className="form-label">Text Color</label>
                <input 
                  type="color" 
                  value={color}
                  onChange={e => onChange({ textOverlayColor: e.target.value })}
                  className="w-full h-9 rounded cursor-pointer p-0 border-0"
                />
              </div>
              <div className="space-y-1">
                <label className="form-label">Alignment</label>
                <select 
                  value={align}
                  onChange={e => onChange({ textOverlayAlign: e.target.value as any })}
                  className="form-select"
                >
                  <option value="left">Left</option>
                  <option value="center">Center</option>
                  <option value="right">Right</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="form-label flex justify-between">
                  <span>X Position</span> <span style={{ color: 'var(--text-muted)' }}>{x}%</span>
                </label>
                <input 
                  type="range" min="0" max="100" step="1"
                  value={x}
                  onChange={e => onChange({ textOverlayXPercent: Number(e.target.value) })}
                  className="w-full"
                  style={{ accentColor: 'var(--accent-primary)' }}
                />
              </div>
              <div className="space-y-1">
                <label className="form-label flex justify-between">
                  <span>Y Position</span> <span style={{ color: 'var(--text-muted)' }}>{y}%</span>
                </label>
                <input 
                  type="range" min="0" max="100" step="1"
                  value={y}
                  onChange={e => onChange({ textOverlayYPercent: Number(e.target.value) })}
                  className="w-full"
                  style={{ accentColor: 'var(--accent-primary)' }}
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="form-label flex justify-between">
                <span>Max Width</span> <span style={{ color: 'var(--text-muted)' }}>{maxWidth}%</span>
              </label>
              <input 
                type="range" min="20" max="100" step="1"
                value={maxWidth}
                onChange={e => onChange({ textOverlayMaxWidthPercent: Number(e.target.value) })}
                className="w-full"
                style={{ accentColor: 'var(--accent-primary)' }}
              />
            </div>

            {/* Styles container */}
            <div className="p-4 rounded space-y-4" style={{ background: 'var(--bg-input)' }}>
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>Text Shadow</label>
                <input 
                  type="checkbox" 
                  checked={shadow}
                  onChange={e => onChange({ textOverlayShadowEnabled: e.target.checked })}
                  className="w-3.5 h-3.5 rounded"
                  style={{ accentColor: 'var(--accent-primary)' }}
                />
              </div>
              
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>Text Outline</label>
                <div className="flex items-center gap-3">
                  {stroke && (
                    <input 
                      type="color" 
                      value={strokeColor}
                      onChange={e => onChange({ textOverlayStrokeColor: e.target.value })}
                      className="w-6 h-6 rounded cursor-pointer p-0 border-0"
                    />
                  )}
                  <input 
                    type="checkbox" 
                    checked={stroke}
                    onChange={e => onChange({ textOverlayStrokeEnabled: e.target.checked })}
                    className="w-3.5 h-3.5 rounded"
                    style={{ accentColor: 'var(--accent-primary)' }}
                  />
                </div>
              </div>

              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>Background Box</label>
                <div className="flex items-center gap-3">
                  {bgEnabled && (
                    <input 
                      type="color" 
                      value={bgColor}
                      onChange={e => onChange({ textOverlayBackgroundColor: e.target.value })}
                      className="w-6 h-6 rounded cursor-pointer p-0 border-0"
                    />
                  )}
                  <input 
                    type="checkbox" 
                    checked={bgEnabled}
                    onChange={e => onChange({ textOverlayBackgroundEnabled: e.target.checked })}
                    className="w-3.5 h-3.5 rounded"
                    style={{ accentColor: 'var(--accent-primary)' }}
                  />
                </div>
              </div>

              {bgEnabled && (
                <div className="space-y-1 pt-2">
                  <label className="form-label flex justify-between text-[10px]">
                    <span>Box Opacity</span> <span style={{ color: 'var(--text-muted)' }}>{bgOpacity}%</span>
                  </label>
                  <input 
                    type="range" min="0" max="100" step="1"
                    value={bgOpacity}
                    onChange={e => onChange({ textOverlayBackgroundOpacity: Number(e.target.value) })}
                    className="w-full"
                    style={{ accentColor: 'var(--accent-primary)' }}
                  />
                </div>
              )}
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
