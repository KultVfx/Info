import { useEffect, useRef } from 'react'
import gsap from 'gsap'
import { sections } from '../content'
import { store, useActiveSection } from '../lib/store'
import { scrollToSection } from '../hooks/useScrollDirector'

const pad = (n) => String(n).padStart(2, '0')

/** Scroll progress: section rail (desktop), counter and a hairline bar. */
export default function Progress() {
  const active = useActiveSection()
  const bar = useRef()

  useEffect(() => {
    const tick = () => {
      if (bar.current) bar.current.style.transform = `scaleX(${store.scroll.toFixed(4)})`
    }
    gsap.ticker.add(tick)
    return () => gsap.ticker.remove(tick)
  }, [])

  return (
    <>
      <nav
        aria-label="Section progress"
        className="fixed right-6 top-1/2 z-40 hidden -translate-y-1/2 flex-col items-end gap-4 md:flex lg:right-10"
      >
        {sections.map((s, i) => (
          <button
            key={s.id}
            onClick={() => scrollToSection(s.id)}
            aria-label={`Go to ${s.label}`}
            aria-current={active === i ? 'true' : undefined}
            className="group flex items-center gap-3 py-1"
          >
            <span
              className={`label transition-all duration-500 ${active === i ? 'translate-x-0 text-white/80 opacity-100' : 'translate-x-2 text-white/60 opacity-0 group-hover:translate-x-0 group-hover:opacity-100 group-focus-visible:opacity-100'}`}
            >
              {s.label}
            </span>
            <span
              className={`h-px transition-all duration-700 ease-out ${active === i ? 'w-10 bg-white' : 'w-4 bg-white/35 group-hover:w-7 group-hover:bg-white/70'}`}
            />
          </button>
        ))}
      </nav>

      <div className="pointer-events-none fixed bottom-5 left-6 z-40 md:bottom-7 md:left-12 lg:left-20">
        <p className="label flex items-center gap-3 text-white/60" aria-live="polite">
          <span className="tabular-nums text-white">{pad(active + 1)}</span>
          <span className="h-px w-6 bg-white/30" />
          <span className="tabular-nums">{pad(sections.length)}</span>
          <span className="ml-2 hidden sm:inline">{sections[active].label}</span>
        </p>
      </div>

      <div className="pointer-events-none fixed inset-x-0 bottom-0 z-40 h-px bg-white/10" aria-hidden="true">
        <div ref={bar} className="h-full origin-left bg-white" style={{ transform: 'scaleX(0)' }} />
      </div>
    </>
  )
}
