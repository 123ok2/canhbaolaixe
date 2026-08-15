#!/usr/bin/env python3
import urllib.request
import urllib.parse
import subprocess
import os

os.makedirs("./public/sounds", exist_ok=True)

def make_voice(text, raw_file, out_file, speed=1.7):
    url = 'https://translate.google.com/translate_tts?ie=UTF-8&client=tw-ob&tl=vi&q=' + urllib.parse.quote(text)
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'})
    with urllib.request.urlopen(req) as resp, open(raw_file, 'wb') as f:
        f.write(resp.read())
    
    # Trim initial silence, speed up, trim trailing silence via reverse-trim-reverse, boost volume
    af = (
        "silenceremove=start_periods=1:start_duration=0.01:start_threshold=-50dB,"
        f"atempo={speed},"
        "areverse,silenceremove=start_periods=1:start_duration=0.01:start_threshold=-50dB,areverse,"
        "volume=1.6"
    )
    
    subprocess.run([
        'ffmpeg', '-y', '-i', raw_file,
        '-af', af,
        '-ac', '2', '-ar', '44100', '-b:a', '128k',
        out_file
    ], check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    if os.path.exists(raw_file):
        os.remove(raw_file)

print("1. Generating alert_guc_dau.mp3 (target: 1.5 - 2.5s)...")
# "Cảnh báo! Phát hiện gục đầu, hãy ngẩng cao đầu lên ngay!"
make_voice(
    "Cảnh báo! Phát hiện gục đầu, hãy ngẩng cao đầu lên ngay!",
    "temp_guc_dau.mp3",
    "./public/sounds/alert_guc_dau.mp3",
    speed=1.75
)

print("2. Generating alert_nham_mat.mp3 (target: 1.5 - 2.5s)...")
# "Cảnh báo! Bạn đang nhắm mắt, hãy mở mắt ra ngay!"
make_voice(
    "Cảnh báo! Bạn đang nhắm mắt, hãy mở mắt ra ngay!",
    "temp_nham_mat.mp3",
    "./public/sounds/alert_nham_mat.mp3",
    speed=1.6
)

print("3. Generating alert_nghieng_dau.mp3 (target: 1.5 - 2.5s)...")
# "Cảnh báo! Bạn đang nghiêng đầu nhắm mắt, hãy tỉnh táo lại!"
make_voice(
    "Cảnh báo! Bạn đang nghiêng đầu nhắm mắt, hãy tỉnh táo lại!",
    "temp_nghieng_dau.mp3",
    "./public/sounds/alert_nghieng_dau.mp3",
    speed=1.75
)

print("4. Generating alert_roi_mat.mp3 (target: 1.5 - 2.0s)...")
# "Cảnh báo! Rời mắt khỏi đường, hãy nhìn thẳng phía trước!"
make_voice(
    "Cảnh báo! Rời mắt khỏi đường, hãy nhìn thẳng phía trước!",
    "temp_roi_mat.mp3",
    "./public/sounds/alert_roi_mat.mp3",
    speed=2.0
)

print("5. Generating alert_nguy_hiem.mp3 (target: 2.5 - 3.5s)...")
# (Còi hú) + "Nguy hiểm cực độ! Dừng xe nghỉ ngơi ngay!"
siren_file = "temp_siren.wav"
subprocess.run([
    'ffmpeg', '-y', '-f', 'lavfi',
    '-i', 'aevalsrc=sin(2*PI*(850+450*sin(2*PI*6*t))*t):s=44100:d=0.85',
    '-af', 'afade=t=in:ss=0:d=0.03,afade=t=out:st=0.78:d=0.07,volume=1.8',
    siren_file
], check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

voice_danger_file = "temp_voice_danger.wav"
url = 'https://translate.google.com/translate_tts?ie=UTF-8&client=tw-ob&tl=vi&q=' + urllib.parse.quote('Nguy hiểm cực độ! Dừng xe nghỉ ngơi ngay!')
req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'})
with urllib.request.urlopen(req) as resp, open("temp_raw_danger.mp3", 'wb') as f:
    f.write(resp.read())

subprocess.run([
    'ffmpeg', '-y', '-i', 'temp_raw_danger.mp3',
    '-af', 'silenceremove=start_periods=1:start_duration=0.01:start_threshold=-50dB,atempo=1.35,areverse,silenceremove=start_periods=1:start_duration=0.01:start_threshold=-50dB,areverse,volume=1.8',
    voice_danger_file
], check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

subprocess.run([
    'ffmpeg', '-y',
    '-i', siren_file,
    '-i', voice_danger_file,
    '-filter_complex', '[0:a][1:a]concat=n=2:v=0:a=1[out]',
    '-map', '[out]',
    '-ac', '2', '-ar', '44100', '-b:a', '128k',
    './public/sounds/alert_nguy_hiem.mp3'
], check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

for f in [siren_file, voice_danger_file, 'temp_raw_danger.mp3']:
    if os.path.exists(f):
        os.remove(f)

print("6. Generating alert_met_moi.mp3 (target: 1.5 - 2.0s)...")
# "Phát hiện dấu hiệu mệt mỏi, hãy chú ý quan sát!"
make_voice(
    "Phát hiện dấu hiệu mệt mỏi, hãy chú ý quan sát!",
    "temp_met_moi.mp3",
    "./public/sounds/alert_met_moi.mp3",
    speed=1.7
)

print("7. Generating beep_level.mp3 (target: 0.2 - 0.3s)...")
# Tiếng bíp ngắn khi bấm chuyển độ nhạy (Mức 1 đến 5).
subprocess.run([
    'ffmpeg', '-y', '-f', 'lavfi',
    '-i', 'sine=frequency=1300:duration=0.22',
    '-af', 'afade=t=in:ss=0:d=0.01,afade=t=out:st=0.17:d=0.05,volume=1.6',
    '-ac', '2', '-ar', '44100', '-b:a', '128k',
    './public/sounds/beep_level.mp3'
], check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

print("All audio files generated successfully!")
