"""Synthesize narration line by line with RHVoice and build timeline.json."""
import json, subprocess, sys, wave, pathlib, re

ROOT = pathlib.Path(__file__).resolve().parent.parent
BUILD = ROOT / "build"
BUILD.mkdir(exist_ok=True)
script = json.loads((ROOT / "src/script.json").read_text())
RATE = sys.argv[1] if len(sys.argv) > 1 else "112"   # % speech rate: nervous, slightly fast
PITCH = sys.argv[2] if len(sys.argv) > 2 else "96"
SR = 24000

def dur(p):
    with wave.open(str(p)) as w:
        return w.getnframes() / w.getframerate()

def pause_after(text):
    if text.endswith("..."): return 0.75
    if text.endswith("?"): return 0.55
    if text.endswith("!"): return 0.45
    return 0.35

t = 0.6
timeline = {"segments": [], "lines": []}
for si, seg in enumerate(script["segments"]):
    s_start = t
    if seg["card"]:
        t += 0.9          # whoosh + card slam before the narrator names it
    for li, text in enumerate(seg["lines"]):
        out = BUILD / f"vo_{si:02d}_{li:02d}.wav"
        subprocess.run(["RHVoice-test", "-p", script["voice"], "-r", RATE, "-t", PITCH,
                        "-R", str(SR), "-o", str(out)], input=text.encode(), check=True)
        d = dur(out)
        timeline["lines"].append({"seg": si, "text": text, "file": out.name,
                                  "start": round(t, 3), "end": round(t + d, 3),
                                  "is_card": li == 0 and bool(seg["card"])})
        t += d + pause_after(text)
    t += 0.6
    timeline["segments"].append({"scene": seg["scene"], "card": seg["card"],
                                 "start": round(s_start, 3), "end": round(t, 3)})
timeline["segments"][-1]["end"] = round(t + 2.5, 3)
timeline["duration"] = round(t + 2.5, 3)
(BUILD / "timeline.json").write_text(json.dumps(timeline, ensure_ascii=False, indent=1))
print("total duration:", timeline["duration"])
for s in timeline["segments"]:
    print(f'{s["scene"]:6s} {s["start"]:6.2f} -> {s["end"]:6.2f}  ({s["end"]-s["start"]:.1f}s)')
