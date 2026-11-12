import { useCallback, useEffect, useRef, useState } from 'react'

// A small generative drone built with WebAudio — no audio files.
function buildDrone(ctx) {
  const master = ctx.createGain()
  master.gain.value = 0
  master.connect(ctx.destination)

  const filter = ctx.createBiquadFilter()
  filter.type = 'lowpass'
  filter.frequency.value = 380
  filter.Q.value = 0.8
  filter.connect(master)

  const voices = [
    { type: 'sine', freq: 55, gain: 0.5 },
    { type: 'sine', freq: 82.41, gain: 0.26 },
    { type: 'sawtooth', freq: 55.3, gain: 0.05 },
    { type: 'sine', freq: 110.4, gain: 0.14 },
    { type: 'triangle', freq: 164.9, gain: 0.05 },
  ]
  voices.forEach((v, i) => {
    const osc = ctx.createOscillator()
    osc.type = v.type
    osc.frequency.value = v.freq
    const g = ctx.createGain()
    g.gain.value = v.gain
    const lfo = ctx.createOscillator()
    lfo.frequency.value = 0.03 + i * 0.017
    const depth = ctx.createGain()
    depth.gain.value = v.gain * 0.45
    lfo.connect(depth).connect(g.gain)
    osc.connect(g).connect(filter)
    osc.start()
    lfo.start()
  })

  // Filtered noise: "air" in the room.
  const buffer = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate)
  const data = buffer.getChannelData(0)
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1
  const noise = ctx.createBufferSource()
  noise.buffer = buffer
  noise.loop = true
  const band = ctx.createBiquadFilter()
  band.type = 'bandpass'
  band.frequency.value = 900
  band.Q.value = 0.5
  const air = ctx.createGain()
  air.gain.value = 0.012
  noise.connect(band).connect(air).connect(master)
  noise.start()

  const sweep = ctx.createOscillator()
  sweep.frequency.value = 0.05
  const sweepDepth = ctx.createGain()
  sweepDepth.gain.value = 160
  sweep.connect(sweepDepth).connect(filter.frequency)
  sweep.start()

  return master
}

/** Ambient sound, off by default. Returns [isOn, toggle]. */
export function useAmbientSound() {
  const [on, setOn] = useState(false)
  const audio = useRef(null)

  const toggle = useCallback(() => {
    setOn((prev) => {
      const next = !prev
      try {
        if (!audio.current) {
          const Ctx = window.AudioContext || window.webkitAudioContext
          const ctx = new Ctx()
          audio.current = { ctx, master: buildDrone(ctx) }
        }
        const { ctx, master } = audio.current
        const now = ctx.currentTime
        master.gain.cancelScheduledValues(now)
        master.gain.setValueAtTime(master.gain.value, now)
        if (next) {
          ctx.resume()
          master.gain.linearRampToValueAtTime(0.2, now + 2.5)
        } else {
          master.gain.linearRampToValueAtTime(0, now + 0.8)
          setTimeout(() => audio.current && master.gain.value < 0.01 && ctx.suspend(), 1000)
        }
      } catch {
        return false
      }
      return next
    })
  }, [])

  useEffect(() => () => audio.current?.ctx.close(), [])
  return [on, toggle]
}
