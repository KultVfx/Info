import { useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { store } from '../lib/store'

const vert = /* glsl */ `
uniform float uTime; uniform float uScale;
attribute vec3 aRand;
varying float vAlpha;
void main(){
  vec3 p = position;
  p.y = mod(p.y + uTime * (0.04 + aRand.x * 0.09) + 6.0, 12.0) - 6.0;
  p.x += sin(uTime * 0.18 + aRand.y * 6.2831) * 0.35;
  p.z += cos(uTime * 0.14 + aRand.z * 6.2831) * 0.35;
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  float depth = -mv.z;
  gl_PointSize = (0.6 + aRand.z * 1.8) * uScale / depth;
  float twinkle = 0.55 + 0.45 * sin(uTime * (0.6 + aRand.x * 1.6) + aRand.y * 40.0);
  vAlpha = smoothstep(0.3, 2.0, depth) * smoothstep(20.0, 6.0, depth) * twinkle * (0.25 + aRand.y * 0.75);
  gl_Position = projectionMatrix * mv;
}
`

const frag = /* glsl */ `
varying float vAlpha;
void main(){
  float d = length(gl_PointCoord - 0.5);
  float a = smoothstep(0.5, 0.0, d);
  gl_FragColor = vec4(vec3(0.86, 0.9, 1.0), a * a * vAlpha);
}
`

/** Slow dust motes drifting through the light. */
export default function Particles({ count = 1600 }) {
  const { geometry, uniforms } = useMemo(() => {
    const pos = new Float32Array(count * 3)
    const rand = new Float32Array(count * 3)
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 20
      pos[i * 3 + 1] = (Math.random() - 0.5) * 12
      pos[i * 3 + 2] = (Math.random() - 0.5) * 16 - 2
      rand[i * 3] = Math.random()
      rand[i * 3 + 1] = Math.random()
      rand[i * 3 + 2] = Math.random()
    }
    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.BufferAttribute(pos, 3))
    geometry.setAttribute('aRand', new THREE.BufferAttribute(rand, 3))
    return { geometry, uniforms: { uTime: { value: 0 }, uScale: { value: 30 } } }
  }, [count])

  useFrame((state) => {
    uniforms.uTime.value = store.reduced ? 4 : state.clock.elapsedTime
    uniforms.uScale.value = state.size.height * state.viewport.dpr * 0.034
  })

  return (
    <points geometry={geometry} frustumCulled={false} renderOrder={10}>
      <shaderMaterial
        vertexShader={vert}
        fragmentShader={frag}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  )
}
