import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { snoise3 } from '../lib/glsl'
import { store } from '../lib/store'
import { createShot, sampleShot } from '../lib/director'

const vertexHead = /* glsl */ `
uniform float uTime;
uniform float uAmp;
uniform float uFreq;
uniform float uTwist;
uniform float uStretch;
uniform vec3 uPointer;
uniform float uPointerForce;
${snoise3}
vec3 kDisplace(vec3 d){
  float t = uTime;
  float big = snoise(d * 0.75 + vec3(0.0, t * 0.11, t * 0.07));
  vec3 q = d * uFreq + vec3(t * 0.09, -t * 0.16, t * 0.12) + big * 0.4;
  float n = snoise(q);
  float fine = snoise(q * 1.9 + n * 0.6 + 11.0) * 0.14;
  float r = 1.0 + uAmp * (big * 0.55 + n * 0.75 + fine);
  r += uPointerForce * pow(max(dot(d, uPointer), 0.0), 6.0);
  vec3 p = d * r;
  p.y *= uStretch;
  p.xz *= inversesqrt(uStretch);
  float a = p.y * uTwist;
  float c = cos(a); float s = sin(a);
  p.xz = mat2(c, -s, s, c) * p.xz;
  return p;
}
`

// Displace the sphere and rebuild the normal from two neighbouring samples,
// so reflections follow the liquid surface.
const vertexNormal = /* glsl */ `
vec3 kDir = normalize(position);
vec3 kT = normalize(cross(kDir, abs(kDir.y) > 0.98 ? vec3(1.0, 0.0, 0.0) : vec3(0.0, 1.0, 0.0)));
vec3 kB = cross(kDir, kT);
vec3 kPos = kDisplace(kDir);
vec3 kP1 = kDisplace(normalize(kDir + kT * 0.02));
vec3 kP2 = kDisplace(normalize(kDir + kB * 0.02));
vec3 objectNormal = normalize(cross(kP1 - kPos, kP2 - kPos));
`

function useChrome() {
  return useMemo(() => {
    const uniforms = {
      uTime: { value: 0 },
      uAmp: { value: 0.3 },
      uFreq: { value: 1.2 },
      uTwist: { value: 0 },
      uStretch: { value: 1 },
      uPointer: { value: new THREE.Vector3(0, 0, 1) },
      uPointerForce: { value: 0 },
    }
    const material = new THREE.MeshPhysicalMaterial({
      color: '#f4f6fa',
      metalness: 1,
      roughness: 0.075,
      envMapIntensity: 1.35,
    })
    material.onBeforeCompile = (shader) => {
      Object.assign(shader.uniforms, uniforms)
      shader.vertexShader = shader.vertexShader
        .replace('#include <common>', `#include <common>\n${vertexHead}`)
        .replace('#include <beginnormal_vertex>', vertexNormal)
        .replace('#include <begin_vertex>', 'vec3 transformed = kPos;')
    }
    return { material, uniforms }
  }, [])
}

const DROPS = [
  { r: 1.9, speed: 0.22, size: 0.085, tilt: 0.5, phase: 0.0 },
  { r: 2.3, speed: -0.16, size: 0.05, tilt: -0.9, phase: 1.7 },
  { r: 1.65, speed: 0.31, size: 0.035, tilt: 1.3, phase: 3.1 },
  { r: 2.7, speed: 0.12, size: 0.11, tilt: -0.3, phase: 4.4 },
  { r: 2.05, speed: -0.27, size: 0.028, tilt: 2.1, phase: 5.2 },
  { r: 3.1, speed: 0.09, size: 0.06, tilt: 0.9, phase: 2.4 },
]

/** The central liquid-metal sculpture and its orbiting droplets. */
export default function Sculpture({ detail = 56 }) {
  const group = useRef()
  const mesh = useRef()
  const drops = useRef([])
  const { material, uniforms } = useChrome()
  const dropMaterial = useMemo(
    () => new THREE.MeshStandardMaterial({ color: '#ffffff', metalness: 1, roughness: 0.04, envMapIntensity: 1.3 }),
    [],
  )
  const shot = useMemo(createShot, [])
  const tmp = useMemo(() => ({ v: new THREE.Vector3(), q: new THREE.Quaternion(), clock: 0 }), [])

  useFrame((state, delta) => {
    const dt = Math.min(delta, 0.05)
    const reduced = store.reduced
    if (!reduced) tmp.clock += dt
    const t = reduced ? 4 : tmp.clock
    const portrait = state.size.width / state.size.height < 0.9
    sampleShot(store.s, portrait, shot)

    const k = reduced ? 1 : 1 - Math.exp(-dt * 5)
    const g = group.current
    g.position.x += (shot.pos[0] - g.position.x) * k
    g.position.y += (shot.pos[1] + Math.sin(t * 0.45) * 0.06 - g.position.y) * k
    g.position.z += (shot.pos[2] - g.position.z) * k
    const scale = shot.scale * (portrait ? 0.74 : 1)
    g.scale.setScalar(g.scale.x + (scale - g.scale.x) * k)

    uniforms.uTime.value = t
    uniforms.uAmp.value = shot.amp
    uniforms.uFreq.value = shot.freq
    uniforms.uTwist.value = shot.twist
    uniforms.uStretch.value = shot.stretch

    const m = mesh.current
    const { x, y } = store.pointer
    m.rotation.y = t * 0.07 + store.s * 0.9 + x * 0.25
    m.rotation.x += (-y * 0.18 - m.rotation.x) * k

    // Surface gently swells towards the cursor.
    tmp.v.set(x * 1.4, y * 1.1, 1).normalize().applyQuaternion(tmp.q.copy(m.quaternion).invert())
    uniforms.uPointer.value.lerp(tmp.v, k)
    uniforms.uPointerForce.value = reduced ? 0 : 0.16

    for (let i = 0; i < DROPS.length; i++) {
      const d = DROPS[i]
      const o = drops.current[i]
      if (!o) continue
      const a = t * d.speed + d.phase
      o.position.set(Math.cos(a) * d.r, Math.sin(a * 1.3 + d.tilt) * d.r * 0.42, Math.sin(a) * d.r)
      o.scale.setScalar(d.size * (1 + Math.sin(t * 0.8 + d.phase) * 0.15))
    }
  })

  return (
    <group ref={group}>
      <mesh ref={mesh} material={material} frustumCulled={false}>
        <icosahedronGeometry args={[1, detail]} />
      </mesh>
      {DROPS.map((d, i) => (
        <mesh key={i} ref={(el) => (drops.current[i] = el)} material={dropMaterial}>
          <sphereGeometry args={[1, 24, 24]} />
        </mesh>
      ))}
    </group>
  )
}
