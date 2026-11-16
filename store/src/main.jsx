import { Component, StrictMode, Suspense, lazy, useEffect, useRef, useState } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { INFO_PAGES } from './content/pages.js'

// /for-brands, /privacy and /terms are normal light pages; every other address is the 3D store.
// Each is its own chunk, so the info pages never download the 3D code.
// Moving between them does NOT reload the site: links are handled here (history API), the store stays loaded behind the info
// pages, and the music keeps playing. (Phones free the 3D scene while an info page is open, to save memory.)
const norm = (p) => p.replace(/\/+$/, '') || '/'
const isInfoPath = (p) => Object.hasOwn(INFO_PAGES, p)
const InfoPage = lazy(() => import('./InfoPage.jsx'))
const App = lazy(() => import('./App.jsx'))
const SMALL_SCREEN = window.matchMedia('(max-width: 900px), (pointer: coarse)').matches
const STORE_TITLE = isInfoPath(norm(window.location.pathname)) ? "IndianShoes: Walk through India's sneaker brands in 3D" : document.title

function Root() {
  const [path, setPath] = useState(() => norm(window.location.pathname))
  const info = isInfoPath(path)
  const [storeShown, setStoreShown] = useState(!info) // the store has been opened at least once
  useEffect(() => {
    if (!info) setStoreShown(true)
  }, [info])

  // same-site links switch the view instead of reloading the page
  useEffect(() => {
    const onClick = (e) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
      const a = e.target?.closest?.('a[href]')
      if (!a || (a.target && a.target !== '_self') || a.hasAttribute('download')) return
      const u = new URL(a.href, window.location.href)
      if (u.origin !== window.location.origin || !/^https?:$/.test(u.protocol)) return
      const to = norm(u.pathname)
      if (/\.[a-z0-9]+$/i.test(to)) return // files such as /llms.txt, /sitemap.xml
      if (to === norm(window.location.pathname)) return // same page (#links): the browser scrolls
      e.preventDefault()
      window.history.pushState(null, '', u.pathname + u.search + u.hash)
      setPath(to)
    }
    const onPop = () => setPath(norm(window.location.pathname))
    document.addEventListener('click', onClick)
    window.addEventListener('popstate', onPop)
    return () => {
      document.removeEventListener('click', onClick)
      window.removeEventListener('popstate', onPop)
    }
  }, [])

  // page title, and a #link target (e.g. /for-brands#contact-h) once the page is there
  const first = useRef(true)
  useEffect(() => {
    if (first.current) first.current = false
    else document.title = isInfoPath(path) ? INFO_PAGES[path].title : STORE_TITLE
    const id = window.location.hash.slice(1)
    if (!id) return
    let tries = 0
    const t = setInterval(() => {
      const el = document.getElementById(id)
      if (el) el.scrollIntoView()
      if (el || ++tries > 30) clearInterval(t)
    }, 50)
    return () => clearInterval(t)
  }, [path])

  const keepStore = storeShown && (!info || !SMALL_SCREEN)
  return (
    <>
      {keepStore && (
        <div style={{ display: info ? 'none' : 'contents' }}>
          <Suspense fallback={null}>
            <App paused={info} />
          </Suspense>
        </div>
      )}
      {info && (
        <Suspense fallback={null}>
          <InfoPage key={path} path={path} />
        </Suspense>
      )}
    </>
  )
}

// After a new deploy, a visitor with an old cached page can ask for a file that no longer exists. Reload once to pick up
// the new version instead of leaving a blank screen.
const reloadOnce = () => {
  try {
    if (sessionStorage.getItem('reloaded-once')) return false
    sessionStorage.setItem('reloaded-once', '1')
  } catch {
    return false
  }
  window.location.reload()
  return true
}
window.addEventListener('vite:preloadError', (e) => {
  if (reloadOnce()) e.preventDefault()
})

// Never leave a white screen: if something throws, say so and offer a reload.
class Safety extends Component {
  state = { failed: false }
  static getDerivedStateFromError() {
    return { failed: true }
  }
  componentDidCatch() {
    reloadOnce()
  }
  render() {
    if (!this.state.failed) return this.props.children
    return (
      <div style={{ position: 'fixed', inset: 0, display: 'grid', placeItems: 'center', padding: 24, textAlign: 'center', fontFamily: 'system-ui, sans-serif', color: '#141414', background: '#f4f4f2' }}>
        <div>
          <p style={{ fontSize: 20, fontWeight: 700, margin: '0 0 8px' }}>The store did not load.</p>
          <p style={{ margin: '0 0 16px' }}>Please try again. On a phone, closing other tabs can help.</p>
          <button type="button" onClick={() => window.location.reload()} style={{ padding: '12px 22px', borderRadius: 999, border: 0, background: '#111', color: '#fff', fontWeight: 600, fontSize: 15 }}>
            Reload
          </button>
          <p style={{ marginTop: 16 }}>
            <a href="/for-brands">For brands</a>
          </p>
        </div>
      </div>
    )
  }
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Safety>
      <Root />
    </Safety>
  </StrictMode>,
)
