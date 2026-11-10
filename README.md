# Horror-shorts
2D/3D horror animation shorts.

## What if... you could be invisible (PS1 style, 9:16, 60 s)

**Готовое видео:** `output/what_if_invisible.mp4` (1080×1920, 30 fps)

- Сценарий: `story/what-if-invisible.md`
- Озвучка: ElevenLabs, голос George (спокойный рассказчик), `eleven_multilingual_v2`
- Звуки/эмбиент: ElevenLabs Sound Effects
- Графика: three.js в headless Chromium, внутреннее разрешение 270×480 →
  nearest-neighbor ×4. PS1-эффекты: привязка вершин к сетке (jitter),
  аффинные текстуры, 15-битный цвет с Bayer-дизерингом, туман, текстуры 32×32.

### Пересборка
```bash
npm install
python3 tools/tts.py        # озвучка  -> assets/audio/vo
python3 tools/sfx.py        # звуки    -> assets/audio/sfx
python3 tools/timeline.py   # тайминги -> src/timeline.json
node tools/render.js full   # видео    -> output/video_noaudio.mp4
python3 tools/mix.py        # звук     -> output/mix.wav
ffmpeg -i output/video_noaudio.mp4 -i output/mix.wav -c:v copy -c:a aac -b:a 192k -shortest output/what_if_invisible.mp4
```
Превью отдельных кадров: `node tools/render.js preview 6 12 47`.
