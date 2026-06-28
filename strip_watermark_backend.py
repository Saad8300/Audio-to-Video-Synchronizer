import re

files_to_strip = [
    "backend/main.py",
    "backend/batch_queue_runner.py",
    "backend/video_generator.py",
    "backend/video_timeline_generator.py",
    "backend/media_timeline_generator.py"
]

for file_path in files_to_strip:
    with open(file_path, "r") as f:
        content = f.read()

    # If it's a Form(...) param in main.py, replace it with Form(default=None) or remove it.
    # It's safer to just remove all lines with `watermark` from main.py Form definitions
    if "main.py" in file_path:
        new_lines = []
        for line in content.split("\n"):
            if "watermark" in line.lower() and "=" in line and "Form" in line:
                # remove
                continue
            if "enable_watermark" in line and "Form" in line:
                continue
            new_lines.append(line)
        content = "\n".join(new_lines)
        
        # also remove lines where it passes watermark kwargs to generate functions
        content = re.sub(r'\s*enable_watermark=.*?,\n', '\n', content)
        content = re.sub(r'\s*watermark_.*?,\n', '\n', content)

    # In batch queue runner, just remove the kwargs lines
    if "batch_queue_runner.py" in file_path:
        content = re.sub(r'\s*enable_watermark=.*?,\n', '\n', content)
        content = re.sub(r'\s*watermark_.*?,\n', '\n', content)

    # In the generator files, we can just remove all watermark blocks
    # Wait, the generator functions might have them in the def signature
    if "generator.py" in file_path:
        # replace `enable_watermark: bool = False,`
        content = re.sub(r'\s*enable_watermark:\s*bool\s*=\s*False,?', '', content)
        content = re.sub(r'\s*watermark_text:\s*str\s*=\s*"",?', '', content)
        content = re.sub(r'\s*watermark_position_mode:\s*str\s*=\s*"preset",?', '', content)
        content = re.sub(r'\s*watermark_coordinate_mode:\s*str\s*=\s*"design_canvas",?', '', content)
        content = re.sub(r'\s*watermark_position:\s*str\s*=\s*"bottom_right",?', '', content)
        content = re.sub(r'\s*watermark_x:\s*int\s*=\s*50,?', '', content)
        content = re.sub(r'\s*watermark_y:\s*int\s*=\s*50,?', '', content)
        content = re.sub(r'\s*watermark_opacity:\s*float\s*=\s*0.65,?', '', content)
        content = re.sub(r'\s*watermark_size:\s*int\s*=\s*20,?', '', content)
        content = re.sub(r'\s*watermark_margin:\s*int\s*=\s*36,?', '', content)
        
        # Also remove the whole block where watermark is processed
        # e.g., if enable_watermark and watermark_text.strip():
        wm_block_pattern = r'# ── Watermark.*?# ── (?:Intro|Audio|Outro|Background)'
        # wait, that's risky. Let's just comment out `if enable_watermark:`
        content = re.sub(r'if enable_watermark and watermark_text\.strip\(\):', 'if False:', content)

    with open(file_path, "w") as f:
        f.write(content)
