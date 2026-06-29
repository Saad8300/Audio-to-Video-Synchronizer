import re

with open("frontend/src/utils/textOverlayPresets.ts", "r") as f:
    content = f.read()

# Add to interface
interface_replacement = """export interface TextOverlaySettings {
  textOverlayEnabled: boolean
  textOverlayMode?: 'whole_video' | 'timed_text' | 'csv_text'
  textOverlayItems?: Array<{ id: string; text: string; start: string; end: string; }>
  textOverlayText: string"""
content = content.replace("export interface TextOverlaySettings {\n  textOverlayEnabled: boolean\n  textOverlayText: string", interface_replacement)

# Make sure all built-in presets get a default mode
content = content.replace(
    "      textOverlayEnabled: true,",
    "      textOverlayEnabled: true,\n      textOverlayMode: 'whole_video',\n      textOverlayItems: [],"
)

# And in getAllPresets:
fallback = """    return {
      ...preset,
      settings: {
        textOverlayMode: 'whole_video',
        textOverlayItems: [],
        ...preset.settings
      }
    }"""
content = content.replace(
    "    return preset",
    fallback
)

with open("frontend/src/utils/textOverlayPresets.ts", "w") as f:
    f.write(content)
print("textOverlayPresets.ts patched")
