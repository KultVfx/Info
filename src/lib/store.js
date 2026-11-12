import { useSyncExternalStore } from 'react'

// Mutable, frame-rate state shared between the DOM and the WebGL scene.
// Read it inside animation loops; never put it in React state.
export const store = {
  s: 0, // continuous section coordinate: 0 → sections.length - 1
  scroll: 0, // smoothed page progress 0 → 1
  pointer: { x: 0, y: 0 }, // normalised -1 → 1
  section: 0, // active section index
  invalidate: null, // set by the WebGL scene (on-demand rendering)
  reduced:
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches,
}

const listeners = new Set()

export function setSection(i) {
  if (i === store.section) return
  store.section = i
  listeners.forEach((fn) => fn())
}

const subscribe = (fn) => {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

export const useActiveSection = () =>
  useSyncExternalStore(subscribe, () => store.section)
