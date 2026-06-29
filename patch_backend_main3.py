import re

with open("backend/main.py", "r") as f:
    content = f.read()

# For video timeline generator
vt_params_search = """    text_overlay_background_opacity: float = Form(50.0),
):"""
vt_params_replace = """    text_overlay_background_opacity: float = Form(50.0),
    text_overlay_mode: str = Form("whole_video"),
    text_overlay_items: str = Form("[]"),
):"""
content = content.replace(vt_params_search, vt_params_replace)

# For both video timeline and media timeline, update text_overlay_config
config_search = """    text_overlay_enabled_bool = text_overlay_enabled.strip().lower() == "true"
    text_overlay_config = {"""
config_replace = """    text_overlay_enabled_bool = text_overlay_enabled.strip().lower() == "true"
    import json
    try:
        parsed_items = json.loads(text_overlay_items)
    except:
        parsed_items = []
    
    text_overlay_config = {
        "mode": text_overlay_mode,
        "items": parsed_items,"""
content = content.replace(config_search, config_replace)

with open("backend/main.py", "w") as f:
    f.write(content)
print("main.py patched for VT and MT params")
