"""Mix narration + ElevenLabs SFX into output/mix.wav following src/timeline.json."""
import json, subprocess, pathlib
root = pathlib.Path(__file__).resolve().parent.parent
tl = json.load(open(root / "src/timeline.json"))
sfx = lambda n: str(root / f"assets/audio/sfx/{n}.mp3")
# (file, start, volume, loop_for_seconds or None, fade_in, fade_out)
cues = [
    (sfx("title"), 0.2, 0.7, None, 0, 0.5),
    (sfx("rain"), 0.0, 0.55, 5.0, 0.5, 0.8),
    (sfx("drone"), 0.0, 0.35, 60.0, 2.0, 3.0),
    (sfx("room"), 4.6, 0.5, 10.6, 0.3, 0.6),
    (sfx("city"), 15.2, 0.6, 12.0, 0.4, 5.0),
    (sfx("tinnitus"), 24.0, 0.25, 8.6, 3.0, 1.0),
    (sfx("buzz"), 32.6, 0.45, 12.0, 0.2, 1.0),
    (sfx("steps"), 35.6, 0.9, 8.6, 0.1, 0.8),
    (sfx("sting"), 50.4, 0.8, None, 0, 0.5),
    (sfx("boom"), 56.3, 0.9, None, 0, 1.0),
]
for ln in tl["lines"]:
    cues.append((str(root / ln["file"]), ln["start"], 1.6, None, 0, 0))
args, filt, labels = ["ffmpeg", "-y", "-loglevel", "error"], [], []
for i, (f, st, vol, loop, fi, fo) in enumerate(cues):
    if loop: args += ["-stream_loop", "-1"]
    args += ["-i", f]
    chain = f"[{i}:a]aresample=44100,aformat=channel_layouts=stereo"
    if loop: chain += f",atrim=0:{loop}"
    if fi: chain += f",afade=t=in:d={fi}"
    if fo and loop: chain += f",afade=t=out:st={loop - fo}:d={fo}"
    chain += f",volume={vol},adelay={int(st * 1000)}|{int(st * 1000)}[a{i}]"
    filt.append(chain); labels.append(f"[a{i}]")
# PS1-ish: mild lowpass + light bitcrush on the ambience bed
filt.append("".join(labels) + f"amix=inputs={len(labels)}:normalize=0,lowpass=f=12000,alimiter=limit=0.9,atrim=0:60[out]")
args += ["-filter_complex", ";".join(filt), "-map", "[out]", "-ar", "44100", str(root / "output/mix.wav")]
subprocess.check_call(args); print("ok")
