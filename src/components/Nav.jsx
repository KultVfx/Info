import { sections, site } from '../content'
import { useActiveSection } from '../lib/store'
import { scrollToSection } from '../hooks/useScrollDirector'
import SoundToggle from './SoundToggle'

export default function Nav() {
  const active = useActiveSection()
  return (
    <header className="pointer-events-none fixed inset-x-0 top-0 z-40 flex items-center justify-between px-6 py-5 md:px-12 md:py-7 lg:px-20">
      <button
        onClick={() => scrollToSection('intro')}
        className="pointer-events-auto font-display text-sm font-medium tracking-[0.2em] text-white"
        aria-label={`${site.name} — back to top`}
      >
        {site.name}
        <span className="ml-1 inline-block h-1 w-1 rounded-full bg-white align-middle" />
      </button>

      <nav aria-label="Sections" className="pointer-events-auto hidden items-center gap-8 lg:flex">
        {sections.slice(1).map((s, i) => (
          <button
            key={s.id}
            onClick={() => scrollToSection(s.id)}
            aria-current={active === i + 1 ? 'true' : undefined}
            className={`label link-line transition-colors duration-500 ${active === i + 1 ? 'text-white' : 'text-white/45 hover:text-white'}`}
          >
            {s.label}
          </button>
        ))}
      </nav>

      <SoundToggle />
    </header>
  )
}
