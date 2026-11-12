import { useLayoutEffect } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { store, setSection } from '../lib/store'

gsap.registerPlugin(ScrollTrigger)

/**
 * Turns page scroll into a smoothed "section coordinate" (store.s).
 * Each section holds its shot while it fills the viewport; the move to the
 * next shot happens across the one-viewport overlap between two sections.
 */
export function useScrollDirector() {
  useLayoutEffect(() => {
    const els = gsap.utils.toArray('[data-section]')
    const proxy = { v: 0 }
    let stops = []
    let last = -1

    const measure = () => {
      const vh = window.innerHeight
      stops = els.map((el) => ({ a: el.offsetTop, b: el.offsetTop + el.offsetHeight - vh }))
    }

    const toCoord = (y) => {
      for (let i = 0; i < stops.length; i++) {
        if (y <= stops[i].b || i === stops.length - 1) return i
        const next = stops[i + 1].a
        if (y < next) return i + (y - stops[i].b) / Math.max(next - stops[i].b, 1)
      }
      return 0
    }

    const tween = gsap.to(proxy, {
      v: 1,
      ease: 'none',
      scrollTrigger: {
        start: 0,
        end: 'max',
        scrub: store.reduced ? true : 0.9,
        onRefresh: measure,
        invalidateOnRefresh: true,
      },
    })

    const tick = () => {
      if (!stops.length) measure()
      const s = toCoord(proxy.v * ScrollTrigger.maxScroll(window))
      store.s = s
      store.scroll = proxy.v
      setSection(Math.round(s))
      if (store.reduced && s !== last) store.invalidate?.()
      last = s
    }
    gsap.ticker.add(tick)

    const onPointer = (e) => {
      store.pointer.x = (e.clientX / window.innerWidth) * 2 - 1
      store.pointer.y = -((e.clientY / window.innerHeight) * 2 - 1)
    }
    const fine = window.matchMedia('(pointer: fine)').matches
    if (fine && !store.reduced) window.addEventListener('pointermove', onPointer, { passive: true })

    document.fonts?.ready.then(() => ScrollTrigger.refresh())

    return () => {
      gsap.ticker.remove(tick)
      window.removeEventListener('pointermove', onPointer)
      tween.scrollTrigger?.kill()
      tween.kill()
    }
  }, [])
}

export function scrollToSection(id) {
  document.getElementById(id)?.scrollIntoView({ behavior: store.reduced ? 'auto' : 'smooth', block: 'start' })
}
