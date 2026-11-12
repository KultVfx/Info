import Section, { Eyebrow } from '../components/Section'
import Split from '../components/Split'
import ProjectCard from '../components/ProjectCard'
import { projects } from '../content'

export default function CreativeWorld() {
  return (
    <Section id="world" label="Creative World" className="py-32 md:py-44">
      <div className="flex flex-col gap-10 md:flex-row md:items-end md:justify-between">
        <div>
          <Eyebrow index="03">Creative World</Eyebrow>
          <h2 data-reveal="split" className="heading mt-8">
            <Split text="Selected" /> <Split text="work," className="accent" />
            <br />
            <Split text="in progress." />
          </h2>
        </div>
        <p data-reveal="fade" className="max-w-sm text-base leading-relaxed text-white/60 md:pb-3 md:text-right">
          A gallery reserved for what comes next. Films, motion pieces, 3D studies and websites will
          live here.
        </p>
      </div>

      <div className="mt-16 grid grid-cols-1 gap-5 sm:grid-cols-2 md:mt-24 md:gap-7 lg:grid-cols-3">
        {projects.map((project, i) => (
          <ProjectCard key={i} index={i} project={project} />
        ))}
      </div>
    </Section>
  )
}
