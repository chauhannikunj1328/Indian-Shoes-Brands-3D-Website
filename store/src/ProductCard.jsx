import { lazy, Suspense, useCallback, useEffect, useState, useSyncExternalStore } from 'react'
import { buildAffiliateUrl, trackClick } from './affiliate'

// The card shows the shoe's 3D model, turning slowly (drag to turn it), when the shoe has one; the photo shows until the model is
// ready, and stays for shoes without a model. The viewer is loaded on demand.
const ShoeViewer3D = lazy(() => import('./ShoeViewer3D'))

function ShoePicture({ item, brandName }) {
  const [ready, setReady] = useState(false)
  const onReady = useCallback(() => setReady(true), [])
  const photo = (
    <img
      className="product-card__img"
      src={item.image}
      alt={`${item.title}, a ${brandName} sneaker`}
      style={{ opacity: ready ? 0 : 1 }}
    />
  )
  if (!item.model) return photo
  return (
    <div className="product-card__viewer">
      {photo}
      <Suspense fallback={null}>
        <ShoeViewer3D url={item.model} flip={item.modelFlip} onReady={onReady} />
      </Suspense>
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
