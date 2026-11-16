import { useCallback, useEffect, useRef, useState } from 'react'
import { MUSIC } from './brands'

// Background music for the whole store, with a speaker button in the header.
// Browsers refuse to play sound until the visitor has interacted with the page, so the music fades in on the visitor's FIRST click,
// key press or tap (scrolling alone does not count for browsers). The speaker button then mutes / unmutes it. If a visitor switches
// it off, that is remembered and it stays off on their next visit. It pauses while the tab is hidden.
// Configured in brands.js (MUSIC). Nothing is shown or loaded while MUSIC.src is empty.

// MUSIC.tracks = a list of files that play one after another and then start again (MUSIC.src = a single file is also accepted).
const TRACKS = (MUSIC.tracks?.length ? MUSIC.tracks : MUSIC.src ? [MUSIC.src] : []).filter(Boolean)
const KEY = 'indianshoes-music' // 'off' once the visitor has switched the music off
const read = () => {
  try {
    return localStorage.getItem(KEY)
  } catch {
    return null
  }
}
const write = (v) => {
  try {
    localStorage.setItem(KEY, v)
  } catch {
    /* private mode etc.: it just won't be remembered */
  }
}

function SpeakerIcon({ on }) {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
      <path d="M4 9.5h3.2L12 5.5v13l-4.8-4H4a1 1 0 0 1-1-1v-3a1 1 0 0 1 1-1Z" fill="currentColor" />
      {on ? (
        <>
          <path d="M15.2 9.2a4 4 0 0 1 0 5.6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          <path d="M17.7 6.8a7.4 7.4 0 0 1 0 10.4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </>
      ) : (
        <path d="m15.5 9.5 5 5m0-5-5 5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      )}
    </svg>
  )
}

export default function MusicToggle() {
  const [on, setOn] = useState(false)
  const audio = useRef(null)
  const fade = useRef(null)
  const wantOn = useRef(read() !== 'off') // false once the visitor has muted it

  const fadeTo = useCallback((target, done) => {
    const a = audio.current
    if (!a) return
    clearInterval(fade.current)
    const step = (MUSIC.volume / (MUSIC.fadeSeconds * 20)) * (target > a.volume ? 1 : -1)
    fade.current = setInterval(() => {
      const next = a.volume + step
      if ((step > 0 && next >= target) || (step < 0 && next <= target)) {
        a.volume = Math.max(0, Math.min(1, target))
        clearInterval(fade.current)
        done?.()
      } else {
        a.volume = Math.max(0, Math.min(1, next))
      }
    }, 50)
  }, [])

  const start = useCallback(() => {
    if (!audio.current) {
      const a = new Audio(TRACKS[0])
      let i = 0
      a.loop = TRACKS.length === 1
      // several tracks: move on to the next when one ends, then round again
      a.addEventListener('ended', () => {
        i = (i + 1) % TRACKS.length
        a.src = TRACKS[i]
        a.play().catch(() => {})
      })
      a.volume = 0
      a.preload = 'auto'
      audio.current = a
    }
    audio.current
      .play()
      .then(() => {
        setOn(true)
        fadeTo(MUSIC.volume)
      })
      .catch(() => {}) // still blocked: the next click / key / tap tries again
  }, [fadeTo])

  const stop = useCallback(() => {
    setOn(false)
    fadeTo(0, () => audio.current?.pause())
  }, [fadeTo])

  useEffect(() => {
    if (!TRACKS.length) return
    // first interaction (not on the speaker button itself, that one has its own click) starts the music
    const gesture = (e) => {
      if (e.target?.closest?.('.music-toggle')) return
      if (!wantOn.current) return remove()
      start()
      remove()
    }
    const events = ['pointerdown', 'keydown', 'touchend']
    const remove = () => events.forEach((n) => window.removeEventListener(n, gesture))
    if (wantOn.current) {
      events.forEach((n) => window.addEventListener(n, gesture))
      start() // works straight away where the browser allows it
    }
    const onVisibility = () => {
      const a = audio.current
      if (!a) return
      if (document.hidden) a.pause()
      else if (wantOn.current && a.paused) a.play().catch(() => {})
    }
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      remove()
      document.removeEventListener('visibilitychange', onVisibility)
      clearInterval(fade.current)
      audio.current?.pause()
    }
  }, [start])

  if (!TRACKS.length) return null
  return (
    <button
      type="button"
      className="site-header__icon music-toggle"
      aria-pressed={on}
      aria-label={on ? 'Turn the music off' : 'Turn the music on'}
      title={MUSIC.credit ? `${on ? 'Music on' : 'Music off'} · ${MUSIC.credit}` : on ? 'Music on' : 'Music off'}
      onClick={() => {
        if (on) {
          wantOn.current = false
          write('off')
          stop()
        } else {
          wantOn.current = true
          write('on')
          start()
        }
      }}
    >
      <SpeakerIcon on={on} />
    </button>
  )
}
