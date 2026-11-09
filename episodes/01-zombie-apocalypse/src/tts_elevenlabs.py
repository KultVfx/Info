"""Narration via ElevenLabs instead of RHVoice. Produces the same build/vo_*.wav + build/timeline.json.

Usage:
  ELEVENLABS_API_KEY=... python3 src/tts_elevenlabs.py            # synthesize via API
  python3 src/tts_elevenlabs.py --import DIR                      # use ready files DIR/vo_SS_LL.(mp3|wav)
Env:
  ELEVENLABS_VOICE_ID   voice to use (default: "Horror Narrator RU (young, tense)", FbG6LcB6kpwX91YrUlz7 — a Voice Design voice in the account library)
  ELEVENLABS_MODEL      default eleven_multilingual_v2 (Russian support)
"""
import json, os, subprocess, sys, pathlib, urllib.request, wave

ROOT = pathlib.Path(__file__).resolve().parent.parent
BUILD = ROOT / "build"; BUILD.mkdir(exist_ok=True)
script = json.loads((ROOT / "src/script.json").read_text())
VOICE = os.environ.get("ELEVENLABS_VOICE_ID", "FbG6LcB6kpwX91YrUlz7")
MODEL = os.environ.get("ELEVENLABS_MODEL", "eleven_multilingual_v2")
KEY = os.environ.get("ELEVENLABS_API_KEY", "")
# low stability + high style = more emotional, nervous delivery
SETTINGS = {"stability": 0.3, "similarity_boost": 0.8, "style": 0.65, "use_speaker_boost": True,
            "speed": float(os.environ.get("ELEVENLABS_SPEED", "1.08"))}
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

MAX_GAP = float(os.environ.get("VO_MAX_GAP", "0.4"))  # cap long dramatic pauses inside a line (keeps pace fast)

def tighten(path):
    """Shorten silences inside a line to MAX_GAP and drop a lone short blip (breath/artifact) after a long pause at the end."""
    import numpy as np
    with wave.open(str(path)) as w:
        sr = w.getframerate(); x = np.frombuffer(w.readframes(w.getnframes()), np.int16).copy()
    hop = sr // 100; n = len(x) // hop
    rms = np.array([np.sqrt((x[i*hop:(i+1)*hop].astype(float)**2).mean()) for i in range(n)]) / 32768
    loud = rms > 10 ** (-38 / 20)
    runs, i = [], 0                       # (start_frame, end_frame, is_loud)
    while i < n:
        j = i
        while j < n and loud[j] == loud[i]: j += 1
        runs.append([i, j, bool(loud[i])]); i = j
    if len(runs) >= 3 and runs[-1][2] and (runs[-1][1] - runs[-1][0]) < 30 and not runs[-2][2] and (runs[-2][1] - runs[-2][0]) > 80:
        runs = runs[:-2]
    keep = int(MAX_GAP * 100); out = []
    for a, b, l in runs:
        if not l and b - a > keep:
            mid = (a + b) // 2; a, b = mid - keep // 2, mid + keep - keep // 2
        out.append(x[a*hop:b*hop])
    y = np.concatenate(out)
    with wave.open(str(path), "w") as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(sr); w.writeframes(y.tobytes())

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
            src = BUILD / f"el_{VOICE}" / f"{name}.mp3"; src.parent.mkdir(exist_ok=True)
            if not src.exists():
                synth(text, " ".join(flat[max(0, k - 2):k]), " ".join(flat[k + 1:k + 3]), src)
                print("synth", name, text)
        to_wav(src, out); tighten(out); k += 1
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
