import { useState } from 'react'
import MusicToggle from './MusicToggle'
import MenuDrawer from './MenuDrawer'
import { INFO_PAGES, NAV, EMAIL, WHATSAPP_BASE, WHATSAPP_NUMBER, UPDATED } from './content/pages.js'

// The normal (non-3D) pages: /for-brands, /privacy, /terms. Text lives in src/content/pages.js, which the build also
// turns into crawlable HTML (scripts/prerender.mjs). No 3D code is loaded here, so these pages are light and fast.

const waHref = (text) => `${WHATSAPP_BASE}?text=${encodeURIComponent(text)}`
const mailHref = (subject, body) => `mailto:${EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`

function resolve(href) {
  if (href === 'whatsapp') return { href: waHref("Hi! I'd like to know more about a 3D store for my brand on IndianShoes."), external: true }
  if (href === 'email') return { href: mailHref('3D store for my brand', "Hi! I'd like to know more about a 3D store for my brand on IndianShoes.\n"), external: false }
  return { href, external: false }
}

function ContactForm({ h2 }) {
  const [f, setF] = useState({ name: '', brand: '', site: '', msg: '' })
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value })
  const text = [
    `Hi! I'm ${f.name || '(name)'} from ${f.brand || '(brand)'}${f.site ? ` (${f.site})` : ''}.`,
    f.msg || "I'd like to know more about a 3D store for my brand on IndianShoes.",
  ].join('\n')
  return (
    <section className="info-card info-contact" aria-labelledby="contact-h">
      <h2 id="contact-h">{h2}</h2>
      <p>Fill this in and send it by WhatsApp or email. We read it only when you send it; nothing is stored on this page.</p>
      <div className="info-fields">
        <label>
          Your name
          <input value={f.name} onChange={set('name')} autoComplete="name" />
        </label>
        <label>
          Brand
          <input value={f.brand} onChange={set('brand')} autoComplete="organization" />
        </label>
        <label>
          Website
          <input value={f.site} onChange={set('site')} inputMode="url" placeholder="https://" autoComplete="url" />
        </label>
        <label className="info-wide">
          Message
          <textarea rows="3" value={f.msg} onChange={set('msg')} />
        </label>
      </div>
      <div className="info-actions">
        <a className="info-btn info-btn--primary" href={waHref(text)} target="_blank" rel="noopener">
          Send on WhatsApp
        </a>
        <a className="info-btn" href={mailHref('3D store for my brand', text)}>
          Send by email
        </a>
      </div>
      <p className="info-small">
        WhatsApp {WHATSAPP_NUMBER} · <a href={`mailto:${EMAIL}`}>{EMAIL}</a>
      </p>
    </section>
  )
}

function Block({ b }) {
  switch (b.type) {
    case 'hero':
      return (
        <div className="info-hero">
          <p className="info-lead">{b.lead}</p>
          <div className="info-actions">
            {b.links.map((l) => {
              const r = resolve(l.href)
              return (
                <a key={l.label} className={`info-btn${l.primary ? ' info-btn--primary' : ''}`} href={r.href} {...(r.external ? { target: '_blank', rel: 'noopener' } : {})}>
                  {l.label}
                </a>
              )
            })}
          </div>
        </div>
      )
    case 'cards':
      return (
        <section>
          <h2>{b.h2}</h2>
          <div className="info-grid">
            {b.items.map((c) => (
              <div className="info-card" key={c.h3}>
                <h3>{c.h3}</h3>
                <p>{c.p}</p>
              </div>
            ))}
          </div>
        </section>
      )
    case 'steps':
      return (
        <section>
          <h2>{b.h2}</h2>
          <ol className="info-steps">
            {b.items.map((c) => (
              <li key={c.h3}>
                <h3>{c.h3}</h3>
                <p>{c.p}</p>
              </li>
            ))}
          </ol>
        </section>
      )
    case 'faq':
      return (
        <section>
          <h2>{b.h2}</h2>
          {b.items.map((x) => (
            <details className="info-faq" key={x.q}>
              <summary>{x.q}</summary>
              <p>{x.a}</p>
            </details>
          ))}
        </section>
      )
    case 'plans':
      return (
        <section>
          <h2>{b.h2}</h2>
          <div className="info-plans">
            {b.items.map((pl) => (
              <div className={`info-card info-plan${pl.featured ? ' info-plan--featured' : ''}`} key={pl.name}>
                <h3>{pl.name}</h3>
                <p className="info-plan__price">{pl.price}</p>
                <p className="info-small">{pl.note}</p>
                <ul>
                  {pl.list.map((li) => (
                    <li key={li}>{li}</li>
                  ))}
                </ul>
                <a className={`info-btn${pl.featured ? ' info-btn--primary' : ''}`} href="/pricing#contact-h">
                  Ask for a quote
                </a>
              </div>
            ))}
          </div>
        </section>
      )
    case 'table':
      return (
        <section>
          <h2>{b.h2}</h2>
          <div className="info-tablewrap">
            <table className="info-table">
              <thead>
                <tr>
                  {b.head.map((h) => (
                    <th key={h} scope="col">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {b.rows.map((r) => (
                  <tr key={r[0]}>
                    {r.map((c, i) => (i === 0 ? <th key={i} scope="row">{c}</th> : <td key={i}>{c}</td>))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {b.note && <p className="info-small">{b.note}</p>}
        </section>
      )
    case 'brands':
      return (
        <section>
          <h2>{b.h2}</h2>
          <div className="info-grid info-grid--brands">
            {b.items.map((it) => (
              <div className="info-card" key={it.name}>
                <h3>{it.name}</h3>
                <p>{it.p}</p>
                <p className="info-actions">
                  <a className="info-btn info-btn--primary" href={it.path}>
                    See it in 3D
                  </a>
                  {it.official && (
                    <a className="info-btn" href={it.official} target="_blank" rel="noopener">
                      Official website
                    </a>
                  )}
                </p>
              </div>
            ))}
          </div>
        </section>
      )
    case 'contact':
      return <ContactForm h2={b.h2} />
    default:
      return (
        <section>
          <h2>{b.h2}</h2>
          {b.paragraphs?.map((p) => (
            <p key={p}>{p}</p>
          ))}
          {b.list && (
            <ul>
              {b.list.map((li) => (
                <li key={li}>{li}</li>
              ))}
            </ul>
          )}
        </section>
      )
  }
}

export default function InfoPage({ path }) {
  const page = INFO_PAGES[path]
  const date = page.updated ? new Date(page.updated).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }) : null
  return (
    <div className="info-page">
      {/* the same floating glass header as the 3D store: wordmark left, "For Brands" (text) and the black "Get a 3D store" button right */}
      <header className="site-header">
        <a className="site-header__logo" href="/" aria-label="IndianShoes: back to the 3D store">
          <span lang="hi" className="site-header__word site-header__word--hi">
            इंडियन
          </span>
          <span lang="en" className="site-header__word site-header__word--en">
            Shoes
          </span>
        </a>
        <nav className="site-header__actions" aria-label="Main">
          <MusicToggle />
          <a className={`site-header__cta${path === '/for-brands' ? ' is-active' : ''}`} href="/for-brands" aria-current={path === '/for-brands' ? 'page' : undefined}>
            For Brands
          </a>
          <a className="site-header__enquire" href="/contact">
            <span className="site-header__enquire-long">Get a 3D store</span>
            <span className="site-header__enquire-short">Get a store</span>
          </a>
          <MenuDrawer path={path} />
        </nav>
      </header>
      <main className="info-main">
        <nav aria-label="Breadcrumb" className="info-crumbs">
          <a href="/">Home</a> <span aria-hidden="true">/</span> <span aria-current="page">{page.crumb}</span>
        </nav>
        <h1>{page.h1}</h1>
        {date && <p className="info-small">Last updated {date}</p>}
        {page.blocks.map((b, i) => (
          <Block b={b} key={i} />
        ))}
      </main>
      <footer className="info-footer">
        <p>
          IndianShoes does not sell shoes. Some links are affiliate links: we may earn a commission if you buy through them, at no extra cost to you.
        </p>
        <nav aria-label="Footer">
          {NAV.flatMap((g) => g.items).map(([label, href]) => (
            <a key={href} href={href}>
              {label}
            </a>
          ))}
          <a href={`mailto:${EMAIL}`}>{EMAIL}</a>
        </nav>
        <p className="info-small">© {new Date(UPDATED).getFullYear()} IndianShoes</p>
      </footer>
    </div>
  )
}
