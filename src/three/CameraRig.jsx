import { useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { store } from '../lib/store'
import { createShot, sampleShot } from '../lib/director'

/** Moves the camera between section keyframes, with drift and cursor parallax. */
export default function CameraRig() {
  const shot = useMemo(createShot, [])
  const v = useMemo(() => ({ pos: new THREE.Vector3(), look: new THREE.Vector3(0, 0, 0), ready: false }), [])

  useFrame((state, delta) => {
    const { camera, size, scene } = state
    const portrait = size.width / size.height < 0.9
    sampleShot(store.s, portrait, shot)
    const reduced = store.reduced
    const t = reduced ? 0 : state.clock.elapsedTime
    const { x, y } = reduced ? { x: 0, y: 0 } : store.pointer

    v.pos.set(
      shot.cam[0] + Math.sin(t * 0.21) * 0.12 + x * 0.35,
      shot.cam[1] + Math.cos(t * 0.17) * 0.08 + y * 0.22,
      shot.cam[2] + Math.sin(t * 0.13) * 0.15,
    )
    const k = reduced || !v.ready ? 1 : 1 - Math.exp(-Math.min(delta, 0.05) * 3.5)
    v.ready = true
    camera.position.lerp(v.pos, k)
    v.look.lerp(v.pos.set(shot.look[0], shot.look[1], shot.look[2]), k)
    camera.lookAt(v.look)

    // Slowly turning the environment keeps the chrome reflections flowing.
    if (scene.environmentRotation) scene.environmentRotation.y = t * 0.06 + store.s * 0.5
  })
  return null
}
