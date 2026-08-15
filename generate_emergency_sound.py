#!/usr/bin/env python3
import urllib.request
import urllib.parse
import subprocess
import os

os.makedirs("./public/sounds", exist_ok=True)

def generate_continuous_emergency_alert():
    print("Generating alert_khan_cap_lien_tuc.mp3 (Continuous emergency siren with voice warning)...")
    
    # 1. Fetch Vietnamese voice warnings
    text1 = "Khẩn cấp! Nguy hiểm cực độ! Tỉnh dậy ngay, dừng xe lập tức!"
    url1 = 'https://translate.google.com/translate_tts?ie=UTF-8&client=tw-ob&tl=vi&q=' + urllib.parse.quote(text1)
    req1 = urllib.request.Request(url1, headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'})
    
    with urllib.request.urlopen(req1) as resp, open("temp_v1.mp3", 'wb') as f:
        f.write(resp.read())
        
    # Process voice 1 (speed up slightly, trim silence, normalize)
    subprocess.run([
        'ffmpeg', '-y', '-i', 'temp_v1.mp3',
        '-af', 'silenceremove=start_periods=1:start_duration=0.01:start_threshold=-50dB,atempo=1.35,areverse,silenceremove=start_periods=1:start_duration=0.01:start_threshold=-50dB,areverse,volume=2.2',
        'temp_voice_proc.wav'
    ], check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    
    # Measure voice duration
    dur_proc = float(subprocess.check_output([
        'ffprobe', '-i', 'temp_voice_proc.wav',
        '-show_entries', 'format=duration', '-v', 'quiet', '-of', 'csv=p=0'
    ]).decode().strip())
    
    total_duration = dur_proc + 1.2  # Add siren head and tail for seamless pacing
    
    # 2. Synthesize emergency dual-pitch wailing siren track (fast sweep)
    # Pitch sweeps between 700Hz and 1400Hz with fast oscillation (4.5 Hz)
    subprocess.run([
        'ffmpeg', '-y', '-f', 'lavfi',
        '-i', f'aevalsrc=sin(2*PI*(950+450*sin(2*PI*4.0*t))*t):s=44100:d={total_duration:.2f}',
        '-af', 'volume=1.0,lowpass=f=2800',
        'temp_siren_bg.wav'
    ], check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

    # 3. Mix siren background + delayed voice track (voice starts 0.4s after initial siren blast)
    subprocess.run([
        'ffmpeg', '-y',
        '-i', 'temp_siren_bg.wav',
        '-i', 'temp_voice_proc.wav',
        '-filter_complex',
        '[1:a]adelay=400|400,volume=2.4[vdelayed];[0:a][vdelayed]amix=inputs=2:duration=first:dropout_transition=0:weights=0.8 2.2[mixed];[mixed]afade=t=in:ss=0:d=0.05,afade=t=out:st=' + f'{total_duration-0.1:.2f}' + ':d=0.1,volume=1.5[out]',
        '-map', '[out]',
        '-ac', '2', '-ar', '44100', '-b:a', '128k',
        './public/sounds/alert_khan_cap_lien_tuc.mp3'
    ], check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

    # Cleanup temp files
    for f in ['temp_v1.mp3', 'temp_voice_proc.wav', 'temp_siren_bg.wav']:
        if os.path.exists(f):
            os.remove(f)

    # Verify
    dur_out = float(subprocess.check_output([
        'ffprobe', '-i', './public/sounds/alert_khan_cap_lien_tuc.mp3',
        '-show_entries', 'format=duration', '-v', 'quiet', '-of', 'csv=p=0'
    ]).decode().strip())
    print(f"Created ./public/sounds/alert_khan_cap_lien_tuc.mp3 duration: {dur_out:.2f}s")

if __name__ == "__main__":
    generate_continuous_emergency_alert()
