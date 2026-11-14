import { useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { CTA, INTRO } from './brands'
import { STOPS, subscribe, currentStop, getTarget, goTo } from './tour'

// Top glass header (same frosted glass as the bottom tour bar):
//   left:  the इंडियनShoes wordmark - back to the store entrance
//   right: WhatsApp + email icons and a "For Brands" button that jumps to the enquiry wall
// It fades back a little while the camera is walking, so the 3D store stays the hero.
// Phones: wordmark + WhatsApp icon only.

const CTA_STOP = STOPS.findIndex((s) => s.name === 'cta')
const MAIL = `mailto:${CTA.email}?subject=${encodeURIComponent('3D store enquiry')}`

function WhatsAppIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
      {/* speech bubble with a phone handset */}
      <path
        fill="currentColor"
        d="M12 2.2a9.8 9.8 0 0 0-8.4 14.8L2.3 21.7l4.8-1.3A9.8 9.8 0 1 0 12 2.2Zm0 1.8a8 8 0 1 1-4.1 14.9l-.3-.2-2.8.8.8-2.7-.2-.3A8 8 0 0 1 12 4Z"
      />
      <path
        fill="currentColor"
        d="M8.9 7.3c.2 0 .4 0 .6.4l.8 1.9c.1.2.1.4 0 .6l-.5.7c-.1.2-.2.3 0 .6.4.7 1 1.4 1.6 1.9.7.6 1.3.9 1.8 1.1.2.1.4.1.5-.1l.7-.9c.2-.2.4-.2.6-.1l1.8.9c.3.1.4.2.4.4 0 .4-.1 1-.5 1.4-.4.5-1.3 1-2.2.9-.9 0-2.3-.5-3.7-1.6a10.6 10.6 0 0 1-2.9-3.5c-.5-1-.6-1.8-.4-2.5.2-.8.8-1.4 1.1-1.6.1-.1.2-.1.3-.1Z"
      />
    </svg>
  )
}

function MailIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
      <rect x="3" y="5.5" width="18" height="13" rx="2.5" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <path d="m4 7.5 8 6 8-6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
    </svg>
  )
}

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
  const stop = useSyncExternalStore(subscribe, currentStop)
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
        <a
          className="site-header__icon site-header__icon--wa"
          href={CTA.whatsapp.link}
          target="_blank"
          rel="noopener"
          aria-label="Chat on WhatsApp"
          title={`WhatsApp ${CTA.whatsapp.number}`}
        >
          <WhatsAppIcon />
        </a>
        <a
          className="site-header__icon site-header__icon--mail"
          href={MAIL}
          aria-label={`Email ${CTA.email}`}
          title={CTA.email}
        >
          <MailIcon />
        </a>
        <button
          type="button"
          className={`site-header__cta${stop === CTA_STOP ? ' is-active' : ''}`}
          onClick={() => goTo(CTA_STOP)}
        >
          For Brands
        </button>
      </nav>
    </header>
  )
}
