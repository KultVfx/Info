#!/usr/bin/env bash
# Full rebuild: narration -> sound design -> 2D animation -> final mp4.
# Needs: RHVoice (+ rhvoice-russian), sox, ffmpeg, python3 (numpy, scipy), node + playwright/chromium.
set -euo pipefail
cd "$(dirname "$0")"
mkdir -p build
# Narration: ElevenLabs if a key is set (or VO_IMPORT=dir with ready files), else RHVoice fallback
if [[ -n "${VO_IMPORT:-}" ]]; then python3 src/tts_elevenlabs.py --import "$VO_IMPORT"
elif [[ -n "${ELEVENLABS_API_KEY:-}" ]]; then python3 src/tts_elevenlabs.py
else echo "ELEVENLABS_API_KEY not set -> RHVoice fallback"; python3 src/tts.py 100 96; fi
python3 src/audio.py
node src/render.js video 4
ffmpeg -y -v error -f concat -safe 0 -i build/chunks.txt -i build/mix.wav -map 0:v -map 1:a \
  -c:v libx264 -preset slow -crf 21 -pix_fmt yuv420p -profile:v high -movflags +faststart \
  -af "loudnorm=I=-14:TP=-1.5:LRA=11" -c:a aac -b:a 192k -ar 48000 -shortest \
  zombie_apocalypse_what_if.mp4
echo "done: zombie_apocalypse_what_if.mp4"
