// All editable site content lives here.
// Empty strings / nulls are placeholders — fill them in when ready.

export const site = {
  name: 'KULT',
  descriptor: 'Creative Digital Identity',
  location: 'Tashkent, Uzbekistan',
  coords: '41.2995° N — 69.2401° E',
}

export const sections = [
  { id: 'intro', label: 'Intro' },
  { id: 'identity', label: 'Identity' },
  { id: 'world', label: 'Creative World' },
  { id: 'beyond', label: 'Beyond Digital' },
  { id: 'outro', label: 'Outro' },
]

export const roles = [
  { title: 'VFX Artist', tag: 'Visual Effects' },
  { title: 'Motion Designer', tag: 'Motion' },
  { title: 'Video Editor', tag: 'Edit' },
  { title: '3D Designer', tag: 'Dimension' },
  { title: 'Website Creator', tag: 'Web' },
]

// Gallery placeholders. To publish a project set `title`, and optionally
// `video` (mp4/webm url) and/or `poster` (image url), and `href`.
export const projects = [
  { category: 'VFX', title: '', video: '', poster: '', href: '', span: 'wide' },
  { category: 'Motion', title: '', video: '', poster: '', href: '', span: 'tall' },
  { category: 'Edit', title: '', video: '', poster: '', href: '', span: 'normal' },
  { category: '3D', title: '', video: '', poster: '', href: '', span: 'normal' },
  { category: 'Web', title: '', video: '', poster: '', href: '', span: 'tall' },
  { category: 'VFX', title: '', video: '', poster: '', href: '', span: 'wide' },
]

export const interests = [
  { title: 'Chess', tag: 'Strategy' },
  { title: 'Tennis', tag: 'Precision' },
  { title: 'Billiards', tag: 'Geometry' },
  { title: 'Football', tag: 'Tempo' },
  { title: 'Basketball', tag: 'Flow' },
  { title: 'Fashion', tag: 'Form' },
  { title: 'Perfumery', tag: 'Atmosphere' },
]

// Set `href` to activate a link. Links without an href render as "soon".
export const socials = [
  { label: 'Instagram', href: '' },
  { label: 'Telegram', href: '' },
  { label: 'YouTube', href: '' },
  { label: 'Behance', href: '' },
]

export const contact = {
  email: '', // e.g. 'hello@yourdomain.com'
}
