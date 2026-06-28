import re

with open("frontend/src/App.tsx", "r") as f:
    content = f.read()

# Remove enableWatermark defaults
content = re.sub(r'\s*enableWatermark:\s*(false|true),', '', content)
content = re.sub(r'\s*watermarkText:\s*\'\',', '', content)
content = re.sub(r'\s*watermarkPositionMode:\s*\'preset\',', '', content)
content = re.sub(r'\s*watermarkCoordinateMode:\s*\'design_canvas\',', '', content)
content = re.sub(r'\s*watermarkPosition:\s*\'bottom_right\',', '', content)
content = re.sub(r'\s*watermarkX:\s*50,', '', content)
content = re.sub(r'\s*watermarkY:\s*50,', '', content)
content = re.sub(r'\s*watermarkOpacity:\s*65,', '', content)
content = re.sub(r'\s*watermarkSize:\s*20,', '', content)
content = re.sub(r'\s*watermarkMargin:\s*36,', '', content)

# Remove Watermark Card block
card_pattern = r'\{\/\* ── Watermark Card ── \*\/\}.*?<\/div>\s*<\/div>\s*<\/div>'
content = re.sub(card_pattern, '', content, flags=re.DOTALL)

with open("frontend/src/App.tsx", "w") as f:
    f.write(content)

