import re

with open("backend/video_generator.py", "r") as f:
    content = f.read()

# 1. Signature replacement
sig_search = """    # Batch 16A — Text Overlay
    text_overlay_enabled: bool = False,
    text_overlay_text: str = "",
    text_overlay_font_family: str = "Inter",
    text_overlay_font_size_percent: float = 5.0,
    text_overlay_font_weight: str = "Medium",
    text_overlay_color: str = "#FFFFFF",
    text_overlay_opacity: float = 100.0,
    text_overlay_x_percent: float = 50.0,
    text_overlay_y_percent: float = 88.0,
    text_overlay_align: str = "center",
    text_overlay_max_width_percent: float = 90.0,
    text_overlay_shadow_enabled: bool = True,
    text_overlay_stroke_enabled: bool = False,
    text_overlay_stroke_color: str = "#000000",
    text_overlay_background_enabled: bool = False,
    text_overlay_background_color: str = "#000000",
    text_overlay_background_opacity: float = 50.0,"""

sig_replace = """    # Batch 16A — Text Overlay
    text_overlay_config: Optional[dict] = None,"""
content = content.replace(sig_search, sig_replace)

# 2. Logic replacement
logic_search = """    # ------------------------------------------------------------------
    # 8. Text Overlay (Batch 16A)
    # ------------------------------------------------------------------
    intro_clip = None
    outro_clip = None
    if use_text_overlay:
        _progress(78, "Applying text overlay")
        overlay_arr = make_text_overlay(
            target_w=target_w,
            target_h=target_h,
            text=text_overlay_text,
            font_family=text_overlay_font_family,
            font_size_percent=text_overlay_font_size_percent,
            font_weight=text_overlay_font_weight,
            color=text_overlay_color,
            opacity=text_overlay_opacity,
            x_percent=text_overlay_x_percent,
            y_percent=text_overlay_y_percent,
            align=text_overlay_align,
            max_width_percent=text_overlay_max_width_percent,
            shadow_enabled=text_overlay_shadow_enabled,
            stroke_enabled=text_overlay_stroke_enabled,
            stroke_color=text_overlay_stroke_color,
            bg_enabled=text_overlay_background_enabled,
            bg_color=text_overlay_background_color,
            bg_opacity=text_overlay_background_opacity
        )
        if overlay_arr is not None:
            overlay_clip = ImageClip(overlay_arr).set_duration(video.duration)
            video = CompositeVideoClip([video, overlay_clip])
        else:
            warnings.append("Text overlay could not be rendered. Continuing without it.")
        _check_cancel()"""

logic_replace = """    # ------------------------------------------------------------------
    # 8. Text Overlay (Batch 16D)
    # ------------------------------------------------------------------
    intro_clip = None
    outro_clip = None
    if text_overlay_config and text_overlay_config.get("enabled"):
        mode = text_overlay_config.get("mode", "whole_video")
        _progress(78, f"Applying text overlay ({mode})")
        
        overlay_clips = []
        def create_overlay_clip(txt, start, end):
            overlay_arr = make_text_overlay(
                target_w=target_w, target_h=target_h,
                text=txt,
                font_family=text_overlay_config.get("font_family", "Inter"),
                font_size_percent=text_overlay_config.get("font_size_percent", 5.0),
                font_weight=text_overlay_config.get("font_weight", "Bold"),
                color=text_overlay_config.get("color", "#FFFFFF"),
                opacity=text_overlay_config.get("opacity", 100.0),
                x_percent=text_overlay_config.get("x_percent", 50.0),
                y_percent=text_overlay_config.get("y_percent", 90.0),
                align=text_overlay_config.get("align", "center"),
                max_width_percent=text_overlay_config.get("max_width_percent", 80.0),
                shadow_enabled=text_overlay_config.get("shadow_enabled", True),
                stroke_enabled=text_overlay_config.get("stroke_enabled", True),
                stroke_color=text_overlay_config.get("stroke_color", "#000000"),
                bg_enabled=text_overlay_config.get("background_enabled", False),
                bg_color=text_overlay_config.get("background_color", "#000000"),
                bg_opacity=text_overlay_config.get("background_opacity", 50.0)
            )
            if overlay_arr is not None:
                return ImageClip(overlay_arr).set_start(start).set_end(end)
            return None

        if mode == "whole_video":
            c = create_overlay_clip(text_overlay_config.get("text", ""), 0, video.duration)
            if c: overlay_clips.append(c)
        elif mode == "timed_text":
            from utils import parse_time
            items = text_overlay_config.get("items", [])
            for idx, itm in enumerate(items):
                try:
                    s_str = str(itm.get("start", "00:00"))
                    e_str = str(itm.get("end", "00:05"))
                    if s_str.isdigit() or (s_str.replace('.','',1).isdigit()):
                        s = float(s_str)
                    else:
                        s = parse_time(s_str)
                    if e_str.isdigit() or (e_str.replace('.','',1).isdigit()):
                        e = float(e_str)
                    else:
                        e = parse_time(e_str)
                    
                    if e > s and itm.get("text"):
                        c = create_overlay_clip(itm.get("text"), s, e)
                        if c: overlay_clips.append(c)
                except Exception as ex:
                    warnings.append(f"Skipped invalid timed text item {idx+1}: {ex}")
        elif mode == "csv_text":
            for r in rows:
                txt = r.get("text", "").strip()
                if txt:
                    c = create_overlay_clip(txt, r["start"], r["end"])
                    if c: overlay_clips.append(c)

        if overlay_clips:
            from moviepy.editor import CompositeVideoClip
            saved_audio = video.audio
            video = CompositeVideoClip([video.without_audio()] + overlay_clips, size=(target_w, target_h))
            if saved_audio:
                video = video.set_audio(saved_audio)
        _check_cancel()"""
        
# also need to replace `use_text_overlay = text_overlay_enabled and bool(text_overlay_text.strip())`
# Let's just comment it out.
content = content.replace("    use_text_overlay = text_overlay_enabled and bool(text_overlay_text.strip())", "    # use_text_overlay removed in Batch 16D")
content = content.replace(logic_search, logic_replace)

with open("backend/video_generator.py", "w") as f:
    f.write(content)
print("video_generator.py patched")
