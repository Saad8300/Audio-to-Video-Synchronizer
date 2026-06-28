with open("frontend/src/utils/api.ts", "r") as f:
    content = f.read()

import re
content = re.sub(r'\s*if\s*\(wmActive\)\s*\{\s*\}', '', content)
content = re.sub(r'form\.append\(\'background_music_fade\',.*?\n\s*\}\n', 'form.append(\'background_music_fade\',   String(settings.backgroundMusicFade))\n', content)

with open("frontend/src/utils/api.ts", "w") as f:
    f.write(content)
