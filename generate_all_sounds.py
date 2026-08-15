#!/usr/bin/env python3
import urllib.request
import urllib.parse
import subprocess
import os
import glob

os.makedirs("./public/sounds", exist_ok=True)

def tts_to_mp3(text, out_mp3, speed=1.5, boost=1.8):
    temp_raw = f"temp_{os.path.basename(out_mp3)}.raw.mp3"
    url = 'https://translate.google.com/translate_tts?ie=UTF-8&client=tw-ob&tl=vi&q=' + urllib.parse.quote(text)
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'})
    with urllib.request.urlopen(req) as resp, open(temp_raw, 'wb') as f:
        f.write(resp.read())
    
    af = (
        "silenceremove=start_periods=1:start_duration=0.01:start_threshold=-50dB,"
        f"atempo={speed},"
        "areverse,silenceremove=start_periods=1:start_duration=0.01:start_threshold=-50dB,areverse,"
        f"volume={boost}"
    )
    
    subprocess.run([
        'ffmpeg', '-y', '-i', temp_raw,
        '-af', af,
        '-c:a', 'libmp3lame', '-ac', '2', '-ar', '44100', '-b:a', '128k',
        out_mp3
    ], check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    
    if os.path.exists(temp_raw):
        os.remove(temp_raw)

print("--- Generating All Driver Safety Vietnamese Sound Files ---")

# 1. Cảnh báo sớm mất tập trung
print("1. alert_mat_tap_trung.mp3 (Cảnh báo sớm mất tập trung)")
tts_to_mp3(
    "Chú ý! Bạn đang mất tập trung, hãy nhìn thẳng phía trước!",
    "./public/sounds/alert_mat_tap_trung.mp3",
    speed=1.6,
    boost=2.0
)

# 2. Cảnh báo sớm buồn ngủ
print("2. alert_buon_ngu_som.mp3 (Cảnh báo sớm buồn ngủ)")
tts_to_mp3(
    "Chú ý! Phát hiện buồn ngủ sớm, hãy tập trung lái xe!",
    "./public/sounds/alert_buon_ngu_som.mp3",
    speed=1.6,
    boost=2.0
)

# 3. Cảnh báo gục đầu
print("3. alert_guc_dau.mp3 (Gục đầu)")
tts_to_mp3(
    "Cảnh báo! Phát hiện gục đầu, hãy ngẩng cao đầu lên ngay!",
    "./public/sounds/alert_guc_dau.mp3",
    speed=1.65,
    boost=2.0
)

# 4. Cảnh báo nhắm mắt
print("4. alert_nham_mat.mp3 (Nhắm mắt)")
tts_to_mp3(
    "Cảnh báo! Bạn đang nhắm mắt, hãy mở mắt ra ngay!",
    "./public/sounds/alert_nham_mat.mp3",
    speed=1.55,
    boost=2.0
)

# 5. Cảnh báo nghiêng đầu
print("5. alert_nghieng_dau.mp3 (Nghiêng đầu)")
tts_to_mp3(
    "Cảnh báo! Bạn đang nghiêng đầu nhắm mắt, hãy tỉnh táo lại!",
    "./public/sounds/alert_nghieng_dau.mp3",
    speed=1.65,
    boost=2.0
)

# 6. Cảnh báo rời mắt
print("6. alert_roi_mat.mp3 (Rời mắt khỏi đường)")
tts_to_mp3(
    "Cảnh báo! Rời mắt khỏi đường, hãy nhìn thẳng phía trước!",
    "./public/sounds/alert_roi_mat.mp3",
    speed=1.75,
    boost=2.0
)

# 7. Cảnh báo mệt mỏi
print("7. alert_met_moi.mp3 (Mệt mỏi cấp 1)")
tts_to_mp3(
    "Phát hiện dấu hiệu mệt mỏi, hãy chú ý quan sát!",
    "./public/sounds/alert_met_moi.mp3",
    speed=1.6,
    boost=1.9
)

# 8. Cảnh báo nguy hiểm (Còi ngắn + giọng đọc)
print("8. alert_nguy_hiem.mp3 (Nguy hiểm)")
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
    '-af', 'silenceremove=start_periods=1:start_duration=0.01:start_threshold=-50dB,atempo=1.4,areverse,silenceremove=start_periods=1:start_duration=0.01:start_threshold=-50dB,areverse,volume=2.0',
    voice_danger_file
], check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

subprocess.run([
    'ffmpeg', '-y',
    '-i', siren_file,
    '-i', voice_danger_file,
    '-filter_complex', '[0:a][1:a]concat=n=2:v=0:a=1[out]',
    '-map', '[out]',
    '-c:a', 'libmp3lame', '-ac', '2', '-ar', '44100', '-b:a', '128k',
    './public/sounds/alert_nguy_hiem.mp3'
], check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

for f in [siren_file, voice_danger_file, 'temp_raw_danger.mp3']:
    if os.path.exists(f):
        os.remove(f)

# 9. Còi hú khẩn cấp liên tục + Giọng đọc (alert_khan_cap_lien_tuc.mp3)
print("9. alert_khan_cap_lien_tuc.mp3 (Còi hú liên tục + Giọng đọc khẩn cấp)")
url = 'https://translate.google.com/translate_tts?ie=UTF-8&client=tw-ob&tl=vi&q=' + urllib.parse.quote('Khẩn cấp! Nguy hiểm cực độ! Tỉnh dậy ngay, dừng xe lập tức!')
req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'})
with urllib.request.urlopen(req) as resp, open("temp_v1.mp3", 'wb') as f:
    f.write(resp.read())

subprocess.run([
    'ffmpeg', '-y', '-i', 'temp_v1.mp3',
    '-af', 'silenceremove=start_periods=1:start_duration=0.01:start_threshold=-50dB,atempo=1.35,areverse,silenceremove=start_periods=1:start_duration=0.01:start_threshold=-50dB,areverse,volume=2.2',
    'temp_voice_proc.wav'
], check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

dur_proc = float(subprocess.check_output([
    'ffprobe', '-i', 'temp_voice_proc.wav',
    '-show_entries', 'format=duration', '-v', 'quiet', '-of', 'csv=p=0'
]).decode().strip())
total_duration = dur_proc + 1.2

subprocess.run([
    'ffmpeg', '-y', '-f', 'lavfi',
    '-i', f'aevalsrc=sin(2*PI*(950+450*sin(2*PI*4.0*t))*t):s=44100:d={total_duration:.2f}',
    '-af', 'volume=1.0,lowpass=f=2800',
    'temp_siren_bg.wav'
], check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

subprocess.run([
    'ffmpeg', '-y',
    '-i', 'temp_siren_bg.wav',
    '-i', 'temp_voice_proc.wav',
    '-filter_complex',
    f'[1:a]adelay=400|400,volume=2.4[vdelayed];[0:a][vdelayed]amix=inputs=2:duration=first:dropout_transition=0:weights=0.8 2.2[mixed];[mixed]afade=t=in:ss=0:d=0.05,afade=t=out:st={total_duration-0.1:.2f}:d=0.1,volume=1.5[out]',
    '-map', '[out]',
    '-c:a', 'libmp3lame', '-ac', '2', '-ar', '44100', '-b:a', '128k',
    './public/sounds/alert_khan_cap_lien_tuc.mp3'
], check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

for f in ['temp_v1.mp3', 'temp_voice_proc.wav', 'temp_siren_bg.wav']:
    if os.path.exists(f):
        os.remove(f)

# 10. Beep chuyển đổi độ nhạy
print("10. beep_level.mp3 (Bíp chuyển độ nhạy)")
subprocess.run([
    'ffmpeg', '-y', '-f', 'lavfi',
    '-i', 'sine=frequency=1300:duration=0.22',
    '-af', 'afade=t=in:ss=0:d=0.01,afade=t=out:st=0.17:d=0.05,volume=1.6',
    '-c:a', 'libmp3lame', '-ac', '2', '-ar', '44100', '-b:a', '128k',
    './public/sounds/beep_level.mp3'
], check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

print("\n--- Summary of All Generated Audio Files ---")
for f in sorted(glob.glob('./public/sounds/*.mp3')):
    dur = float(subprocess.check_output(['ffprobe', '-i', f, '-show_entries', 'format=duration', '-v', 'quiet', '-of', 'csv=p=0']).decode().strip())
    size = os.path.getsize(f) / 1024
    print(f"{os.path.basename(f):32} : {dur:5.2f}s  ({size:5.1f} KB)")
