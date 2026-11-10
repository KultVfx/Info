"""Generate SFX/ambience with ElevenLabs sound generation."""
import json, urllib.request, pathlib
root = pathlib.Path(__file__).resolve().parent.parent
out = root / "assets/audio/sfx"; out.mkdir(parents=True, exist_ok=True)
SFX = {
 "rain": ("Gentle night rain on window and rooftop, distant thunder, calm and lonely", 12),
 "drone": ("Dark ambient horror drone, low eerie synth pad, slow evolving, retro 90s video game soundtrack", 22),
 "room": ("Quiet bedroom at night, clock ticking softly, faint room tone", 10),
 "city": ("Muffled daytime city street ambience, distant crowd chatter and footsteps, slightly dreamy", 12),
 "tinnitus": ("High pitched tinnitus ringing slowly fading in, muffled world, unsettling", 10),
 "steps": ("Slow heavy barefoot footsteps on dusty concrete floor, approaching, in an empty corridor, echo", 8),
 "buzz": ("Flickering fluorescent light buzzing and clicking in empty hallway", 8),
 "sting": ("Sudden horror reveal sting, low brass hit with whispers, retro PlayStation horror game", 4),
 "boom": ("Deep cinematic low boom impact then silence", 4),
 "title": ("Retro 90s video game menu startup chime, eerie, reverb", 3),
}
for name, (prompt, dur) in SFX.items():
    f = out / f"{name}.mp3"
    if f.exists(): continue
    body = {"text": prompt, "duration_seconds": dur, "prompt_influence": 0.5}
    req = urllib.request.Request("https://api.elevenlabs.io/v1/sound-generation",
        data=json.dumps(body).encode(), headers={"Content-Type": "application/json", "xi-api-key": "dummy"})
    f.write_bytes(urllib.request.urlopen(req).read()); print("ok", name)
