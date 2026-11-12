import { useRef } from 'react'

const pad = (n) => String(n).padStart(2, '0')

const SPANS = {
  wide: 'lg:col-span-2 aspect-[16/10] lg:aspect-[16/8]',
  tall: 'aspect-[16/10] lg:aspect-auto lg:row-span-2 lg:min-h-[34rem]',
  normal: 'aspect-[16/10]',
}

/**
 * Gallery tile. Renders a video/poster when the project has media,
 * otherwise an elegant "reserved" placeholder.
 */
export default function ProjectCard({ project, index }) {
  const video = useRef()
  const { category, title, video: src, poster, href, span = 'normal' } = project
  const hasMedia = Boolean(src || poster)
  const Tag = href ? 'a' : 'article'

  return (
    <Tag
      data-reveal="fade"
      data-delay={(index % 3) * 0.08}
      {...(href ? { href, target: '_blank', rel: 'noreferrer' } : {})}
      onPointerEnter={() => video.current?.play().catch(() => {})}
      onPointerLeave={() => video.current?.pause()}
      className={`card group relative block overflow-hidden rounded-[3px] border border-white/10 bg-[#08080a]/85 transition-colors duration-700 hover:border-white/35 ${SPANS[span]}`}
    >
      {src ? (
        <video ref={video} src={src} poster={poster || undefined} muted loop playsInline preload="none" className="absolute inset-0 h-full w-full object-cover opacity-80 transition-opacity duration-700 group-hover:opacity-100" />
      ) : poster ? (
        <img src={poster} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-cover opacity-80 transition-all duration-[1200ms] ease-out group-hover:scale-[1.03] group-hover:opacity-100" />
      ) : (
        <div className="absolute inset-0" aria-hidden="true">
          <div className="card-sheen absolute inset-0" />
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="flex h-16 w-16 items-center justify-center rounded-full border border-white/20 transition-all duration-700 ease-out group-hover:scale-110 group-hover:border-white/60">
              <svg width="12" height="14" viewBox="0 0 12 14" fill="none">
                <path d="M1 1.2v11.6L11 7 1 1.2Z" stroke="currentColor" strokeWidth="1" className="text-white/70" />
              </svg>
            </span>
          </div>
        </div>
      )}

      <div className="absolute inset-x-0 top-0 flex justify-between p-4 md:p-5">
        <span className="label tabular-nums text-white/70">{pad(index + 1)}</span>
        <span className="label text-white/45">{category}</span>
      </div>

      <div className="absolute inset-x-0 bottom-0 flex items-end justify-between bg-gradient-to-t from-black/70 to-transparent p-4 pt-12 md:p-5 md:pt-14">
        <h3 className="font-display text-base font-light tracking-tight text-white md:text-lg">
          {title || `Project ${pad(index + 1)}`}
        </h3>
        <span className="label text-white/45">{hasMedia ? 'View' : 'Coming soon'}</span>
      </div>
    </Tag>
  )
}
