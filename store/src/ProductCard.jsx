import { lazy, Suspense, useCallback, useEffect, useState, useSyncExternalStore } from 'react'
import { buildAffiliateUrl, trackClick } from './affiliate'

// The card shows the shoe's 3D model, turning slowly (drag to turn it), when the shoe has one; the photo shows until the model is
// ready, and stays for shoes without a model and on phones. The viewer is loaded on demand.
const ShoeViewer3D = lazy(() => import('./ShoeViewer3D'))
// The viewer is a SECOND, small WebGL canvas on top of the store's own. Phones can run short of graphics memory, so on a phone:
//  - the viewer is lighter (see ShoeViewer3D.jsx);
//  - if the page ever dies or the viewer is dropped while a card is open, the card shows the photo from then on for this visit.
const PHONE = typeof window !== 'undefined' && window.matchMedia('(max-width: 900px), (pointer: coarse)').matches
const store = (k, v) => {
  try {
    if (v === undefined) return sessionStorage.getItem(k)
    if (v === null) sessionStorage.removeItem(k)
    else sessionStorage.setItem(k, v)
  } catch {
    return null
  }
}
// a normal reload, navigation or closing the tab fires `pagehide`; a page the phone killed for lack of memory does not
if (PHONE) window.addEventListener('pagehide', () => store('card3d-open', null))
if (PHONE && store('card3d-open') === '1') {
  store('card3d-off', '1') // last time a 3D card was open the page died: keep to photos
  store('card3d-open', null)
}

function ShoePicture({ item, brandName }) {
  const [ready, setReady] = useState(false)
  const [failed, setFailed] = useState(false)
  const onReady = useCallback(() => setReady(true), [])
  const onFail = useCallback(() => {
    if (PHONE) store('card3d-off', '1')
    setFailed(true)
  }, [])
  const use3d = Boolean(item.model) && !failed && !(PHONE && store('card3d-off') === '1')
  // while a 3D card is open on a phone, remember it: if the page dies, the next visit uses photos
  useEffect(() => {
    if (!PHONE || !use3d) return
    store('card3d-open', '1')
    return () => store('card3d-open', null)
  }, [use3d])
  const photo = (
    <img
      className="product-card__img"
      src={item.image}
      alt={`${item.title}, a ${brandName} sneaker`}
      style={{ opacity: ready ? 0 : 1 }}
    />
  )
  if (!use3d) return photo
  return (
    <div className="product-card__viewer">
      {photo}
      <Suspense fallback={null}>
        <ShoeViewer3D url={item.model} flip={item.modelFlip} onReady={onReady} onFail={onFail} />
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
