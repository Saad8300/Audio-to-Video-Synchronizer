import re

with open("backend/main.py", "r") as f:
    content = f.read()

# 1. Update jobs_start call to generate_video
# We need to replace all text_overlay_* arguments with text_overlay_config=text_overlay_config
search_args = """                # Batch 16A — Text Overlay
                text_overlay_enabled=text_overlay_enabled_bool,
                text_overlay_text=text_overlay_text,
                text_overlay_font_family=text_overlay_font_family,
                text_overlay_font_size_percent=to_font_size,
                text_overlay_font_weight=text_overlay_font_weight,
                text_overlay_color=text_overlay_color,
                text_overlay_opacity=to_opacity,
                text_overlay_x_percent=to_x_pct,
                text_overlay_y_percent=to_y_pct,
                text_overlay_align=text_overlay_align,
                text_overlay_max_width_percent=to_max_width,
                text_overlay_shadow_enabled=text_overlay_shadow_bool,
                text_overlay_stroke_enabled=text_overlay_stroke_bool,
                text_overlay_stroke_color=text_overlay_stroke_color,
                text_overlay_background_enabled=text_overlay_bg_bool,
                text_overlay_background_color=text_overlay_background_color,
                text_overlay_background_opacity=to_bg_opacity,"""
                
replace_args = """                # Batch 16A — Text Overlay
                text_overlay_config=text_overlay_config,"""
                
content = content.replace(search_args, replace_args)

with open("backend/main.py", "w") as f:
    f.write(content)
print("main.py patched for generate_video call")
