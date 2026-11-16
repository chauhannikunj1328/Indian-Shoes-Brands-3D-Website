// Site-wide SEO facts used by scripts/prerender.mjs (Node only, not bundled into the app).
// Brand names, prices and shoe lists are NOT repeated here: they are read from src/brands.js and public/brands/*.json
// at build time, so the pages always match the store.

export const SITE = {
  url: 'https://www.theindianshoes.com', // canonical host (the bare domain redirects here)
  name: 'IndianShoes',
  alternateName: ['TheIndianShoes', 'इंडियनShoes'],
  lang: 'en-IN',
  locale: 'en_IN',
  themeColor: '#1d4fc9',
  logo: '/brands/indianshoes/wordmark.png', // 2265 x 721, transparent
  ogImage: { width: 1200, height: 630, type: 'image/jpeg' },
  tagline: "Walk through India's sneaker brands in 3D",
}

// Official brand websites (where the Buy buttons lead) and one factual phrase about each range.
export const BRAND_SEO = {
  neemans: { site: 'https://neemans.com', range: 'comfort sneakers and slip-ons' },
  comet: { site: 'https://www.wearcomet.com', range: 'sneakers from the Aeres, Apex, Astra, Aeon and X Lows lines' },
  gullylabs: { site: 'https://gullylabs.com', range: 'hand-lasted Indian sneakers' },
  bondstreet: { site: 'https://www.bondstreet.in', range: 'everyday casual sneakers from Bond Street by Redtape' },
}

export const DISCLOSURE =
  'IndianShoes does not sell shoes. Some links on this site are affiliate links: we may earn a commission if you buy through them, at no extra cost to you.'
