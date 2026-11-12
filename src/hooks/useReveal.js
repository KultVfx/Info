import { useLayoutEffect } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

/**
 * Scroll-triggered reveals for everything inside `scope` marked with
 * data-reveal = "split" | "fade" | "stagger" | "line" | "draw".
 * Optional data-delay (seconds). Skipped entirely for reduced motion.
 */
export function useReveal(scope) {
  useLayoutEffect(() => {
    const mm = gsap.matchMedia()
    mm.add('(prefers-reduced-motion: no-preference)', () => {
      const ctx = gsap.context(() => {
        gsap.utils.toArray('[data-reveal]').forEach((el) => {
          const delay = parseFloat(el.dataset.delay || 0)
          const scrollTrigger = { trigger: el, start: 'top 90%', once: true }
          switch (el.dataset.reveal) {
            case 'split':
              gsap.from(el.querySelectorAll('.split-inner'), {
                yPercent: 118, duration: 1.25, ease: 'expo.out', stagger: 0.05, delay, scrollTrigger,
              })
              break
            case 'stagger':
              gsap.from(el.children, {
                opacity: 0, y: 26, duration: 1.1, ease: 'power3.out', stagger: 0.08, delay, scrollTrigger,
              })
              break
            case 'line':
              gsap.from(el, { scaleX: 0, transformOrigin: 'left center', duration: 1.4, ease: 'expo.out', delay, scrollTrigger })
              break
            case 'draw': {
              const len = el.getTotalLength?.() ?? 1000
              gsap.fromTo(el, { strokeDasharray: len, strokeDashoffset: len }, { strokeDashoffset: 0, duration: 2.2, ease: 'power2.inOut', delay, scrollTrigger })
              break
            }
            default:
              gsap.from(el, { opacity: 0, y: 24, filter: 'blur(10px)', duration: 1.3, ease: 'power3.out', delay, scrollTrigger, clearProps: 'filter' })
          }
        })
      }, scope)
      return () => ctx.revert()
    })
    return () => mm.revert()
  }, [scope])
}
