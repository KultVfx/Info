// The "director": one keyframe per section describing the camera, the
// sculpture and the atmosphere. Everything in the scene samples this.
//   cam / look   camera position and target
//   pos / posM   sculpture position (landscape / portrait)
//   amp, freq    liquid displacement strength and scale
//   twist        twist around Y, stretch: vertical stretch (volume preserving)
//   dim / dimM   black scrim behind the content for legibility
export const KEYS = [
  { cam: [0, 0, 6.4], look: [0, 0, 0], pos: [0, 0, 0], posM: [0, 0.15, 0], scale: 1.15, amp: 0.3, freq: 0.9, twist: 0, stretch: 1, dim: 0, dimM: 0, halo: 0.9 },
  { cam: [2.2, 0.35, 5.2], look: [0.7, 0, 0], pos: [1.7, 0, 0], posM: [0, 1.25, 0], scale: 0.82, amp: 0.36, freq: 1.2, twist: 0.7, stretch: 1.2, dim: 0.1, dimM: 0.5, halo: 0.6 },
  { cam: [0, 1.0, 9], look: [0, 0.2, 0], pos: [0, 0.6, -2.5], posM: [0, 0.6, -2.5], scale: 1.2, amp: 0.2, freq: 1.7, twist: 0, stretch: 0.55, dim: 0.6, dimM: 0.7, halo: 0.4 },
  { cam: [-2.4, -0.25, 5.4], look: [-0.7, 0, 0], pos: [-1.8, 0, 0], posM: [0, 1.25, 0], scale: 0.8, amp: 0.42, freq: 0.8, twist: -1.1, stretch: 1.45, dim: 0.1, dimM: 0.55, halo: 0.6 },
  { cam: [0, -0.2, 7.6], look: [0, 0.1, 0], pos: [0, 0.7, 0], posM: [0, 1.6, 0], scale: 1.0, amp: 0.16, freq: 1.0, twist: 0, stretch: 1, dim: 0.2, dimM: 0.3, halo: 1 },
]

const SCALARS = ['scale', 'amp', 'freq', 'twist', 'stretch', 'halo']
const lerp = (a, b, t) => a + (b - a) * t
const ease = (t) => t * t * t * (t * (t * 6 - 15) + 10) // smootherstep

export const createShot = () => ({
  cam: [0, 0, 6],
  look: [0, 0, 0],
  pos: [0, 0, 0],
  scale: 1, amp: 0, freq: 1, twist: 0, stretch: 1, halo: 1, dim: 0,
})

/** Sample the keyframes at section coordinate `s`, writing into `out`. */
export function sampleShot(s, portrait, out) {
  const max = KEYS.length - 1
  const c = Math.min(Math.max(s, 0), max)
  const i = Math.min(Math.floor(c), max - 1)
  const t = ease(c - i)
  const a = KEYS[i]
  const b = KEYS[i + 1]
  const pa = portrait ? a.posM : a.pos
  const pb = portrait ? b.posM : b.pos

  for (let k = 0; k < 3; k++) {
    out.look[k] = lerp(a.look[k], b.look[k], t)
    out.cam[k] = lerp(a.cam[k], b.cam[k], t)
    out.pos[k] = lerp(pa[k], pb[k], t)
  }
  if (portrait) {
    // Narrow screens: pull the camera back and keep the framing centred.
    out.look[0] = 0
    out.cam[0] *= 0.25
    for (let k = 0; k < 3; k++) out.cam[k] = out.look[k] + (out.cam[k] - out.look[k]) * 1.5
  }
  for (const key of SCALARS) out[key] = lerp(a[key], b[key], t)
  out.dim = portrait ? lerp(a.dimM, b.dimM, t) : lerp(a.dim, b.dim, t)
  return out
}
