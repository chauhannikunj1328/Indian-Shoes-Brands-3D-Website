import { Component, StrictMode, Suspense, lazy } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { INFO_PAGES } from './content/pages.js'

// /for-brands, /privacy and /terms are normal light pages; every other address is the 3D store.
// Each is its own chunk, so the info pages never download the 3D code.
const path = window.location.pathname.replace(/\/+$/, '') || '/'
const isInfo = Object.hasOwn(INFO_PAGES, path)
const InfoPage = lazy(() => import('./InfoPage.jsx'))
const App = lazy(() => import('./App.jsx'))

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
          <button type="button" onClick={() => window.location.reload()} style={{ padding: '12px 22px', borderRadius: 999, border: 0, background: '#1d4fc9', color: '#fff', fontWeight: 600, fontSize: 15 }}>
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
      <Suspense fallback={null}>{isInfo ? <InfoPage path={path} /> : <App />}</Suspense>
    </Safety>
  </StrictMode>,
)
