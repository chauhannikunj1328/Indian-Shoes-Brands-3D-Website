import { StrictMode, Suspense, lazy } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { INFO_PAGES } from './content/pages.js'

// /for-brands, /privacy and /terms are normal light pages; every other address is the 3D store.
// Each is its own chunk, so the info pages never download the 3D code.
const path = window.location.pathname.replace(/\/+$/, '') || '/'
const isInfo = Object.hasOwn(INFO_PAGES, path)
const InfoPage = lazy(() => import('./InfoPage.jsx'))
const App = lazy(() => import('./App.jsx'))

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Suspense fallback={null}>{isInfo ? <InfoPage path={path} /> : <App />}</Suspense>
  </StrictMode>,
)
