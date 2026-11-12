import Section, { Eyebrow } from '../components/Section'
import Split from '../components/Split'
import { interests } from '../content'

const pad = (n) => String(n).padStart(2, '0')

export default function BeyondDigital() {
  return (
    <Section id="beyond" label="Beyond Digital" className="justify-end pb-28 pt-[62svh] md:items-end md:justify-center md:py-40">
      <div className="w-full md:max-w-[52%]">
        <Eyebrow index="04">Beyond Digital</Eyebrow>

        <h2 data-reveal="split" className="heading mt-8">
          <Split text="Outside the" /> <Split text="frame." className="accent" />
        </h2>

        <p data-reveal="fade" className="mt-8 max-w-md text-base leading-relaxed text-white/65 md:text-lg">
          The interests that sharpen the eye away from the screen — games of strategy and timing, and
          the crafts of form and scent.
        </p>

        <ul className="mt-14 md:mt-16">
          {interests.map((item, i) => (
            <li key={item.title} className="group relative">
              <span data-reveal="line" className="absolute inset-x-0 top-0 block h-px bg-white/15" />
              <div data-reveal="fade" className="flex items-baseline gap-5 py-4 md:py-5">
                <span className="label w-8 tabular-nums text-white/40">{pad(i + 1)}</span>
                <span className="font-serif text-3xl leading-none text-white transition-all duration-700 ease-out group-hover:translate-x-3 group-hover:italic sm:text-4xl md:text-5xl">
                  {item.title}
                </span>
                <span className="label ml-auto text-white/40">{item.tag}</span>
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
