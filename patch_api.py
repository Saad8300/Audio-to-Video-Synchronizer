import re

with open("frontend/src/utils/api.ts", "r") as f:
    content = f.read()

# Locate appendTextOverlaySettings
search = """export function appendTextOverlaySettings(formData: FormData, settings: any) {
  formData.append('text_overlay_enabled', settings.textOverlayEnabled ? 'true' : 'false')"""

replace = """export function appendTextOverlaySettings(formData: FormData, settings: any) {
  formData.append('text_overlay_enabled', settings.textOverlayEnabled ? 'true' : 'false')
  formData.append('text_overlay_mode', settings.textOverlayMode || 'whole_video')
  formData.append('text_overlay_items', JSON.stringify(settings.textOverlayItems || []))"""

content = content.replace(search, replace)

with open("frontend/src/utils/api.ts", "w") as f:
    f.write(content)
print("api.ts patched")
