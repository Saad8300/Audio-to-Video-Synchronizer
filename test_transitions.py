import sys
import os

sys.path.append(os.path.abspath('backend'))
from video_generator import generate_video

temp_dir = 'backend/temp/test_job'
with open(os.path.join(temp_dir, 'times.csv'), 'w') as f:
    f.write("image,start,end,text\n")
    f.write("img1.jpg,00:00,00:01,one\n")
    f.write("img2.jpg,00:01,00:02,two\n")
    f.write("img3.jpg,00:02,00:03,three\n")

for trans in ['crossfade', 'push_left', 'zoom_in']:
    print(f"Testing '{trans}' transition...")
    res = generate_video(
        audio_path=os.path.join(temp_dir, 'audio.wav'),
        zip_path=os.path.join(temp_dir, 'images.zip'),
        csv_path=os.path.join(temp_dir, 'times.csv'),
        output_path=f'backend/outputs/test_{trans}.mp4',
        temp_dir=temp_dir,
        transition=trans,
        transition_duration=0.5,
        motion_effect='none',
        render_profile='fast_preview',
        export_resolution='720p',
    )
    print("Result:", res['success'])
    if not res['success']:
        print("Errors:", res['errors'])
