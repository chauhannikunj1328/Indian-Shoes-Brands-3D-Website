import { useEffect, useRef, useState } from 'react'
import { INTRO } from './brands'
import { STOPS, subscribe, getTarget, goTo } from './tour'
import MusicToggle from './MusicToggle'
import MenuDrawer from './MenuDrawer'

// Top glass header (same frosted glass as the bottom tour bar):
//   left:  the इंडियनShoes wordmark - back to the store entrance
//   right: music speaker, a "Get a 3D store" button (jumps to the enquiry wall with the WhatsApp / email options) and "For Brands"
// It fades back a little while the camera is walking, so the 3D store stays the hero.
// Phones: wordmark, speaker and the two buttons (shorter label).

// true for a moment after the camera starts moving
function useWalking() {
  const [walking, setWalking] = useState(false)
  const last = useRef(getTarget())
  const timer = useRef()
  useEffect(
    () =>
      subscribe(() => {
        const t = getTarget()
        if (t === last.current) return
        last.current = t
        setWalking(true)
        clearTimeout(timer.current)
        timer.current = setTimeout(() => setWalking(false), 1400)
      }),
    [],
  )
  useEffect(() => () => clearTimeout(timer.current), [])
  return walking
}

export default function SiteHeader() {
  const walking = useWalking()
  const words = INTRO.wordmark || [{ text: INTRO.siteName }]

  return (
    <header className={`site-header${walking ? ' is-walking' : ''}`}>
      <button
        type="button"
        className="site-header__logo"
        onClick={() => goTo(0)}
        aria-label={`${INTRO.siteName}: back to the entrance`}
      >
        {words.map((part, i) => (
          <span key={i} lang={part.lang} className={`site-header__word site-header__word--${part.lang || 'en'}`}>
            {part.text}
          </span>
        ))}
      </button>
      <nav className="site-header__actions" aria-label="Contact">
        <MusicToggle />
        <a className="site-header__cta" href="/for-brands">
          For Brands
        </a>
        <button type="button" className="site-header__enquire" onClick={() => goTo(STOPS.findIndex((st) => st.name === 'cta'))}>
          <span className="site-header__enquire-long">Get a 3D store</span>
          <span className="site-header__enquire-short">Get a store</span>
        </button>
        <MenuDrawer path="/" />
      </nav>
    </header>
  )
}
