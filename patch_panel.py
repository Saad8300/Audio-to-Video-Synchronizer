import re

with open("frontend/src/components/TextOverlayPanel.tsx", "r") as f:
    content = f.read()

# 1. Update destructuring to include textOverlayMode and textOverlayItems
destructure_search = """  const {
    textOverlayEnabled: enabled,
    textOverlayText: text,"""
destructure_replace = """  const {
    textOverlayEnabled: enabled,
    textOverlayMode: mode = 'whole_video',
    textOverlayItems: items = [],
    textOverlayText: text,"""
content = content.replace(destructure_search, destructure_replace)

# 2. Add mode selector and dynamic input sections below the Enable Text Overlay block
enable_search = """            <input 
              type="checkbox" 
              checked={enabled}
              onChange={e => onChange({ textOverlayEnabled: e.target.checked })}
              className="w-4 h-4 rounded"
              style={{ accentColor: 'var(--accent-primary)' }}
            />
          </div>"""

# Ensure we use `const id = Date.now().toString() + Math.random().toString(36).substr(2, 9);`
mode_ui = """            <input 
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
          )}"""
content = content.replace(enable_search, mode_ui)

# 3. Replace the single "Overlay Text" input with conditional blocks
text_input_search = """            <div className="space-y-1">
              <label className="form-label">Overlay Text</label>
              <input 
                type="text" 
                value={text}
                onChange={e => onChange({ textOverlayText: e.target.value })}
                placeholder="Your channel name, title, CTA, or custom text"
                className="form-input"
              />
            </div>"""

dynamic_input = """            {mode === 'whole_video' && (
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
            )}"""
content = content.replace(text_input_search, dynamic_input)

# 4. Live Preview logic
# We need to compute previewText
preview_text_logic = """  const previewText = mode === 'whole_video' 
    ? (text || 'Sample Text')
    : mode === 'timed_text'
    ? (items[0]?.text || 'Timed text preview')
    : 'CSV caption preview';"""
    
# Let's insert this before the return statement
content = content.replace("  const fonts = [", preview_text_logic + "\n\n  const fonts = [")

# Replace the text rendering in preview
content = content.replace("{text || 'Sample Text'}", "{previewText}")

# 5. handleSavePreset
save_search = """    const newPreset = savePreset(name.trim(), {
      textOverlayEnabled, textOverlayText,"""
save_replace = """    const newPreset = savePreset(name.trim(), {
      textOverlayEnabled, textOverlayMode, textOverlayItems, textOverlayText,"""
content = content.replace(save_search, save_replace)

# Also update the extracted vars in handleSavePreset
extract_search = """    const {
      textOverlayEnabled, textOverlayText,"""
extract_replace = """    const {
      textOverlayEnabled, textOverlayMode = 'whole_video', textOverlayItems = [], textOverlayText,"""
content = content.replace(extract_search, extract_replace)

with open("frontend/src/components/TextOverlayPanel.tsx", "w") as f:
    f.write(content)
print("TextOverlayPanel.tsx patched")
