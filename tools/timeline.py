"""Build src/timeline.json: narration start times, durations, subtitle chunks, scene ranges."""
import json, re, subprocess, pathlib
root = pathlib.Path(__file__).resolve().parent.parent
lines = json.load(open(root / "tools/lines.json"))
STARTS = [1.0, 5.0, 10.3, 15.6, 23.0, 33.0, 40.2, 45.0, 54.4]
SCENES = [  # name, start, end
    ["exterior", 0.0, 4.6], ["bedroom", 4.6, 10.0], ["bathroom", 10.0, 15.2],
    ["street", 15.2, 22.6], ["dimming", 22.6, 32.6], ["corridor", 32.6, 39.8],
    ["footprints", 39.8, 44.6], ["eyes", 44.6, 53.8], ["ending", 53.8, 60.0]]
out = {"duration": 60.0, "fps": 30, "scenes": SCENES, "lines": [], "subs": []}
for i, (ln, st) in enumerate(zip(lines, STARTS)):
    f = root / f"assets/audio/vo/line{i+1:02d}.mp3"
    d = float(subprocess.check_output(["ffprobe", "-v", "error", "-show_entries", "format=duration",
                                       "-of", "csv=p=0", str(f)]))
    out["lines"].append({"file": str(f.relative_to(root)), "start": st, "dur": d, "text": ln["text"]})
    parts = [p for p in re.split(r"(?<=[.?!])\s+", ln["text"]) if p]
    # merge very short chunks with the previous one
    chunks = []
    for p in parts:
        if chunks and len(p) < 12 and len(chunks[-1]) < 30: chunks[-1] += " " + p
        else: chunks.append(p)
    total = sum(len(c) for c in chunks); t = st
    for c in chunks:
        cd = d * len(c) / total
        out["subs"].append({"start": round(t, 3), "end": round(t + cd + 0.25, 3), "text": c}); t += cd
json.dump(out, open(root / "src/timeline.json", "w"), ensure_ascii=False, indent=1)
for s in out["subs"]: print(s)
