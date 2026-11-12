import Section, { Eyebrow } from '../components/Section'
import Split from '../components/Split'
import { roles, site } from '../content'

const pad = (n) => String(n).padStart(2, '0')

export default function Identity() {
  return (
    <Section id="identity" label="Identity" className="justify-end pb-28 pt-[62svh] md:justify-center md:py-40">
      <div className="w-full md:max-w-[52%]">
        <Eyebrow index="02">Identity</Eyebrow>

        <h2 data-reveal="split" className="heading mt-8">
          <Split text="One identity." /> <Split text="Five" className="accent" /> <Split text="disciplines." />
        </h2>

        <p data-reveal="fade" className="mt-8 max-w-md text-base leading-relaxed text-white/65 md:text-lg">
          {site.name} is a creative digital identity based in {site.location} — working across visual
          effects, motion, editing, 3D and the web.
        </p>

        <ul className="mt-14 md:mt-16">
          {roles.map((role, i) => (
            <li key={role.title} className="group relative">
              <span data-reveal="line" className="absolute inset-x-0 top-0 block h-px bg-white/15" />
              <div data-reveal="fade" className="flex items-baseline gap-5 py-5 md:py-6">
                <span className="label w-8 tabular-nums text-white/40">{pad(i + 1)}</span>
                <span className="font-display text-xl font-light tracking-tight text-white transition-transform duration-700 ease-out group-hover:translate-x-3 sm:text-2xl md:text-[2rem]">
                  {role.title}
                </span>
                <span className="label ml-auto hidden text-white/40 sm:block">{role.tag}</span>
              </div>
            </li>
          ))}
          <li aria-hidden="true">
            <span data-reveal="line" className="block h-px bg-white/15" />
          </li>
        </ul>
      </div>
    </Section>
  )
}
