import Section, { Eyebrow } from '../components/Section'
import Split from '../components/Split'
import { contact, site, socials } from '../content'
import { scrollToSection } from '../hooks/useScrollDirector'

export default function Outro() {
  return (
    <Section id="outro" label="Outro" className="items-center justify-between pb-16 pt-32 md:pt-40">
      <div className="flex justify-center">
        <Eyebrow index="05">Outro</Eyebrow>
      </div>

      <div className="flex flex-col items-center text-center">
        <div className="relative mix-blend-difference">
          <p data-reveal="split" className="font-serif text-[30vw] italic leading-[0.9] text-white md:text-[17vw]">
            <Split text="Kult" by="chars" />
          </p>
          <svg viewBox="0 0 600 60" fill="none" preserveAspectRatio="none" aria-hidden="true" className="absolute -bottom-[6%] left-[4%] h-[14%] w-[96%] overflow-visible">
            <path data-reveal="draw" data-delay="0.5" d="M4 38C96 14 210 8 318 22c82 10 150 26 278 2" stroke="white" strokeWidth="1.6" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
          </svg>
        </div>

        <p data-reveal="fade" className="mt-12 max-w-md text-base leading-relaxed text-white/65 md:mt-14 md:text-lg">
          Open to new projects and collaborations.
        </p>

        <div data-reveal="fade" className="mt-8">
          {contact.email ? (
            <a href={`mailto:${contact.email}`} className="link-line font-display text-lg font-light tracking-tight text-white md:text-2xl">
              {contact.email}
            </a>
          ) : (
            <span className="label inline-flex items-center gap-3 rounded-full border border-white/20 px-6 py-3 text-white/70">
              <span className="h-1.5 w-1.5 rounded-full bg-white/70" />
              Contact — coming soon
            </span>
          )}
        </div>

        <ul data-reveal="stagger" className="mt-12 flex flex-wrap justify-center gap-x-9 gap-y-4">
          {socials.map((s) => (
            <li key={s.label}>
              {s.href ? (
                <a href={s.href} target="_blank" rel="noreferrer" className="label link-line text-white/80 hover:text-white">
                  {s.label}
                </a>
              ) : (
                <span className="label text-white/40" title="Link coming soon">
                  {s.label}
                  <sup className="ml-1 text-[0.7em] normal-case tracking-normal text-white/30">soon</sup>
                </span>
              )}
            </li>
          ))}
        </ul>
      </div>

      <footer className="label mt-16 flex w-full flex-col items-center gap-3 pb-8 text-white/40 md:flex-row md:justify-between md:pr-24">
        <span>© {new Date().getFullYear()} {site.name}</span>
        <span className="text-center">{site.location}<span className="hidden sm:inline"> · {site.coords}</span></span>
        <button onClick={() => scrollToSection('intro')} className="link-line uppercase text-white/60 hover:text-white">
          Back to top ↑
        </button>
      </footer>
    </Section>
  )
}
