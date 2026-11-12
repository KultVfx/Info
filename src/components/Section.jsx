/** Full-viewport scene wrapper. `data-section` registers it with the director. */
export default function Section({ id, label, className = '', children }) {
  return (
    <section
      id={id}
      data-section
      aria-label={label}
      className={`relative flex min-h-[100svh] w-full flex-col px-6 md:px-12 lg:px-20 ${className}`}
    >
      {children}
    </section>
  )
}

/** Small numbered eyebrow: "02 — Identity". */
export function Eyebrow({ index, children }) {
  return (
    <p data-reveal="fade" className="label flex items-center gap-4 text-white/60">
      <span className="tabular-nums text-white">{index}</span>
      <span className="h-px w-10 bg-white/40" />
      <span>{children}</span>
    </p>
  )
}
