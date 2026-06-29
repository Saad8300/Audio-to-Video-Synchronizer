import re

with open("backend/batch_queue_runner.py", "r") as f:
    content = f.read()

# Let's insert the construction of text_overlay_config right before start_time = time.time()
search_start = "        start_time = time.time()"
replace_start = """        
        # Batch 16D Text Overlay Config
        import json
        parsed_items = []
        try:
            parsed_items = json.loads(config.get("text_overlay_items", "[]"))
        except:
            pass
            
        text_overlay_config = {
            "enabled": config.get("text_overlay_enabled", False),
            "mode": config.get("text_overlay_mode", "whole_video"),
            "items": parsed_items,
            "text": config.get("text_overlay_text", ""),
            "font_family": config.get("text_overlay_font_family", "Inter"),
            "font_size_percent": float(config.get("text_overlay_font_size_percent", 5.0)),
            "font_weight": config.get("text_overlay_font_weight", "Bold"),
            "color": config.get("text_overlay_color", "#FFFFFF"),
            "opacity": float(config.get("text_overlay_opacity", 100.0)),
            "x_percent": float(config.get("text_overlay_x_percent", 50.0)),
            "y_percent": float(config.get("text_overlay_y_percent", 88.0)),
            "align": config.get("text_overlay_align", "center"),
            "max_width_percent": float(config.get("text_overlay_max_width_percent", 90.0)),
            "shadow_enabled": str(config.get("text_overlay_shadow_enabled", "true")).lower() == "true",
            "stroke_enabled": str(config.get("text_overlay_stroke_enabled", "false")).lower() == "true",
            "stroke_color": config.get("text_overlay_stroke_color", "#000000"),
            "background_enabled": str(config.get("text_overlay_background_enabled", "false")).lower() == "true",
            "background_color": config.get("text_overlay_background_color", "#000000"),
            "background_opacity": float(config.get("text_overlay_background_opacity", 50.0))
        }
        
        start_time = time.time()"""

content = content.replace(search_start, replace_start)

content = content.replace(
    "                progress_callback=update_progress\n            )",
    "                progress_callback=update_progress,\n                text_overlay_config=text_overlay_config\n            )"
)

with open("backend/batch_queue_runner.py", "w") as f:
    f.write(content)
print("batch_queue_runner.py patched")
