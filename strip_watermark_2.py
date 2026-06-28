import re

files_to_strip = [
    "frontend/src/App.tsx",
    "frontend/src/components/MediaTimelinePage.tsx",
    "frontend/src/components/VideoTimelinePage.tsx",
    "frontend/src/utils/api.ts",
]

for file_path in files_to_strip:
    with open(file_path, "r") as f:
        lines = f.readlines()
    
    new_lines = []
    for line in lines:
        if "watermark" in line.lower() or "Watermark" in line:
            # Check if this line is an import that also imports other things
            if "import" in line and "{" in line:
                # We already replaced the import in the previous step, but let's be careful
                pass
            continue
        new_lines.append(line)
        
    with open(file_path, "w") as f:
        f.writelines(new_lines)
