import { Component, lazy, Suspense, useCallback, useEffect, useState, useSyncExternalStore } from 'react'
import { buildAffiliateUrl, trackClick } from './affiliate'

// The card shows the shoe's 3D model, turning slowly (drag to turn it), when the shoe has one; the photo shows until the model is
// ready, and stays for shoes without a model and on phones. The viewer is loaded on demand.
const ShoeViewer3D = lazy(() => import('./ShoeViewer3D'))
// The viewer is a SECOND, small WebGL canvas on top of the store's own. Phones can run short of graphics memory, so on a phone the
// viewer is lighter (see ShoeViewer3D.jsx). If the browser drops the viewer (or it fails to start), the card shows the photo with a
// "Show in 3D" button to try again. Nothing is remembered between visits: every visit starts with the 3D view.
class ViewerBoundary extends Component {
  state = { failed: false }
  static getDerivedStateFromError() {
    return { failed: true }
  }
  componentDidCatch() {
    this.props.onFail?.()
  }
  render() {
    return this.state.failed ? null : this.props.children
  }
}

function ShoePicture({ item, brandName }) {
  const [ready, setReady] = useState(false)
  const [failed, setFailed] = useState(false)
  const [attempt, setAttempt] = useState(0)
  const onReady = useCallback(() => setReady(true), [])
  const onFail = useCallback(() => setFailed(true), [])
  const retry = () => {
    setFailed(false)
    setReady(false)
    setAttempt((n) => n + 1)
  }
  const use3d = Boolean(item.model) && !failed
  const photo = (
    <img
      className="product-card__img"
      src={item.image}
      alt={`${item.title}, a ${brandName} sneaker`}
      style={{ opacity: ready ? 0 : 1 }}
    />
  )
  if (!use3d)
    return (
      <>
        {photo}
        {item.model && (
          <button type="button" className="product-card__retry3d" onClick={retry}>
            Show in 3D
          </button>
        )}
      </>
    )
  return (
    <div className="product-card__viewer">
      {photo}
      <ViewerBoundary key={attempt} onFail={onFail}>
        <Suspense fallback={null}>
          <ShoeViewer3D url={item.model} flip={item.modelFlip} onReady={onReady} onFail={onFail} />
        </Suspense>
      </ViewerBoundary>
    </div>
  )
}

// Tiny store: the 3D shoes call selectShoe(); the HTML card below reads it.
let selected = null
const listeners = new Set()
const subscribe = (fn) => (listeners.add(fn), () => listeners.delete(fn))
export function selectShoe(sel) {
  selected = sel
  listeners.forEach((fn) => fn())
}

const inr = (n) => '₹' + Number(n).toLocaleString('en-IN')

export default function ProductCard() {
  const sel = useSyncExternalStore(subscribe, () => selected)
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && selectShoe(null)
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])
  if (!sel) return null
  const { brand, brandName, item } = sel
  return (
    <div className="product-card" role="dialog" aria-label={item.title}>
      <button type="button" className="product-card__close" onClick={() => selectShoe(null)} aria-label="Close">×</button>
      <ShoePicture key={item.handle} item={item} brandName={brandName} />
      <div className="product-card__brand">{brandName}</div>
      <div className="product-card__title">{item.title}</div>
      <div className="product-card__price">{inr(item.price_inr)}</div>
      <a
        className="product-card__buy"
        href={buildAffiliateUrl(brand, item)}
        target="_blank"
        rel="sponsored noopener noreferrer"
        onClick={() => trackClick(brand, item)}
      >
        Buy on {brandName}
      </a>
    </div>
  )
}
