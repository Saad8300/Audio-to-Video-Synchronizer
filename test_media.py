import sys
import os
sys.path.append('backend')
from media_timeline_generator import generate_media_timeline

csv_data = """start,end,asset,text
0,5,1.png,"Opening image"
5,10,1.mp4,"First video clip"
10,15,2.jpg,"Second image"
15,20,2.mp4,"Second video clip"
20,25,,"Text-only screen"
"""

try:
    generate_media_timeline(
        audio_path="temp_test/1.mp3",
        zip_path="temp_test/test2.zip",
        csv_path=None,
        output_path="test_output.mp4",
        temp_dir="temp_test",
        aspect_ratio="16:9",
        export_resolution="720p",
        fit_mode="cover",
        fill_mode="loop",
        render_profile="balanced",
        transition="none",
        zoom_effect="none",
        watermark_enabled=False,
        bg_music_enabled=False,
        job_id="testjob123",
        csv_content=csv_data
    )
    print("SUCCESS")
except Exception as e:
    import traceback
    traceback.print_exc()
    print("FAILED")
