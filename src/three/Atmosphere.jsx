import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { fbm2 } from '../lib/glsl'
import { store } from '../lib/store'
import { createShot, sampleShot } from '../lib/director'

const vert = /* glsl */ `
varying vec2 vUv;
void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
`

const fogFrag = /* glsl */ `
uniform float uTime; uniform float uOpacity; uniform float uSeed; uniform vec3 uColor;
varying vec2 vUv;
${fbm2}
void main(){
  vec2 p = vUv * vec2(3.2, 2.0) + uSeed;
  float warp = fbm(p + vec2(uTime * 0.02, -uTime * 0.012));
  float n = fbm(p * 1.4 + warp * 1.6 + vec2(-uTime * 0.03, uTime * 0.008));
  n = smoothstep(0.32, 0.95, n);
  float edge = smoothstep(0.0, 0.4, vUv.x) * smoothstep(1.0, 0.6, vUv.x) * smoothstep(0.0, 0.4, vUv.y) * smoothstep(1.0, 0.6, vUv.y);
  gl_FragColor = vec4(uColor, n * edge * uOpacity);
}
`

const haloFrag = /* glsl */ `
uniform float uOpacity; uniform vec3 uColor;
varying vec2 vUv;
void main(){
  float r = length(vUv - 0.5) * 2.0;
  float a = exp(-r * r * 5.0) * 0.8 + exp(-r * r * 22.0) * 0.5;
  gl_FragColor = vec4(uColor, a * uOpacity * smoothstep(1.0, 0.7, r));
}
`

const beamFrag = /* glsl */ `
uniform float uTime; uniform float uOpacity; uniform vec3 uColor;
varying vec2 vUv;
${fbm2}
void main(){
  float x = (vUv.x - 0.5) * 2.0;
  float spread = mix(1.0, 0.3, vUv.y);
  float core = exp(-pow(x / spread, 2.0) * 4.0);
  float dust = 0.55 + 0.45 * fbm(vec2(vUv.x * 5.0, vUv.y * 2.0 - uTime * 0.03));
  float fade = smoothstep(0.0, 0.5, vUv.y) * smoothstep(1.0, 0.8, vUv.y);
  gl_FragColor = vec4(uColor, core * dust * fade * uOpacity);
}
`

const SHEETS = [
  { z: -6, y: 0.5, w: 30, h: 16, opacity: 0.075, seed: 1.3 },
  { z: -2.4, y: -1.2, w: 22, h: 10, opacity: 0.055, seed: 7.9 },
  { z: 1.6, y: -1.6, w: 16, h: 7, opacity: 0.045, seed: 4.2 },
  { z: 2.8, y: 1.8, w: 16, h: 7, opacity: 0.028, seed: 12.6 },
]

const additive = { transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false }

/** Volumetric feel on a budget: drifting fog sheets, a light beam and a halo. */
export default function Atmosphere({ low = false }) {
  const halo = useRef()
  const sheets = low ? SHEETS.slice(0, 3) : SHEETS
  const shot = useMemo(createShot, [])
  const u = useMemo(
    () => ({
      fog: SHEETS.map((s) => ({
        uTime: { value: 0 },
        uOpacity: { value: s.opacity },
        uSeed: { value: s.seed },
        uColor: { value: new THREE.Color('#9ea2aa') },
      })),
      halo: { uOpacity: { value: 0.3 }, uColor: { value: new THREE.Color('#b4b8c0') } },
      beam: { uTime: { value: 0 }, uOpacity: { value: 0.11 }, uColor: { value: new THREE.Color('#cfd3da') } },
    }),
    [],
  )

  useFrame((state) => {
    const t = store.reduced ? 4 : state.clock.elapsedTime
    const portrait = state.size.width / state.size.height < 0.9
    sampleShot(store.s, portrait, shot)
    for (const f of u.fog) f.uTime.value = t
    u.beam.uTime.value = t
    u.halo.uOpacity.value = shot.halo * (0.14 + Math.sin(t * 0.6) * 0.02)
    halo.current.position.set(shot.pos[0], shot.pos[1], shot.pos[2] - 2.2)
    halo.current.quaternion.copy(state.camera.quaternion)
  })

  return (
    <group>
      {sheets.map((s, i) => (
        <mesh key={i} position={[0, s.y, s.z]} renderOrder={i + 1}>
          <planeGeometry args={[s.w, s.h]} />
          <shaderMaterial vertexShader={vert} fragmentShader={fogFrag} uniforms={u.fog[i]} {...additive} />
        </mesh>
      ))}
      <mesh position={[-1.5, 2.5, -3.5]} rotation={[0, 0, -0.42]}>
        <planeGeometry args={[7, 16]} />
        <shaderMaterial vertexShader={vert} fragmentShader={beamFrag} uniforms={u.beam} {...additive} />
      </mesh>
      <mesh ref={halo}>
        <planeGeometry args={[9, 9]} />
        <shaderMaterial vertexShader={vert} fragmentShader={haloFrag} uniforms={u.halo} {...additive} />
      </mesh>
    </group>
  )
}
