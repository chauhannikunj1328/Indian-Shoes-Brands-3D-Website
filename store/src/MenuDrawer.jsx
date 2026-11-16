import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { NAV, EMAIL, WHATSAPP_BASE, isSoon } from './content/pages.js'

// The menu button at the right end of the header, and the drawer it opens: every page of the site in groups.
// On phones the "For Brands" link is hidden from the header bar (CSS) and lives here instead.
// Links are normal <a href>: main.jsx turns them into no-reload page switches. The drawer closes when one is used.

function MenuIcon({ open }) {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
      {open ? (
        <path d="m6 6 12 12M18 6 6 18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      ) : (
        <path d="M4 7h16M4 12h16M4 17h16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      )}
    </svg>
  )
}

export default function MenuDrawer({ path = '/' }) {
  const [open, setOpen] = useState(false)
  const panel = useRef(null)
  const button = useRef(null)

  // while open: Escape closes it, and the wheel / keys do not reach the 3D store behind (it would walk on its own)
  useEffect(() => {
    if (!open) return
    const el = panel.current
    const stop = (e) => e.stopPropagation()
    const onKey = (e) => {
      if (e.key === 'Escape') setOpen(false)
      e.stopPropagation()
    }
    el.addEventListener('wheel', stop, { passive: true })
    el.addEventListener('keydown', onKey)
    el.querySelector('a, button')?.focus()
    return () => {
      el.removeEventListener('wheel', stop)
      el.removeEventListener('keydown', onKey)
      button.current?.focus({ preventScroll: true })
    }
  }, [open])

  return (
    <>
      <button
        ref={button}
        type="button"
        className="site-header__icon site-header__menu"
        aria-label={open ? 'Close the menu' : 'Open the menu'}
        aria-expanded={open}
        aria-controls="site-menu"
        onClick={() => setOpen((v) => !v)}
      >
        <MenuIcon open={false} />
      </button>
      {/* in <body>, not in the header: the header's blur effect would otherwise become the drawer's frame instead of the screen */}
      {createPortal(
      <div className={`menu-drawer${open ? ' is-open' : ''}`} aria-hidden={!open}>
        <div className="menu-drawer__veil" onClick={() => setOpen(false)} />
        <aside id="site-menu" className="menu-drawer__panel" ref={panel} role="dialog" aria-modal="true" aria-label="Menu" inert={!open}>
          <button type="button" className="menu-drawer__close" aria-label="Close the menu" onClick={() => setOpen(false)}>
            <MenuIcon open />
          </button>
          <nav aria-label="All pages" onClick={(e) => e.target.closest('a') && setOpen(false)}>
            {NAV.map((g) => (
              <div className="menu-drawer__group" key={g.h}>
                <p className="menu-drawer__heading">{g.h}</p>
                <ul>
                  {g.items.map(([label, href]) => (
                    <li key={href}>
                      <a href={href} aria-current={href === path ? 'page' : undefined}>
                        {label}
                        {isSoon(href) && <span className="menu-drawer__soon">Soon</span>}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </nav>
          <div className="menu-drawer__foot">
            <a className="info-btn info-btn--primary" href={`${WHATSAPP_BASE}?text=${encodeURIComponent("Hi! I'd like to know more about a 3D store for my brand on IndianShoes.")}`} target="_blank" rel="noopener">
              Message us on WhatsApp
            </a>
            <a className="menu-drawer__mail" href={`mailto:${EMAIL}`}>
              {EMAIL}
            </a>
          </div>
        </aside>
      </div>,
      document.body,
      )}
    </>
  )
}
