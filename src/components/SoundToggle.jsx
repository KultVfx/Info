import { useAmbientSound } from '../hooks/useAmbientSound'

export default function SoundToggle() {
  const [on, toggle] = useAmbientSound()
  return (
    <button
      onClick={toggle}
      aria-pressed={on}
      aria-label={on ? 'Turn ambient sound off' : 'Turn ambient sound on'}
      className="label pointer-events-auto group flex items-center gap-3 text-white/60 transition-colors duration-500 hover:text-white"
    >
      <span className="flex h-3 items-end gap-[3px]" aria-hidden="true">
        {[0, 1, 2, 3].map((i) => (
          <span
            key={i}
            className={`w-px origin-bottom bg-current ${on ? 'sound-bar' : ''}`}
            style={{ height: on ? '100%' : '25%', animationDelay: `${i * -0.27}s`, transition: 'height .5s' }}
          />
        ))}
      </span>
      <span className="min-w-[7.2em] whitespace-nowrap text-left">Sound {on ? 'On' : 'Off'}</span>
    </button>
  )
}
