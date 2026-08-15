#!/usr/bin/env python3
import urllib.request
import urllib.parse
import subprocess
import os

os.makedirs("./public/sounds", exist_ok=True)

def make_voice(text, raw_file, out_file, speed=1.65, boost=1.9):
    url = 'https://translate.google.com/translate_tts?ie=UTF-8&client=tw-ob&tl=vi&q=' + urllib.parse.quote(text)
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'})
    with urllib.request.urlopen(req) as resp, open(raw_file, 'wb') as f:
        f.write(resp.read())
    
    # 1) silenceremove at start and end
    # 2) tempo speedup
    # 3) volume enhancement
    af = (
        "silenceremove=start_periods=1:start_duration=0.01:start_threshold=-50dB,"
        f"atempo={speed},"
        "areverse,silenceremove=start_periods=1:start_duration=0.01:start_threshold=-50dB,areverse,"
        f"volume={boost}"
    )
    
    subprocess.run([
        'ffmpeg', '-y', '-i', raw_file,
        '-af', af,
        '-ac', '2', '-ar', '44100', '-b:a', '128k',
        out_file
    ], check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    if os.path.exists(raw_file):
        os.remove(raw_file)

print("1. Generating alert_mat_tap_trung.mp3...")
# "Chú ý! Bạn đang mất tập trung, hãy nhìn thẳng phía trước!"
make_voice(
    "Chú ý! Bạn đang mất tập trung, hãy nhìn thẳng phía trước!",
    "temp_mat_tap_trung.mp3",
    "./public/sounds/alert_mat_tap_trung.mp3",
    speed=1.65,
    boost=2.0
)

print("2. Generating alert_buon_ngu_som.mp3...")
# "Chú ý! Phát hiện buồn ngủ sớm, hãy tập trung lái xe!"
make_voice(
    "Chú ý! Phát hiện buồn ngủ sớm, hãy tập trung lái xe!",
    "temp_buon_ngu_som.mp3",
    "./public/sounds/alert_buon_ngu_som.mp3",
    speed=1.65,
    boost=2.0
)

print("All early warning sound files generated successfully!")
