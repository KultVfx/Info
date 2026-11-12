import { lazy, Suspense, useRef } from 'react'
import Nav from './components/Nav'
import Progress from './components/Progress'
import Scrim from './components/Scrim'
import Intro from './sections/Intro'
import Identity from './sections/Identity'
import CreativeWorld from './sections/CreativeWorld'
import BeyondDigital from './sections/BeyondDigital'
import Outro from './sections/Outro'
import { useScrollDirector } from './hooks/useScrollDirector'
import { useReveal } from './hooks/useReveal'

// The WebGL scene loads in parallel; the page is readable immediately.
const Experience = lazy(() => import('./three/Experience'))

export default function App() {
  const main = useRef()
  useScrollDirector()
  useReveal(main)

  return (
    <>
      <a href="#identity" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:bg-white focus:px-4 focus:py-2 focus:text-black">
        Skip to content
      </a>
      <Suspense fallback={null}>
        <Experience />
      </Suspense>
      <Scrim />
      <Nav />
      <Progress />
      <main ref={main} className="relative">
        <Intro />
        <Identity />
        <CreativeWorld />
        <BeyondDigital />
        <Outro />
      </main>
    </>
  )
}
