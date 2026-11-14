import { useEffect, useSyncExternalStore } from 'react'
import { buildAffiliateUrl, trackClick, DISCLOSURE } from './affiliate'

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
      <img className="product-card__img" src={item.image} alt={item.title} />
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
      <div className="product-card__note">{DISCLOSURE}</div>
    </div>
  )
}
