import subprocess
import re
import os
from collections import Counter

directory = 'c:/Users/nicol/Desktop/Site portfolio gauteh/assets/videos'
videos = ['puzzle-02.mp4', 'puzzle-08.mp4']

def detect_crop(video_path):
    cmd = ['ffmpeg', '-ss', '00:00:05', '-i', video_path, '-vframes', '30', '-vf', 'cropdetect=24:2:0', '-f', 'null', '-']
    res = subprocess.run(cmd, stderr=subprocess.PIPE, text=True)
    matches = re.findall(r'crop=([0-9:]+)', res.stderr)
    return Counter(matches).most_common(1)[0][0] if matches else None

for vid in videos:
    path = os.path.join(directory, vid)
    temp_path = os.path.join(directory, f"temp_{vid}")
    
    print(f"[*] Analyzing {vid}...")
    crop_val = detect_crop(path)
    if not crop_val:
        print(f"[!] Could not detect crop for {vid}, skipping.")
        continue
        
    print(f"[*] Detected crop: {crop_val} for {vid}. Cropping now...")
    crop_cmd = [
        'ffmpeg', '-y', '-i', path,
        '-vf', f'crop={crop_val}',
        '-c:a', 'copy',
        temp_path
    ]
    subprocess.run(crop_cmd, check=True)
    
    print(f"[*] Replacing original {vid} with cropped version.")
    os.replace(temp_path, path)
    
print("[+] Processing complete.")
