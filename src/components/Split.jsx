/**
 * Splits text into masked words (or characters) for line-reveal animation.
 * Put data-reveal="split" on a parent element to animate it.
 */
export default function Split({ text, by = 'words', className = '' }) {
  const parts = by === 'chars' ? [...text] : text.split(' ')
  return (
    <span className={className} aria-label={text} role="text">
      {parts.map((part, i) => (
        <span key={i} aria-hidden="true">
          <span className="split-mask">
            <span className="split-inner">{part}</span>
          </span>
          {by === 'words' && i < parts.length - 1 ? ' ' : null}
        </span>
      ))}
    </span>
  )
}
