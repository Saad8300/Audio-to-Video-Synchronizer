import React, { useState } from 'react';
import { GenerateSettings } from '../types';

export function TextOverlayPanel({
  settings,
  onChange
}: {
  settings: GenerateSettings;
  onChange: (updates: Partial<GenerateSettings>) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);

  const {
    textOverlayEnabled: enabled,
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

          <div className="space-y-4 mt-5 transition-opacity" style={{ opacity: enabled ? 1 : 0.4, pointerEvents: enabled ? 'auto' : 'none' }}>
            
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
                  {text || 'Sample Text'}
                </div>
              </div>
              <div className="absolute inset-0 border rounded pointer-events-none" style={{ borderColor: 'var(--border-subtle)' }} />
            </div>

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
