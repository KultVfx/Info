"""Mix narration + procedurally generated horror soundscape into build/mix.wav."""
import json, pathlib, subprocess, wave
import numpy as np
from scipy.signal import butter, sosfilt

ROOT = pathlib.Path(__file__).resolve().parent.parent
BUILD = ROOT / "build"
tl = json.loads((BUILD / "timeline.json").read_text())
SR = 48000
DUR = max(120.0, tl["duration"])
N = int(DUR * SR)
rng = np.random.default_rng(13)


def lp(x, f, order=2): return sosfilt(butter(order, f, "low", fs=SR, output="sos"), x)
def hp(x, f, order=2): return sosfilt(butter(order, f, "high", fs=SR, output="sos"), x)
def bp(x, lo, hi, order=2): return sosfilt(butter(order, [lo, hi], "band", fs=SR, output="sos"), x)
def tt(n): return np.arange(n) / SR
def env_ad(n, a, d):
    t = tt(n); e = np.minimum(t / max(a, 1e-4), 1.0) * np.exp(-np.maximum(t - a, 0) / d); return e

music = np.zeros((N, 2))
sfx = np.zeros((N, 2))


def put(buf, sig, at, gain=1.0, pan=0.0):
    i = int(at * SR)
    if i >= N: return
    if sig.ndim == 1:
        l, r = np.cos((pan + 1) * np.pi / 4), np.sin((pan + 1) * np.pi / 4)
        sig = np.stack([sig * l * 1.414, sig * r * 1.414], 1)
    j = min(N, i + len(sig))
    buf[i:j] += sig[: j - i] * gain


seg = {s["scene"]: s for s in tl["segments"]}

# ---------- drone bed: detuned low saws + filtered noise, key changes per era ----------
roots = {"intro": 41.2, "day": 43.65, "week": 38.9, "month": 36.7, "year": 41.2, "outro": 36.7}
for s in tl["segments"]:
    a, b = s["start"], s["end"] + 1.0
    n = int((b - a) * SR); t = tt(n)
    f0 = roots[s["scene"]]
    x = np.zeros(n)
    for k, det in enumerate([0, 0.31, -0.27, 0.5]):
        ph = 2 * np.pi * (f0 * (1 + det / 100)) * t
        x += (2 * ((ph / (2 * np.pi)) % 1) - 1) * (0.6 if k else 1)
    x += 0.5 * np.sin(2 * np.pi * f0 * 1.5 * t)          # fifth
    x += 0.25 * np.sin(2 * np.pi * f0 * 2.38 * t)         # sour minor-ish overtone
    sweep = 180 + 140 * (0.5 + 0.5 * np.sin(2 * np.pi * 0.07 * t))
    x = lp(x, 260) * 0.6 + lp(x, 900) * 0.08 * (0.5 + 0.5 * np.sin(2 * np.pi * 0.05 * t))
    x += lp(rng.standard_normal(n), 400) * 0.25
    fade = np.minimum(1, np.minimum(t / 1.2, (t[-1] - t) / 1.0))
    x *= fade * 0.16
    stereo = np.stack([x, np.roll(x, 900)], 1)
    put(music, stereo, a)

# ---------- heartbeat: speeds up through the story ----------
bpm = {"intro": 62, "day": 84, "week": 96, "month": 104, "year": 70, "outro": 120}
def thump(f=55, d=0.16):
    n = int(0.35 * SR); t = tt(n)
    fr = f * (1 + 1.5 * np.exp(-t * 30))
    return np.sin(2 * np.pi * np.cumsum(fr) / SR) * env_ad(n, 0.004, d)
for s in tl["segments"]:
    if s["scene"] == "year": continue
    period = 60 / bpm[s["scene"]]
    t0 = s["start"] + 0.8
    while t0 < s["end"]:
        put(music, thump(), t0, 0.55)
        put(music, thump(48, 0.12), t0 + 0.28 * period, 0.38)
        t0 += period
# year: heart returns only near the end
ys = seg["year"]; yl = [l for l in tl["lines"] if l["seg"] == 4]
t0 = yl[5]["start"]
while t0 < ys["end"]:
    put(music, thump(), t0, 0.6); put(music, thump(48, .12), t0 + .22, .4); t0 += 0.62

# ---------- card stings: whoosh + impact + metallic ring ----------
def whoosh(d=0.9):
    n = int(d * SR); t = tt(n)
    x = rng.standard_normal(n)
    out = np.zeros(n)
    for k in range(8):  # moving band
        a, b = k * n // 8, (k + 1) * n // 8
        fc = 300 + 3500 * (k / 7) ** 2
        out[a:b] = bp(x, fc * 0.6, min(fc * 1.6, 20000))[a:b]
    return out * (t / d) ** 2 * 0.8
def impact():
    n = int(2.5 * SR); t = tt(n)
    boom = np.sin(2 * np.pi * np.cumsum(38 + 80 * np.exp(-t * 9)) / SR) * np.exp(-t * 2.2)
    crack = hp(rng.standard_normal(n), 1500) * np.exp(-t * 25) * 0.5
    ring = sum(np.sin(2 * np.pi * f * t) * np.exp(-t * dk) for f, dk in [(311, 1.5), (467, 2.1), (1033, 3.5)]) * 0.12
    return np.tanh((boom + crack + ring) * 1.6)
for s in tl["segments"]:
    if s["card"]:
        put(sfx, whoosh(), s["start"] - 0.25, 0.5)
        put(sfx, impact(), s["start"] + 0.65, 0.85)
# title hit in intro (last intro line) and final hit
il = [l for l in tl["lines"] if l["seg"] == 0]
put(sfx, impact(), il[3]["end"] + 0.05, 0.9)
put(sfx, whoosh(1.2), seg["outro"]["start"] - 0.9, 0.5)
put(sfx, impact(), seg["outro"]["start"] + 0.3, 1.0)

# ---------- scene-specific ambience ----------
def lines(i): return [l for l in tl["lines"] if l["seg"] == i]
# wind in intro + month + year night
def wind(d):
    n = int(d * SR); t = tt(n)
    x = rng.standard_normal(n)
    m = 0.5 + 0.5 * np.sin(2 * np.pi * 0.13 * t + 1) * np.sin(2 * np.pi * 0.31 * t)
    return (lp(x, 700) * 0.6 + bp(x, 600, 1400) * 0.15 * m) * (0.4 + 0.6 * m)
for sc in ["intro", "month"]:
    s = seg[sc]; put(sfx, wind(s["end"] - s["start"]), s["start"], 0.22)

# sirens (day: traffic jam line)
dl = lines(1)
def siren(d, f1=650, f2=950, rate=0.7):
    n = int(d * SR); t = tt(n)
    f = f1 + (f2 - f1) * (0.5 + 0.5 * np.sin(2 * np.pi * rate * t))
    x = np.sign(np.sin(2 * np.pi * np.cumsum(f) / SR)) * 0.3 + np.sin(2 * np.pi * np.cumsum(f) / SR)
    e = np.minimum(1, np.minimum(t / 1.5, (t[-1] - t) / 1.5))
    return lp(x, 2500) * e
for li, pan, dl_ in [(4, -0.6, 0.0), (4, 0.5, 1.1), (2, 0.3, 0.0)]:
    l = dl[li]; put(sfx, siren(l["end"] - l["start"] + 2.0, rate=0.5 + dl_ * 0.3), l["start"] - 0.5 + dl_, 0.07, pan)
# car horns in traffic jam
for k in range(6):
    n = int(rng.uniform(0.25, 0.7) * SR); t = tt(n); f = rng.choice([392, 440, 349])
    h = (np.sign(np.sin(2 * np.pi * f * t)) + np.sign(np.sin(2 * np.pi * f * 1.26 * t))) * np.minimum(1, (t[-1] - t) * 30)
    put(sfx, lp(h, 1800), dl[4]["start"] + rng.uniform(0, dl[4]["end"] - dl[4]["start"]), 0.035, rng.uniform(-.8, .8))
# TV static / news beeps for line 1
l = dl[1]; n = int((l["end"] - l["start"] + 1) * SR)
put(sfx, hp(rng.standard_normal(n), 3000) * 0.05, l["start"] - 0.3)
for k in range(3):
    put(sfx, np.sin(2 * np.pi * 1000 * tt(int(0.18 * SR))), l["start"] - 0.2 + k * 0.25, 0.06)
# phone emergency alert (line 3)
l = dl[3]
n = int(1.6 * SR); t = tt(n)
alert = np.sin(2 * np.pi * 853 * t) + np.sin(2 * np.pi * 960 * t)
alert *= (np.sin(2 * np.pi * 4 * t) > 0)
put(sfx, alert, l["start"] - 0.2, 0.06)
# zombie groan generator (formant-filtered buzz)
def groan(d=1.6, f=85):
    n = int(d * SR); t = tt(n)
    pitch = f * (1 + 0.15 * np.sin(2 * np.pi * 1.7 * t) + 0.08 * rng.standard_normal(n).cumsum() / np.sqrt(n))
    src = (2 * ((np.cumsum(pitch) / SR) % 1) - 1) + 0.6 * rng.standard_normal(n)
    v = bp(src, 300, 900) + 0.6 * bp(src, 90, 260) + 0.25 * bp(src, 1100, 1800)
    return np.tanh(v * 2) * env_ad(n, 0.25, d * 0.5)
for (si, li, g) in [(0, 3, .22), (1, 5, .18), (1, 6, .25), (2, 6, .2), (3, 2, .12), (4, 2, .14), (5, 0, .2)]:
    l = lines(si)[li]
    for k in range(3 if si == 3 else 1):
        put(sfx, groan(rng.uniform(1.2, 2.2), rng.uniform(70, 110)), l["start"] + 0.4 + k * 0.8, g, rng.uniform(-.6, .6))
# horde murmur (month line 2): many groans
l = lines(3)[2]
for k in range(26):
    put(sfx, groan(rng.uniform(1.2, 2.5), rng.uniform(60, 120)), l["start"] - 0.5 + rng.uniform(0, l["end"] - l["start"] + 1.5), 0.06, rng.uniform(-1, 1))
# door scratching + knocks (week line 4,5)
wl = lines(2)
for li in (4, 5):
    l = wl[li]; t0 = l["start"]
    while t0 < l["end"] + 0.5:
        n = int(rng.uniform(0.15, 0.4) * SR); t = tt(n)
        sc = bp(rng.standard_normal(n), 2000, 6000) * (0.5 + 0.5 * np.sin(2 * np.pi * rng.uniform(15, 30) * t)) * env_ad(n, .02, .2)
        put(sfx, sc, t0, 0.18, rng.uniform(-.3, .3)); t0 += rng.uniform(0.2, 0.5)
l = wl[5]
for k in range(3):  # "Каждую. Ночь." door bangs
    n = int(0.6 * SR); t = tt(n)
    bang = lp(rng.standard_normal(n), 300) * np.exp(-t * 14) * 3 + np.sin(2 * np.pi * 70 * t) * np.exp(-t * 10)
    put(sfx, np.tanh(bang), l["start"] + k * 0.55, 0.5)
# helicopter (week line 3)
l = wl[3]; n = int((l["end"] - l["start"] + 2) * SR); t = tt(n)
chop = lp(rng.standard_normal(n), 500) * (0.5 + 0.5 * np.sign(np.sin(2 * np.pi * 11 * t)))
e = np.sin(np.pi * t / t[-1]) ** 2
put(sfx, np.stack([chop * e * (1 - t / t[-1]), chop * e * (t / t[-1])], 1), l["start"] - 1, 0.35)
# power-down hum (week line 1)
l = wl[1]
for k in range(4):
    n = int(0.8 * SR); t = tt(n)
    hum = np.sin(2 * np.pi * np.cumsum(120 * np.exp(-t * 3)) / SR) * np.exp(-t * 2)
    put(sfx, hum, l["start"] + k * 0.9, 0.1)
# year: birds in morning, crickets at night, radio static & distress voice blip
yl = lines(4)
def bird(t0):
    n = int(0.12 * SR); t = tt(n)
    f = 3000 + 1500 * np.sin(np.pi * t / t[-1])
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.sin(np.pi * t / t[-1])
for k in range(22):
    put(sfx, bird(0), yl[1]["start"] + rng.uniform(0, yl[4]["end"] - yl[1]["start"]), 0.04, rng.uniform(-.8, .8))
n = int((ys["end"] - yl[5]["start"] + 1) * SR); t = tt(n)
cr = np.sin(2 * np.pi * 4300 * t) * (np.sin(2 * np.pi * 30 * t) > 0.3) * (np.sin(2 * np.pi * 0.9 * t) > 0)
put(sfx, cr, yl[5]["start"], 0.015)
for li, d in [(5, 1.5), (6, 2.5), (7, 2.0)]:
    l = yl[li]; n = int(d * SR); t = tt(n)
    st = bp(rng.standard_normal(n), 800, 5000) * (0.4 + 0.6 * (rng.random(n // 2400 + 1).repeat(2400)[:n] > 0.4))
    put(sfx, st, l["start"] - 0.4, 0.12)
# low riser to the twist + silence drop
l = yl[7]; n = int(4 * SR); t = tt(n)
x = rng.standard_normal(n)
riser = sum(lp(x, fc) * ((t / 4 >= k / 6) & (t / 4 < (k + 1) / 6)) for k, fc in enumerate([200, 350, 600, 1000, 1700, 3000])) * (t / 4) ** 2
put(sfx, riser, l["start"] - 3.0, 0.35)

# ---------- narration: tremble + small room ----------
vo = np.zeros(N)
for l in tl["lines"]:
    with wave.open(str(BUILD / l["file"])) as w:
        sr = w.getframerate(); x = np.frombuffer(w.readframes(w.getnframes()), np.int16) / 32768
    xi = np.interp(np.arange(int(len(x) * SR / sr)) * sr / SR, np.arange(len(x)), x)
    i = int(l["start"] * SR); vo[i:i + len(xi)] += xi[: N - i]
t = tt(N)
vo *= 1 + (0.02 if tl.get("engine") == "elevenlabs" else 0.07) * np.sin(2 * np.pi * 5.3 * t)  # nervous tremble (subtle on a natural voice)
vo = hp(vo, 90)
vo = vo / (np.abs(vo).max() + 1e-9) * 0.9
(BUILD / "vo_dry.wav").unlink(missing_ok=True)
def wwrite(path, data):
    data = np.clip(data, -1, 1)
    if data.ndim == 1: data = data[:, None]
    with wave.open(str(path), "w") as w:
        w.setnchannels(data.shape[1]); w.setsampwidth(2); w.setframerate(SR)
        w.writeframes((data * 32767).astype(np.int16).tobytes())
wwrite(BUILD / "vo_dry.wav", vo)
subprocess.run(["sox", str(BUILD / "vo_dry.wav"), str(BUILD / "vo_fx.wav"), "channels", "2",
                "compand", "0.01,0.2", "-60,-60,-30,-15,-10,-8,0,-6", "0", "-90", "0.05",
                "reverb", "18", "50", "40", "100", "8", "gain", "-n", "-1"], check=True)
with wave.open(str(BUILD / "vo_fx.wav")) as w:
    vofx = np.frombuffer(w.readframes(w.getnframes()), np.int16).reshape(-1, 2) / 32768
vox = np.zeros((N, 2)); vox[: len(vofx)] = vofx[:N]

# ducking: lower music under voice
venv = lp(np.abs(vox[:, 0]), 4)
duck = 1 - 0.45 * np.clip(venv / (venv.max() * 0.25), 0, 1)
bed = (music * 0.9 + sfx * 0.8) * duck[:, None]
mix = vox * 1.0 + bed
mix[-int(2 * SR):] *= np.linspace(1, 0, int(2 * SR))[:, None]
mix = np.tanh(mix * 1.1) / np.tanh(1.1)
mix /= np.abs(mix).max() / 0.95
wwrite(BUILD / "mix.wav", mix)
print("mix.wav", DUR, "s")
if __import__("os").environ.get("STEMS"):
    wwrite(BUILD / "stem_bed.wav", bed); wwrite(BUILD / "stem_vox.wav", vox)
