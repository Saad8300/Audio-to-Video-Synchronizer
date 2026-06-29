import re

with open("backend/media_timeline_generator.py", "r") as f:
    content = f.read()

# 2. Update Text Overlay section
logic_search = """    # 7.5 Watermark (Batch 16C Text Overlay)
    # ------------------------------------------------------------------
    if text_overlay_config and text_overlay_config.get("enabled"):
        _progress(82, "Applying text overlay")
        try:
            from text_overlay import make_text_overlay
            overlay_arr = make_text_overlay(
                target_w=target_w, target_h=target_h,
                text=text_overlay_config.get("text", ""),
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
                overlay_clip = ImageClip(overlay_arr).set_duration(final_video.duration)
                final_video = CompositeVideoClip([final_video, overlay_clip])
        except Exception as e:
            logger.error(f"Text overlay failed: {e}")
            warnings_out.append(f"Could not apply text overlay: {e}")"""

logic_replace = """    # 7.5 Watermark (Batch 16D Text Overlay)
    # ------------------------------------------------------------------
    if text_overlay_config and text_overlay_config.get("enabled"):
        mode = text_overlay_config.get("mode", "whole_video")
        _progress(82, f"Applying text overlay ({mode})")
        try:
            from text_overlay import make_text_overlay
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
                c = create_overlay_clip(text_overlay_config.get("text", ""), 0, final_video.duration)
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
                        warnings_out.append(f"Skipped invalid timed text item {idx+1}: {ex}")
            elif mode == "csv_text":
                for r in rows:
                    txt = r.get("text", "").strip()
                    if txt:
                        c = create_overlay_clip(txt, r["start"], r["end"])
                        if c: overlay_clips.append(c)

            if overlay_clips:
                saved_audio = final_video.audio
                final_video = CompositeVideoClip([final_video.without_audio()] + overlay_clips, size=(target_w, target_h))
                if saved_audio:
                    final_video = final_video.set_audio(saved_audio)
                    
        except Exception as e:
            logger.error(f"Text overlay failed: {e}")
            warnings_out.append(f"Could not apply text overlay: {e}")"""
            
content = content.replace(logic_search, logic_replace)

with open("backend/media_timeline_generator.py", "w") as f:
    f.write(content)
print("media_timeline_generator.py patched")
