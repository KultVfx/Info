"""Narration via ElevenLabs instead of RHVoice. Produces the same build/vo_*.wav + build/timeline.json.

Usage:
  ELEVENLABS_API_KEY=... python3 src/tts_elevenlabs.py            # synthesize via API
  python3 src/tts_elevenlabs.py --import DIR                      # use ready files DIR/vo_SS_LL.(mp3|wav)
Env:
  ELEVENLABS_VOICE_ID   voice to use (default: Brian, nPczCjzI2devNBz1zQrb — pick any voice from your library)
  ELEVENLABS_MODEL      default eleven_multilingual_v2 (Russian support)
"""
import json, os, subprocess, sys, pathlib, urllib.request, wave

ROOT = pathlib.Path(__file__).resolve().parent.parent
BUILD = ROOT / "build"; BUILD.mkdir(exist_ok=True)
script = json.loads((ROOT / "src/script.json").read_text())
VOICE = os.environ.get("ELEVENLABS_VOICE_ID", "nPczCjzI2devNBz1zQrb")
MODEL = os.environ.get("ELEVENLABS_MODEL", "eleven_multilingual_v2")
KEY = os.environ.get("ELEVENLABS_API_KEY", "")
# low stability + high style = more emotional, nervous delivery
SETTINGS = {"stability": 0.3, "similarity_boost": 0.8, "style": 0.65, "use_speaker_boost": True}
IMPORT = sys.argv[sys.argv.index("--import") + 1] if "--import" in sys.argv else None

def synth(text, prev, nxt, out_mp3):
    body = json.dumps({"text": text, "model_id": MODEL, "voice_settings": SETTINGS,
                       "previous_text": prev, "next_text": nxt}).encode()
    req = urllib.request.Request(
        f"https://api.elevenlabs.io/v1/text-to-speech/{VOICE}?output_format=mp3_44100_128",
        data=body, headers={"xi-api-key": KEY, "Content-Type": "application/json", "Accept": "audio/mpeg"})
    with urllib.request.urlopen(req, timeout=120) as r:
        out_mp3.write_bytes(r.read())

def to_wav(src, dst):  # mono 44.1k, trim leading/trailing silence so timings are tight
    subprocess.run(["ffmpeg", "-y", "-v", "error", "-i", str(src), "-ac", "1", "-ar", "44100", "-af",
                    "silenceremove=start_periods=1:start_threshold=-45dB,areverse,"
                    "silenceremove=start_periods=1:start_threshold=-45dB,areverse", str(dst)], check=True)

def dur(p):
    with wave.open(str(p)) as w: return w.getnframes() / w.getframerate()

def pause_after(text):
    return 0.75 if text.endswith("...") else 0.55 if text.endswith("?") else 0.45 if text.endswith("!") else 0.35

if not IMPORT and not KEY:
    sys.exit("Set ELEVENLABS_API_KEY or use --import DIR")
flat = [l for s in script["segments"] for l in s["lines"]]
TARGET = float(os.environ.get("VO_TARGET", "120"))   # stretch pauses so the episode fills this length
k = 0; durs = {}
for si, seg in enumerate(script["segments"]):
    for li, text in enumerate(seg["lines"]):
        name = f"vo_{si:02d}_{li:02d}"; out = BUILD / f"{name}.wav"
        if IMPORT:
            src = next(pathlib.Path(IMPORT).glob(f"{name}.*"))
        else:
            src = BUILD / f"{name}.mp3"
            if not src.exists():
                synth(text, " ".join(flat[max(0, k - 2):k]), " ".join(flat[k + 1:k + 3]), src)
                print("synth", name, text)
        to_wav(src, out); k += 1
        durs[(si, li)] = dur(out)

def layout(extra):
    t = 0.6; tl = {"engine": "elevenlabs", "segments": [], "lines": []}
    for si, seg in enumerate(script["segments"]):
        s_start = t
        if seg["card"]: t += 0.9
        for li, text in enumerate(seg["lines"]):
            d = durs[(si, li)]
            tl["lines"].append({"seg": si, "text": text, "file": f"vo_{si:02d}_{li:02d}.wav", "start": round(t, 3),
                                "end": round(t + d, 3), "is_card": li == 0 and bool(seg["card"])})
            t += d + pause_after(text) + extra
        t += 0.6 + extra
        tl["segments"].append({"scene": seg["scene"], "card": seg["card"], "start": round(s_start, 3), "end": round(t, 3)})
    tl["segments"][-1]["end"] = round(t + 2.5, 3); tl["duration"] = round(t + 2.5, 3)
    return tl

base = layout(0)["duration"]
gaps = sum(len(s["lines"]) + 1 for s in script["segments"])
timeline = layout(max(0.0, (TARGET - base) / gaps))
(BUILD / "timeline.json").write_text(json.dumps(timeline, ensure_ascii=False, indent=1))
print("speech-only layout:", base, "-> stretched to", timeline["duration"])
