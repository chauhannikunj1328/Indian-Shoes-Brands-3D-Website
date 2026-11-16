// Receives a Buy click from the site (src/affiliate.js -> trackClick) and records it.
//
// Today it writes one JSON line per click to the function log (Vercel dashboard > project > Logs, search "buy_click").
// Those logs are short-lived, so for real monthly reports set CLICK_WEBHOOK_URL (Vercel > Settings > Environment
// Variables) to somewhere that stores them, for example a Google Apps Script web app that appends a Sheet row,
// Make/Zapier, or your own database endpoint. Each click is POSTed there as JSON.
//
// It stores no name and no IP address. Anything the browser sends is checked and trimmed first.

const ID = /^[a-z0-9][a-z0-9-]{0,119}$/
const str = (v, max) => (typeof v === 'string' ? v.slice(0, max) : '')

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).end()
  }
  let b = req.body
  try {
    if (typeof b === 'string') b = JSON.parse(b)
  } catch {
    return res.status(400).end()
  }
  if (!b || typeof b !== 'object' || !ID.test(String(b.brand)) || !ID.test(String(b.handle))) return res.status(400).end()

  const click = {
    event: 'buy_click',
    brand: b.brand,
    handle: b.handle,
    title: str(b.title, 200),
    price: Number.isFinite(b.price) ? b.price : null,
    target: str(b.url, 300), // the brand's own product page
    path: str(b.path, 200), // the IndianShoes page the visitor was on
    ref: str(b.ref, 100), // the website they came from
    sid: str(b.sid, 24), // random per-tab code, not linked to a person
    receivedAt: new Date().toISOString(),
  }
  console.log(JSON.stringify(click))

  const hook = process.env.CLICK_WEBHOOK_URL
  if (hook) {
    try {
      await fetch(hook, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(click),
        signal: AbortSignal.timeout(3000),
      })
    } catch (e) {
      console.log(JSON.stringify({ event: 'click_webhook_failed', error: String(e) }))
    }
  }
  return res.status(204).end()
}
