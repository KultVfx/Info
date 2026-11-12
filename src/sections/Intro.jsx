import { useLayoutEffect, useRef } from 'react'
import gsap from 'gsap'
import Section from '../components/Section'
import { site, roles } from '../content'
import { store } from '../lib/store'

export default function Intro() {
  const root = useRef()

  // Opening title animation (plays on load, not on scroll).
  useLayoutEffect(() => {
    if (store.reduced) return
    const ctx = gsap.context(() => {
      gsap.from('.intro-char', { yPercent: 110, duration: 1.8, ease: 'expo.out', stagger: 0.09, delay: 0.25 })
      gsap.from('.intro-fade', { opacity: 0, y: 16, duration: 1.4, ease: 'power3.out', stagger: 0.12, delay: 1.1 })
    }, root)
    return () => ctx.revert()
  }, [])

  return (
    <Section id="intro" label="Intro" className="items-center justify-center overflow-hidden">
      <div ref={root} className="flex w-full flex-1 flex-col">
        <div className="intro-fade label mt-24 flex justify-between text-white/55 md:mt-28">
          <span>{site.descriptor}</span>
          <span className="text-right">{site.location}</span>
        </div>

        <div className="flex flex-1 flex-col items-center justify-center">
          <h1
            aria-label={site.name}
            className="select-none font-display text-[23.5vw] font-semibold leading-[0.82] tracking-[-0.045em] text-white mix-blend-difference md:text-[21vw]"
          >
            {[...site.name].map((c, i) => (
              <span key={i} className="split-mask" aria-hidden="true">
                <span className="intro-char split-inner">{c}</span>
              </span>
            ))}
          </h1>
          <p className="intro-fade mt-8 max-w-[22rem] text-center font-serif text-xl italic leading-snug text-white/80 md:mt-10 md:max-w-none md:text-2xl">
            A cinematic digital identity — image, motion and code.
          </p>
        </div>

        <div className="intro-fade mb-16 flex items-end justify-between md:mb-20">
          <ul className="label hidden gap-x-6 text-white/45 md:flex">
            {roles.map((r) => (
              <li key={r.title}>{r.tag}</li>
            ))}
          </ul>
          <div className="label mx-auto flex flex-col items-center gap-3 text-white/60 md:mx-0">
            <span>Scroll</span>
            <span className="scroll-cue h-12 w-px bg-white/20" />
          </div>
        </div>
      </div>
    </Section>
  )
}
