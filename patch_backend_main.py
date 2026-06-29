import re

with open("backend/main.py", "r") as f:
    content = f.read()

# Add parameters to definitions
params = """    text_overlay_background_opacity: float = Form(50.0),
    text_overlay_mode: str = Form("whole_video"),
    text_overlay_items: str = Form("[]"),"""
content = content.replace("    text_overlay_background_opacity: float = Form(50.0),", params)

# Logic extraction
logic_search = """    text_overlay_enabled_bool = text_overlay_enabled.strip().lower() == "true"
    text_overlay_config = {"""

logic_replace = """    text_overlay_enabled_bool = text_overlay_enabled.strip().lower() == "true"
    import json
    try:
        parsed_items = json.loads(text_overlay_items)
    except:
        parsed_items = []
        
    text_overlay_config = {
        "mode": text_overlay_mode,
        "items": parsed_items,"""
content = content.replace(logic_search, logic_replace)

with open("backend/main.py", "w") as f:
    f.write(content)
print("backend/main.py patched")
