"""Generate narration clips with ElevenLabs (auth injected by proxy)."""
import json, sys, urllib.request, pathlib, subprocess
VOICE = "JBFqnCBsd6RMkjVDRZzb"  # George - Warm, Captivating Storyteller
root = pathlib.Path(__file__).resolve().parent.parent
out = root / "assets/audio/vo"; out.mkdir(parents=True, exist_ok=True)
lines = json.load(open(root / "tools/lines.json"))
prev = ""
for i, ln in enumerate(lines):
    f = out / f"line{i+1:02d}.mp3"
    nxt = lines[i+1]["text"] if i+1 < len(lines) else ""
    if not f.exists() or "--force" in sys.argv:
        body = {"text": ln["text"], "model_id": "eleven_multilingual_v2",
                "previous_text": prev, "next_text": nxt,
                "voice_settings": {"stability": 0.7, "similarity_boost": 0.8,
                                   "style": 0.15, "use_speaker_boost": True, "speed": 0.92}}
        req = urllib.request.Request(
            f"https://api.elevenlabs.io/v1/text-to-speech/{VOICE}?output_format=mp3_44100_128",
            data=json.dumps(body).encode(), headers={"Content-Type": "application/json", "xi-api-key": "dummy"})
        f.write_bytes(urllib.request.urlopen(req).read())
    prev = ln["text"]
    d = subprocess.check_output(["ffprobe","-v","error","-show_entries","format=duration","-of","csv=p=0",str(f)]).decode().strip()
    print(f.name, d)
