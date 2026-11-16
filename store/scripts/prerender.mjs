// Runs after `vite build` (see package.json). Turns the single-page 3D app into crawlable pages WITHOUT a server:
//
//   /                      home          /brands               brand hub
//   /<brand>               one per brand /<brand>/<shoe>       one per shoe
//   /404.html (noindex), /sitemap.xml
//
// Each page is the built dist/index.html plus (1) a full <head>: title, description, canonical, hreflang, robots,
// Open Graph, Twitter, JSON-LD; and (2) a visually hidden but real HTML body (#seo-content: headings, text, links)
// for crawlers, screen readers and people without JavaScript. The 3D app mounts into #root as before and, on a brand
// or shoe URL, flies straight to that brand or opens that shoe (src/routes.js).
//
// Everything is read from src/brands.js and public/brands/*.json, so the pages always match the store.

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { BRANDS, CTA } from '../src/brands.js'
import { buildAffiliateUrl } from '../src/affiliate.js'
import { SITE, BRAND_SEO, DISCLOSURE } from '../seo/config.mjs'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const pub = path.join(root, 'public')
const dist = path.join(root, 'dist')
const today = new Date().toISOString().slice(0, 10)

// ---------- helpers ----------
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
const abs = (p) => (/^https?:/.test(p) ? p : SITE.url + (p.startsWith('/') ? p : '/' + p))
const inr = (n) => '₹' + Number(n).toLocaleString('en-IN')
const trunc = (s, n) => (s.length <= n ? s : s.slice(0, n - 1).replace(/\s+\S*$/, '') + '…')
const clean = (s) => s.replace(/\s+/g, ' ').trim()
const poss = (n) => (/s$/i.test(n) ? `${n}'` : `${n}'s`) // Neemans' / Comet's
const jsonLd = (o) => `<script type="application/ld+json">${JSON.stringify(o).replace(/</g, '\\u003c')}</script>`
const write = (rel, content) => {
  const f = path.join(dist, rel)
  fs.mkdirSync(path.dirname(f), { recursive: true })
  fs.writeFileSync(f, content)
}

// ---------- data ----------
const brands = BRANDS.map((b) => {
  const name = b.tabLabel ?? b.name
  const shoes = []
  for (const cfg of Object.values(b.bay.shelves)) {
    const items = JSON.parse(fs.readFileSync(path.join(pub, cfg.list), 'utf8'))
    const gender = /women/.test(cfg.list) ? 'Women' : /men/.test(cfg.list) ? 'Men' : null
    for (const it of items) shoes.push({ ...it, gender, brandId: b.id, brandName: name })
  }
  const prices = shoes.map((s) => s.price_inr)
  const cheapest = shoes.find((s) => s.price_inr === Math.min(...prices))
  const dearest = shoes.find((s) => s.price_inr === Math.max(...prices))
  const men = shoes.filter((s) => s.gender === 'Men').length
  const women = shoes.filter((s) => s.gender === 'Women').length
  const seo = BRAND_SEO[b.id]
  if (!seo) throw new Error(`seo/config.mjs has no entry for brand "${b.id}"`)
  return {
    id: b.id,
    name,
    shoes,
    men,
    women,
    min: Math.min(...prices),
    max: Math.max(...prices),
    cheapest,
    dearest,
    models: shoes.filter((s) => s.model).length,
    official: seo.site,
    range: seo.range,
    path: `/${b.id}`,
  }
})
const totalShoes = brands.reduce((n, b) => n + b.shoes.length, 0)
const allMin = Math.min(...brands.map((b) => b.min))
const allMax = Math.max(...brands.map((b) => b.max))
const nameList = (arr) => (arr.length < 2 ? arr.join('') : arr.slice(0, -1).join(', ') + ' and ' + arr[arr.length - 1])
const brandNames = nameList(brands.map((b) => b.name))
const who = (b) =>
  b.men && b.women ? `${b.women} women's and ${b.men} men's styles` : b.men ? `${b.men} men's styles` : `${b.women} women's styles`
const shoePath = (s) => `/${s.brandId}/${s.handle}`
const ogFor = (id) => (id ? `/og/${id}.jpg` : '/og/home.jpg')

// ---------- page descriptions ----------
function brandDescription(b) {
  return `${b.shoes.length} ${b.name} sneakers in the IndianShoes 3D store, from ${inr(b.min)} to ${inr(b.max)}. Walk the ${b.name} bay and buy on ${poss(b.name)} official site.`
}
function shoeDescription(s, b) {
  return trunc(
    `${clean(s.title)} by ${b.name}, listed at ${inr(s.price_inr)}. See it in the IndianShoes 3D store, then buy it on ${poss(b.name)} official website.`,
    158,
  )
}
function brandFaq(b) {
  const threeD = b.models ? 'shown as 3D models you can look around' : 'shown as photo cut-outs'
  return [
    [
      `What ${b.name} sneakers can I see on IndianShoes?`,
      `The ${b.name} bay shows ${b.shoes.length} sneakers (${who(b)}): ${b.range}. Each one has its own page with its price and a link to buy it on ${poss(b.name)} official site.`,
    ],
    [
      `How much do ${b.name} sneakers cost?`,
      `The ${b.name} sneakers on IndianShoes range from ${inr(b.min)} (${clean(b.cheapest.title)}) to ${inr(b.max)} (${clean(b.dearest.title)}). Prices were taken from ${poss(b.name)} website when the store was last updated, so check the brand site for the current price.`,
    ],
    [
      `Where can I buy ${b.name} sneakers from IndianShoes?`,
      `IndianShoes does not sell shoes. Pick a pair in the 3D store and use the Buy button to go to ${poss(b.name)} official website. Some of these links are affiliate links, so IndianShoes may earn a commission if you buy, at no extra cost to you.`,
    ],
    [
      'What is the IndianShoes 3D store?',
      `IndianShoes is a virtual sneaker store you walk through in your browser. Each Indian brand gets its own logo block and bay with its shoes on shelves, ${threeD}.`,
    ],
  ]
}

// ---------- shared HTML pieces ----------
const orgId = `${SITE.url}/#organization`
const siteId = `${SITE.url}/#website`
const organization = {
  '@type': 'Organization',
  '@id': orgId,
  name: SITE.name,
  alternateName: SITE.alternateName,
  url: SITE.url + '/',
  logo: { '@type': 'ImageObject', url: abs(SITE.logo), width: 2265, height: 721 },
  email: CTA.email,
  contactPoint: [{ '@type': 'ContactPoint', contactType: 'sales', email: CTA.email, availableLanguage: ['en', 'hi'] }],
}
const website = {
  '@type': 'WebSite',
  '@id': siteId,
  url: SITE.url + '/',
  name: SITE.name,
  alternateName: SITE.alternateName,
  inLanguage: SITE.lang,
  publisher: { '@id': orgId },
}
const crumbs = (items) => ({
  '@type': 'BreadcrumbList',
  itemListElement: items.map(([name, p], i) => ({ '@type': 'ListItem', position: i + 1, name, item: abs(p) })),
})
const crumbsHtml = (items) =>
  `<nav aria-label="Breadcrumb"><ol>${items
    .map(([name, p], i) => (i === items.length - 1 ? `<li aria-current="page">${esc(name)}</li>` : `<li><a href="${p}">${esc(name)}</a></li>`))
    .join('')}</ol></nav>`
const siteNav = `<nav aria-label="Main"><ul><li><a href="/">IndianShoes 3D store</a></li><li><a href="/brands">All brands</a></li>${brands
  .map((b) => `<li><a href="${b.path}">${esc(b.name)} sneakers</a></li>`)
  .join('')}</ul></nav>`
const footerHtml = `<footer><p>${esc(DISCLOSURE)}</p><p>Contact: <a href="mailto:${CTA.email}">${CTA.email}</a></p></footer>`
const shell = (inner) => `<div id="seo-content" class="seo-content"><header><p><a href="/">${SITE.name}</a>: ${esc(SITE.tagline)}</p>${siteNav}</header><main>${inner}</main>${footerHtml}</div>`
const shoeLinks = (list) => `<ul>${list.map((s) => `<li><a href="${shoePath(s)}">${esc(clean(s.title))}</a>, ${inr(s.price_inr)}</li>`).join('')}</ul>`


// <title> for a shoe page: "Name – ₹price | Brand | IndianShoes", kept to about 65 characters and made unique
// (some brands reuse a name for several colours).
const usedTitles = new Set()
function shoeTitle(s, b) {
  let t = `${trunc(clean(s.title), 34)} – ${inr(s.price_inr)} | ${b.name}`
  if (t.length + 14 <= 68) t += ` | ${SITE.name}`
  for (let n = 2; usedTitles.has(t); n++) t = t.replace(/ \(\d+\)$/, '') + ` (${n})`
  usedTitles.add(t)
  return t
}

// ---------- pages ----------
const pages = []

// home
pages.push({
  path: '/',
  title: `${SITE.name}: ${SITE.tagline}`,
  description: `A 3D virtual sneaker store for Indian brands. Walk through ${brandNames}, see ${totalShoes} sneakers in 3D and buy on each brand's official site.`,
  og: ogFor(),
  ogAlt: `${SITE.name}: Indian sneaker brands in a 3D store`,
  ogType: 'website',
  jsonld: [
    {
      '@context': 'https://schema.org',
      '@graph': [
        organization,
        website,
        {
          '@type': 'WebPage',
          '@id': SITE.url + '/#webpage',
          url: SITE.url + '/',
          name: `${SITE.name}: ${SITE.tagline}`,
          isPartOf: { '@id': siteId },
          about: { '@id': orgId },
          inLanguage: SITE.lang,
        },
        {
          '@type': 'ItemList',
          name: 'Indian sneaker brands in the IndianShoes 3D store',
          itemListElement: brands.map((b, i) => ({ '@type': 'ListItem', position: i + 1, name: `${b.name} sneakers`, url: abs(b.path) })),
        },
      ],
    },
  ],
  body: shell(`
    <h1>${esc(SITE.tagline)}</h1>
    <p>${SITE.name} is a 3D virtual sneaker store for Indian brands. Scroll or swipe to walk through the store: each brand has its own logo block and bay with its sneakers on shelves. Tap any shoe to see its price and go to the brand's official website to buy it.</p>
    <p>${totalShoes} sneakers from ${brands.length} brands are on display today: ${esc(brandNames)}, with prices from ${inr(allMin)} to ${inr(allMax)}.</p>
    ${brands
      .map(
        (b) => `<section><h2><a href="${b.path}">${esc(b.name)} sneakers</a></h2><p>${esc(brandDescription(b))}</p>${shoeLinks(b.shoes.slice(0, 8))}<p><a href="${b.path}">See all ${b.shoes.length} ${esc(b.name)} sneakers</a></p></section>`,
      )
      .join('')}
    <section><h2>How the 3D store works</h2><p>Scroll, swipe, use the arrow keys or the bar at the bottom of the screen to move between brands. Click or tap a shoe to open its card with the price and a Buy button. The store works on phones, tablets and computers.</p></section>
    <section><h2>Get a 3D store for your brand</h2><p>${esc(CTA.text)} To ask about a 3D store for your sneaker or fashion brand, email <a href="mailto:${CTA.email}">${CTA.email}</a>.</p></section>`),
})

// brand hub
pages.push({
  path: '/brands',
  title: 'Indian sneaker brands in the 3D store | IndianShoes',
  description: trunc(`${brandNames}: Indian sneaker brands you can browse in 3D on IndianShoes, with ${totalShoes} sneakers from ${inr(allMin)} to ${inr(allMax)}.`, 158),
  og: ogFor(),
  ogAlt: 'Indian sneaker brands in the IndianShoes 3D store',
  ogType: 'website',
  jsonld: [
    {
      '@context': 'https://schema.org',
      '@graph': [
        crumbs([['Home', '/'], ['Brands', '/brands']]),
        {
          '@type': 'CollectionPage',
          '@id': SITE.url + '/brands#page',
          url: abs('/brands'),
          name: 'Indian sneaker brands in the 3D store',
          isPartOf: { '@id': siteId },
          inLanguage: SITE.lang,
          mainEntity: {
            '@type': 'ItemList',
            itemListElement: brands.map((b, i) => ({ '@type': 'ListItem', position: i + 1, name: `${b.name} sneakers`, url: abs(b.path) })),
          },
        },
      ],
    },
  ],
  body: shell(`
    ${crumbsHtml([['Home', '/'], ['Brands', '/brands']])}
    <h1>Indian sneaker brands in the 3D store</h1>
    <p>${brands.length} Indian brands are on display in the ${SITE.name} 3D store. Open a brand to see its sneakers, prices and where to buy.</p>
    <ul>${brands
      .map((b) => `<li><h2><a href="${b.path}">${esc(b.name)}</a></h2><p>${esc(brandDescription(b))}</p></li>`)
      .join('')}</ul>`),
})

// brands + shoes
for (const b of brands) {
  const faq = brandFaq(b)
  const brandUrl = abs(b.path)
  pages.push({
    path: b.path,
    title: `${b.name} sneakers in 3D: ${b.shoes.length} styles from ${inr(b.min)} | ${SITE.name}`,
    description: brandDescription(b),
    og: ogFor(b.id),
    ogAlt: `${b.name} sneakers in the ${SITE.name} 3D store`,
    ogType: 'website',
    jsonld: [
      {
        '@context': 'https://schema.org',
        '@graph': [
          crumbs([['Home', '/'], ['Brands', '/brands'], [b.name, b.path]]),
          {
            '@type': 'CollectionPage',
            '@id': brandUrl + '#page',
            url: brandUrl,
            name: `${b.name} sneakers in the ${SITE.name} 3D store`,
            description: brandDescription(b),
            isPartOf: { '@id': siteId },
            inLanguage: SITE.lang,
            about: { '@type': 'Brand', name: b.name, url: b.official },
            primaryImageOfPage: { '@type': 'ImageObject', url: abs(ogFor(b.id)), width: SITE.ogImage.width, height: SITE.ogImage.height },
            mainEntity: {
              '@type': 'ItemList',
              numberOfItems: b.shoes.length,
              itemListElement: b.shoes.map((s, i) => ({ '@type': 'ListItem', position: i + 1, name: clean(s.title), url: abs(shoePath(s)) })),
            },
          },
          {
            '@type': 'FAQPage',
            mainEntity: faq.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })),
          },
        ],
      },
    ],
    body: shell(`
      ${crumbsHtml([['Home', '/'], ['Brands', '/brands'], [b.name, b.path]])}
      <h1>${esc(b.name)} sneakers in the 3D store</h1>
      <p>${esc(brandDescription(b))}</p>
      <p>${esc(b.name)} makes ${esc(b.range)}. Official website: <a href="${b.official}" rel="noopener">${esc(b.official.replace(/^https?:\/\//, ''))}</a>.</p>
      ${['Women', 'Men']
        .map((g) => ({ g, list: b.shoes.filter((s) => s.gender === g) }))
        .filter((x) => x.list.length)
        .map((x) => `<section><h2>${esc(b.name)} ${x.g === 'Men' ? "men's" : "women's"} sneakers</h2>${shoeLinks(x.list)}</section>`)
        .join('')}
      <section><h2>${esc(b.name)} sneakers: common questions</h2><dl>${faq.map(([q, a]) => `<dt>${esc(q)}</dt><dd>${esc(a)}</dd>`).join('')}</dl></section>
      <p><a href="/brands">See all brands</a></p>`),
  })

  for (const s of b.shoes) {
    const url = abs(shoePath(s))
    const buy = buildAffiliateUrl(b.id, s)
    const desc = shoeDescription(s, b)
    const related = b.shoes.filter((x) => x.handle !== s.handle && x.gender === s.gender).slice(0, 6)
    pages.push({
      path: shoePath(s),
      title: shoeTitle(s, b),
      description: desc,
      og: ogFor(b.id),
      ogAlt: `${clean(s.title)} by ${b.name}`,
      ogType: 'product',
      jsonld: [
        {
          '@context': 'https://schema.org',
          '@graph': [
            crumbs([['Home', '/'], [b.name, b.path], [clean(s.title), shoePath(s)]]),
            {
              '@type': 'Product',
              '@id': url + '#product',
              name: clean(s.title),
              description: desc,
              sku: s.handle,
              category: 'Sneakers',
              image: [abs(s.image)],
              url,
              brand: { '@type': 'Brand', name: b.name },
              offers: {
                '@type': 'Offer',
                url: s.url,
                priceCurrency: 'INR',
                price: String(s.price_inr),
                seller: { '@type': 'Organization', name: b.name, url: b.official },
              },
            },
          ],
        },
      ],
      body: shell(`
        ${crumbsHtml([['Home', '/'], [b.name, b.path], [clean(s.title), shoePath(s)]])}
        <h1>${esc(clean(s.title))}</h1>
        <img src="${s.image}" alt="${esc(`${clean(s.title)}, a ${s.gender ? (s.gender === 'Men' ? "men's " : "women's ") : ''}${b.name} sneaker`)}" width="320" decoding="async" loading="lazy">
        <p>${esc(desc)}</p>
        <ul>
          <li>Brand: <a href="${b.path}">${esc(b.name)}</a></li>
          <li>Type: ${esc(s.type)}</li>
          ${s.gender ? `<li>For: ${s.gender}</li>` : ''}
          <li>Listed price: ${inr(s.price_inr)} (taken from ${esc(poss(b.name))} website; check there for the current price)</li>
          <li>In the 3D store: ${s.model ? '3D model you can look around' : 'photo on the shelf'}</li>
        </ul>
        <p><a href="${esc(buy)}" rel="sponsored noopener" target="_blank">Buy ${esc(clean(s.title))} on ${esc(poss(b.name))} official site</a></p>
        <section><h2>More ${esc(b.name)} ${s.gender ? (s.gender === 'Men' ? "men's " : "women's ") : ''}sneakers</h2>${shoeLinks(related)}</section>
        <p><a href="${b.path}">See all ${esc(b.name)} sneakers</a></p>`),
    })
  }
}

// ---------- write ----------
const template = fs.readFileSync(path.join(dist, 'index.html'), 'utf8')
if (!template.includes('<!--seo-head-->') || !template.includes('<!--seo-body-->')) {
  throw new Error('dist/index.html is missing the <!--seo-head--> / <!--seo-body--> markers (see store/index.html)')
}

function headFor(p) {
  const canonical = abs(p.path === '/' ? '/' : p.path)
  const img = abs(p.og)
  const t = esc(p.title)
  const d = esc(p.description)
  const alt = esc(p.ogAlt)
  const { width, height, type } = SITE.ogImage
  return [
    `<title>${t}</title>`,
    `<meta name="description" content="${d}" />`,
    p.noindex
      ? '<meta name="robots" content="noindex, follow" />'
      : '<meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1" />',
    `<link rel="canonical" href="${canonical}" />`,
    `<link rel="alternate" hreflang="${SITE.lang}" href="${canonical}" />`,
    `<link rel="alternate" hreflang="x-default" href="${canonical}" />`,
    `<meta property="og:site_name" content="${SITE.name}" />`,
    `<meta property="og:locale" content="${SITE.locale}" />`,
    `<meta property="og:type" content="${p.ogType}" />`,
    `<meta property="og:title" content="${t}" />`,
    `<meta property="og:description" content="${d}" />`,
    `<meta property="og:url" content="${canonical}" />`,
    `<meta property="og:image" content="${img}" />`,
    `<meta property="og:image:secure_url" content="${img}" />`,
    `<meta property="og:image:type" content="${type}" />`,
    `<meta property="og:image:width" content="${width}" />`,
    `<meta property="og:image:height" content="${height}" />`,
    `<meta property="og:image:alt" content="${alt}" />`,
    '<meta name="twitter:card" content="summary_large_image" />',
    `<meta name="twitter:title" content="${t}" />`,
    `<meta name="twitter:description" content="${d}" />`,
    `<meta name="twitter:image" content="${img}" />`,
    `<meta name="twitter:image:alt" content="${alt}" />`,
    ...(p.jsonld ?? []).map(jsonLd),
  ].join('\n    ')
}

const render = (p) =>
  template
    .replace(/<title>[^<]*<\/title>\s*/i, '')
    .replace('<!--seo-head-->', headFor(p))
    .replace('<!--seo-body-->', p.body)

for (const p of pages) {
  write(p.path === '/' ? 'index.html' : path.join(p.path, 'index.html'), render(p))
}

// 404 (Vercel serves /404.html for unknown URLs): not indexed, but useful to people
write(
  '404.html',
  render({
    path: '/404',
    title: `Page not found | ${SITE.name}`,
    description: `This page does not exist. Walk through the ${SITE.name} 3D sneaker store from the home page.`,
    og: ogFor(),
    ogAlt: `${SITE.name}: Indian sneaker brands in a 3D store`,
    ogType: 'website',
    noindex: true,
    body: shell(`<h1>Page not found</h1><p>We could not find that page. <a href="/">Go to the ${SITE.name} 3D store</a> or <a href="/brands">see all brands</a>.</p>`),
  }),
)

// sitemap
const urls = pages.map((p) => abs(p.path === '/' ? '/' : p.path))
write(
  'sitemap.xml',
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls
    .map((u) => `  <url><loc>${u}</loc><lastmod>${today}</lastmod></url>`)
    .join('\n')}\n</urlset>\n`,
)

// ---------- llms.txt / llms-full.txt (for AI search and assistants, https://llmstxt.org) ----------
// Plain markdown built from the same data as the pages. llms.txt is the short index; llms-full.txt lists every sneaker.
const range = (b) => `${inr(b.min)} to ${inr(b.max)}`
const aboutLines = [
  `${SITE.name} is a 3D virtual sneaker store for Indian brands: visitors walk through a store in their browser, see each brand's sneakers on shelves, and go to the brand's official website to buy. ${totalShoes} sneakers from ${brands.length} brands are on display (${brandNames}), priced from ${inr(allMin)} to ${inr(allMax)}.`,
]
const factLines = [
  `- Region and language: India, English. Prices are in Indian rupees (INR, ₹).`,
  `- ${SITE.name} is not a retailer and does not sell shoes. Purchases happen on each brand's official website.`,
  `- ${DISCLOSURE.split('. ').slice(1).join('. ')}`,
  `- Prices and shoe lists come from each brand's website as of the last store update (${today}). Prices change, so confirm the current price on the brand's own site.`,
  `- Contact: ${CTA.email}`,
]
const llms = [
  `# ${SITE.name}`,
  '',
  `> ${SITE.tagline}. ${aboutLines[0]}`,
  '',
  '## Key facts',
  '',
  ...factLines,
  '',
  '## Brands in the store',
  '',
  ...brands.map(
    (b) => `- [${b.name} sneakers](${abs(b.path)}): ${b.shoes.length} sneakers (${who(b)}), ${range(b)}. Official website: ${b.official}`,
  ),
  '',
  '## Main pages',
  '',
  `- [Home: the 3D store](${abs('/')}): the interactive store; each page below opens it at that brand or shoe`,
  `- [All brands](${abs('/brands')}): the brands on display`,
  `- [Sitemap](${abs('/sitemap.xml')}): every page, including one page per sneaker`,
  '',
  '## Optional',
  '',
  `- [Full catalogue](${abs('/llms-full.txt')}): every sneaker with its price, type, page and the brand's own product link, plus common questions per brand`,
  '',
].join('\n')
write('llms.txt', llms)

const llmsFull = [
  `# ${SITE.name}: full catalogue`,
  '',
  `> ${aboutLines[0]}`,
  '',
  '## Key facts',
  '',
  ...factLines,
  '',
  ...brands.flatMap((b) => [
    `## ${b.name}`,
    '',
    `${brandDescription(b)} ${b.name} makes ${b.range}. Official website: ${b.official}. Brand page: ${abs(b.path)}`,
    '',
    ...['Women', 'Men']
      .map((g) => ({ g, list: b.shoes.filter((x) => x.gender === g) }))
      .filter((x) => x.list.length)
      .flatMap((x) => [
        `### ${b.name} ${x.g === 'Men' ? "men's" : "women's"} sneakers`,
        '',
        ...x.list.map((x2) => `- [${clean(x2.title)}](${abs(shoePath(x2))}): ${inr(x2.price_inr)}, ${x2.type}. Buy on ${poss(b.name)} site: ${x2.url}`),
        '',
      ]),
    `### ${b.name}: common questions`,
    '',
    ...brandFaq(b).flatMap(([q, a]) => [`**${q}**`, a, '']),
  ]),
].join('\n')
write('llms-full.txt', llmsFull)

console.log(`prerender: ${pages.length} pages (+404), sitemap.xml with ${urls.length} URLs, llms.txt and llms-full.txt`)
