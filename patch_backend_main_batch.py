import re

with open("backend/main.py", "r") as f:
    content = f.read()

# Replace params for all three endpoints.
# They are very similar, so we can just look for the text_overlay_background_opacity definition inside them.
param_search = """    text_overlay_background_opacity: float = Form(50.0),
):"""
param_replace = """    text_overlay_background_opacity: float = Form(50.0),
    text_overlay_mode: str = Form("whole_video"),
    text_overlay_items: str = Form("[]"),
):"""
# I already replaced some above. Let's do a safe string replacement for all of them.
content = content.replace(param_search, param_replace)

# Now logic extraction for Batch Image Timeline (which calls JobConfig)
# Search:
#         "text_overlay_enabled": text_overlay_enabled.strip().lower() == "true",
#         "text_overlay_text": text_overlay_text,
#
config_search = """        # Batch 16A Text Overlay
        "text_overlay_enabled": text_overlay_enabled.strip().lower() == "true",
        "text_overlay_text": text_overlay_text,"""
config_replace = """        # Batch 16A Text Overlay
        "text_overlay_enabled": text_overlay_enabled.strip().lower() == "true",
        "text_overlay_mode": text_overlay_mode,
        "text_overlay_items": text_overlay_items,
        "text_overlay_text": text_overlay_text,"""
content = content.replace(config_search, config_replace)

with open("backend/main.py", "w") as f:
    f.write(content)
print("main.py patched for batch endpoints")
