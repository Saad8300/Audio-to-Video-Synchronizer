import re

# Safely remove only the kwarg assignments in generator calls
files = [
    "backend/main.py",
    "backend/batch_queue_runner.py",
]

for file_path in files:
    with open(file_path, "r") as f:
        content = f.read()

    # Remove enable_watermark=..., watermark_text=..., etc from function calls and dicts
    # In python, they look like:
    # enable_watermark=wm_enabled,
    # "watermark_text": watermark_text,
    content = re.sub(r'^\s*enable_watermark\s*[=:]\s*.*?,?\n', '', content, flags=re.MULTILINE)
    content = re.sub(r'^\s*"?watermark_\w+"?\s*[=:]\s*.*?,?\n', '', content, flags=re.MULTILINE)

    with open(file_path, "w") as f:
        f.write(content)

