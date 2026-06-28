import re

files_to_strip = [
    "frontend/src/App.tsx",
    "frontend/src/components/MediaTimelinePage.tsx",
    "frontend/src/components/VideoTimelinePage.tsx",
    "frontend/src/utils/api.ts",
]

for file_path in files_to_strip:
    with open(file_path, "r") as f:
        content = f.read()

    # App/Media/Video Timelines: Remove defaults
    content = re.sub(r'\s*enableWatermark:\s*(false|true),', '', content)
    content = re.sub(r'\s*watermarkText:\s*\'\',', '', content)
    content = re.sub(r'\s*watermarkPositionMode:\s*\'preset\',', '', content)
    content = re.sub(r'\s*watermarkCoordinateMode:\s*\'design_canvas\',', '', content)
    content = re.sub(r'\s*watermarkPosition:\s*\'(?:bottom_right|white_default)\',', '', content)
    content = re.sub(r'\s*watermarkX:\s*50,', '', content)
    content = re.sub(r'\s*watermarkY:\s*50,', '', content)
    content = re.sub(r'\s*watermarkOpacity:\s*65,', '', content)
    content = re.sub(r'\s*watermarkSize:\s*20,', '', content)
    content = re.sub(r'\s*watermarkMargin:\s*36,', '', content)
    
    # Remove api.ts payload mapping lines
    # e.g., formData.append('watermark_text', settings.watermarkText)
    content = re.sub(r'\s*formData\.append\(\'enable_watermark\',.*?\);?', '', content)
    content = re.sub(r'\s*formData\.append\(\'watermark_.*?\);?', '', content)
    
    # Check if there are any remaining Watermark Card blocks
    card_pattern = r'\{\/\* ── Watermark Card ── \*\/\}.*?<\/div>\s*<\/div>\s*<\/div>'
    content = re.sub(card_pattern, '', content, flags=re.DOTALL)

    # Some `settings.watermarkText` in button validation
    # e.g., (settings.enableWatermark && !settings.watermarkText) ||
    content = re.sub(r'\s*\|\|\s*\(settings\.enableWatermark && !settings\.watermarkText\)', '', content)

    # In VideoTimelinePage.tsx
    content = re.sub(r'\s*import\s*\{\s*.*?WatermarkPosition.*?\}\s*from\s*\'\.\.\/types\'', 'import { VideoTimelineSettings, VideoTimelineRow } from \'../types\'', content)
    
    with open(file_path, "w") as f:
        f.write(content)
