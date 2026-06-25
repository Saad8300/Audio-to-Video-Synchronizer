import os
import sys

sys.path.append(os.path.abspath('backend'))
from utils import apply_visual_style
from PIL import Image

temp_dir = 'backend/temp/test_job'
os.makedirs(temp_dir, exist_ok=True)
img_path = os.path.join(temp_dir, 'img1.jpg')
Image.new('RGB', (1000, 1000), color='red').save(img_path)

img = Image.open(img_path)
styles = ['none', 'cinematic', 'warm', 'high_contrast', 'black_and_white', 'clean_bright']
strengths = ['low', 'medium', 'high']

for style in styles:
    for strength in strengths:
        try:
            res = apply_visual_style(img.copy(), style, strength)
            if res.size != img.size:
                print(f"FAILED size for {style} {strength}")
            else:
                print(f"SUCCESS {style} {strength}")
        except Exception as e:
            print(f"ERROR for {style} {strength}: {e}")
