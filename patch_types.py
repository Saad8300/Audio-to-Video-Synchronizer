import re

with open("frontend/src/types/index.ts", "r") as f:
    content = f.read()

# Add to ImageTimelineSettings
content = content.replace(
    "textOverlayEnabled: boolean;",
    "textOverlayEnabled: boolean;\n  textOverlayMode: 'whole_video' | 'timed_text' | 'csv_text';\n  textOverlayItems: Array<{ id: string; text: string; start: string; end: string; }>;"
)

# Add to VideoTimelineSettings
content = content.replace(
    "textOverlayEnabled: boolean;",
    "textOverlayEnabled: boolean;\n  textOverlayMode: 'whole_video' | 'timed_text' | 'csv_text';\n  textOverlayItems: Array<{ id: string; text: string; start: string; end: string; }>;"
)

# Wait, `replace` replaces all occurrences! So if I just do one replace, it might hit all of them.
# Let's count them:
# There are 3 occurrences of textOverlayEnabled in index.ts (one for each Settings interface)

with open("frontend/src/types/index.ts", "r") as f:
    content = f.read()
    
# Actually let's just do it cleanly
new_lines = """  textOverlayEnabled: boolean;
  textOverlayMode: 'whole_video' | 'timed_text' | 'csv_text';
  textOverlayItems: Array<{ id: string; text: string; start: string; end: string; }>;"""
  
content = content.replace("  textOverlayEnabled: boolean;", new_lines)

with open("frontend/src/types/index.ts", "w") as f:
    f.write(content)
print("types/index.ts updated")
