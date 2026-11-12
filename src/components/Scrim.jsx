import { useEffect, useRef } from 'react'
import gsap from 'gsap'
import { store } from '../lib/store'
import { createShot, sampleShot } from '../lib/director'

/** Darkens the scene behind text-heavy sections, driven by the director. */
export default function Scrim() {
  const ref = useRef()
  useEffect(() => {
    const shot = createShot()
    const tick = () => {
      const portrait = window.innerWidth / window.innerHeight < 0.9
      sampleShot(store.s, portrait, shot)
      if (ref.current) ref.current.style.opacity = shot.dim.toFixed(3)
    }
    gsap.ticker.add(tick)
    return () => gsap.ticker.remove(tick)
  }, [])
  return <div ref={ref} aria-hidden="true" className="pointer-events-none fixed inset-0 z-0 bg-[#030304] opacity-0" />
}
