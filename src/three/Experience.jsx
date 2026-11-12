import { useEffect, useMemo, useState } from 'react'
import { Canvas, invalidate } from '@react-three/fiber'
import { Environment, Lightformer, PerformanceMonitor } from '@react-three/drei'
import { EffectComposer, Bloom, Noise, Vignette, ToneMapping } from '@react-three/postprocessing'
import { ToneMappingMode } from 'postprocessing'
import * as THREE from 'three'
import { store } from '../lib/store'
import Sculpture from './Sculpture'
import Atmosphere from './Atmosphere'
import Particles from './Particles'
import CameraRig from './CameraRig'

/** Procedural studio: light shapes on black, reflected by the chrome. */
function Studio() {
  return (
    <Environment resolution={512} frames={1}>
      <color attach="background" args={['#020203']} />
      <Lightformer form="rect" intensity={5} color="#ffffff" position={[0, 6, 1]} rotation-x={Math.PI / 2} scale={[9, 3, 1]} />
      <Lightformer form="rect" intensity={9} color="#eaf1ff" position={[-6, 1.5, 2]} rotation-y={Math.PI / 2} scale={[7, 0.45, 1]} />
      <Lightformer form="rect" intensity={7} color="#ffffff" position={[6, -0.5, -1]} rotation-y={-Math.PI / 2} scale={[8, 0.3, 1]} />
      <Lightformer form="rect" intensity={1.8} color="#93a0bd" position={[5, 2, 5]} rotation-y={-Math.PI / 4} scale={[3, 6, 1]} />
      <Lightformer form="ring" intensity={6} color="#ffffff" position={[0, 0.5, -7]} scale={4.5} />
      <Lightformer form="rect" intensity={0.9} color="#2b3140" position={[0, -6, 0]} rotation-x={-Math.PI / 2} scale={[12, 12, 1]} />
      <Lightformer form="circle" intensity={12} color="#ffffff" position={[-3, 4, 6]} scale={0.9} />
    </Environment>
  )
}

function Effects({ low }) {
  return (
    <EffectComposer multisampling={low ? 0 : 4}>
      <Bloom mipmapBlur intensity={0.55} luminanceThreshold={0.82} luminanceSmoothing={0.25} radius={0.78} />
      <Noise opacity={0.045} />
      <Vignette offset={0.22} darkness={0.82} />
      <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
    </EffectComposer>
  )
}

export default function Experience() {
  const low = useMemo(
    () => window.matchMedia('(max-width: 820px), (pointer: coarse)').matches,
    [],
  )
  const [dpr, setDpr] = useState(low ? 1.5 : 1.75)
  const [degraded, setDegraded] = useState(false)
  const [ready, setReady] = useState(false)

  // Reduced motion renders on demand: wake the loop for the first frames.
  useEffect(() => {
    store.invalidate = invalidate
    if (!store.reduced) return
    const ids = [100, 400, 1200, 2500].map((ms) => setTimeout(() => invalidate(), ms))
    return () => ids.forEach(clearTimeout)
  }, [])

  return (
    <div
      aria-hidden="true"
      className={`fixed inset-0 z-0 transition-opacity duration-[1800ms] ease-out ${ready ? 'opacity-100' : 'opacity-0'}`}
    >
      <Canvas
        dpr={Math.min(dpr, window.devicePixelRatio || 1)}
        frameloop={store.reduced ? 'demand' : 'always'}
        camera={{ fov: 35, near: 0.1, far: 60, position: [0, 0, 6.4] }}
        gl={{ antialias: false, alpha: false, powerPreference: 'high-performance', stencil: false }}
        onCreated={({ gl }) => {
          gl.toneMapping = THREE.NoToneMapping
          setReady(true)
        }}
        style={{ pointerEvents: 'none' }}
      >
        <color attach="background" args={['#030304']} />
        <PerformanceMonitor
          onDecline={() => {
            setDpr(1)
            setDegraded(true)
          }}
        />
        <Studio />
        <CameraRig />
        <Sculpture detail={low ? 36 : 60} />
        <Atmosphere low={low || degraded} />
        <Particles count={low ? 700 : 1700} />
        <Effects low={low || degraded} />
      </Canvas>
    </div>
  )
}
