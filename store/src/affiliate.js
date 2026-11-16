// Affiliate links + click tracking.
//
// Every shoe in public/brands/<brand>/*.json already has its real product page in `url`.
// `buildAffiliateUrl` turns that into the link the Buy button opens.
//
// TO GO LIVE: when a brand/network gives you a link pattern, put it in AFFILIATE[brand].template.
//   {url}  = the product page, URL-encoded     {raw} = the product page as is
//   {sub}  = a tracking id for the shoe, e.g. comet_aeres-blizzard
// Example (Awin):  'https://www.awin1.com/cread.php?awinmid=MERCHANT_ID&awinaffid=YOUR_ID&clickref={sub}&ued={url}'
// With template = null the plain product page is used (plus utm tags), so links work today but earn nothing.
export const AFFILIATE = {
  comet: { template: null },
  gullylabs: { template: null },
  bondstreet: { template: null }, // Bond Street by Redtape advertises its own affiliate programme (flat 10% per sale): apply, then paste the link pattern here
  neemans: { template: null }, // listed on Cuelinks / vCommission / FlexOffers / Admitad: apply, then paste the link pattern here
}

// Where Buy clicks are sent so they can be counted and reported to brands (store/api/click.js, a Vercel function).
// Only in the built site: in dev there is no function to receive them. null = analytics events + local log only.
export const CLICK_ENDPOINT = import.meta.env?.PROD ? '/api/click' : null

// a random code for this browser tab, so repeat clicks can be counted once; it is not linked to a person
function sessionCode() {
  try {
    let id = sessionStorage.getItem('sid')
    if (!id) {
      id = Math.random().toString(36).slice(2, 12)
      sessionStorage.setItem('sid', id)
    }
    return id
  } catch {
    return ''
  }
}

export const DISCLOSURE = 'We may earn a commission when you buy through our links, at no extra cost to you.'

export function buildAffiliateUrl(brand, item) {
  const sub = `${brand}_${item.handle}`
  const tpl = AFFILIATE[brand]?.template
  if (tpl) {
    return tpl.replaceAll('{url}', encodeURIComponent(item.url)).replaceAll('{raw}', item.url).replaceAll('{sub}', encodeURIComponent(sub))
  }
  const u = new URL(item.url)
  u.searchParams.set('utm_source', '3d-store')
  u.searchParams.set('utm_medium', 'affiliate')
  u.searchParams.set('utm_campaign', sub)
  return u.toString()
}

// Called when someone clicks Buy. Never blocks the navigation.
export function trackClick(brand, item) {
  const payload = { brand, handle: item.handle, title: item.title, price: item.price_inr, url: item.url, ts: Date.now() }
  try {
    // what the server records: no name, no IP; the page, the website the visitor came from, and a random session code
    const ref = document.referrer ? new URL(document.referrer).origin : ''
    const sent = { ...payload, path: location.pathname, ref, sid: sessionCode() }
    window.plausible?.('Buy click', { props: { brand, shoe: item.handle } })
    window.gtag?.('event', 'buy_click', { brand, shoe: item.handle })
    if (CLICK_ENDPOINT) {
      navigator.sendBeacon(CLICK_ENDPOINT, new Blob([JSON.stringify(sent)], { type: 'application/json' }))
    }
    const log = JSON.parse(localStorage.getItem('buyClicks') || '[]')
    log.push(payload)
    localStorage.setItem('buyClicks', JSON.stringify(log.slice(-200)))
  } catch {
    /* tracking must never break the click */
  }
}
