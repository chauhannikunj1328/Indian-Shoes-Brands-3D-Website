import { Fragment, useSyncExternalStore } from 'react'
import { BRANDS, CTA_LABEL } from './brands'
import { STOPS, SEGMENTS, subscribe, currentStop, next, prev, goTo } from './tour'

// Bottom glass tab bar: ‹ · [brand tab · ● ● ●] per brand · highlighted CTA button · ›
// Brand tabs jump to that brand's logo block and light up while you're in that brand's part of the tour.
// The three dots after each tab jump to that brand's three bay walls (left, shoe wall, right).
// The CTA button jumps to the final call-to-action wall. Built from BRANDS, so new brands get a tab + dots.

const firstStopOf = (id) => STOPS.findIndex((s) => s.name.startsWith(`${id}:`))
const stopIndex = (name) => STOPS.findIndex((s) => s.name === name)
const WALLS = [
  { key: 'left', label: 'left wall' },
  { key: 'back', label: 'shoe wall' },
  { key: 'right', label: 'right wall' },
]
const BRAND_TABS = BRANDS.map((b) => ({
  id: b.id,
  label: b.tabLabel ?? b.name,
  start: firstStopOf(b.id), // first stop of this brand (its logo block)
  walls: WALLS.map((w) => ({ ...w, stop: stopIndex(`${b.id}:${w.key}`) })),
}))
const CTA_STOP = STOPS.findIndex((s) => s.name === 'cta')

function activeBrand(stop) {
  if (stop === CTA_STOP) return null
  let active = BRAND_TABS[0].id // the start view looks at the first brand's block
  for (const t of BRAND_TABS) if (stop >= t.start) active = t.id
  return active
}

export default function TourNav() {
  const stop = useSyncExternalStore(subscribe, currentStop)
  const active = activeBrand(stop)
  const atCta = stop === CTA_STOP

  return (
    <nav className="tour-nav" aria-label="Store navigation">
      <button type="button" className="tour-nav__arrow" onClick={prev} disabled={stop === 0} aria-label="Previous stop">
        ‹
      </button>
      {BRAND_TABS.map((t) => (
        <Fragment key={t.id}>
          <button
            type="button"
            className={`tour-nav__tab${active === t.id ? ' is-active' : ''}`}
            aria-current={active === t.id ? 'true' : undefined}
            onClick={() => goTo(t.start)}
          >
            {t.label}
          </button>
          <span className="tour-nav__dots">
            {t.walls.map((w) => (
              <button
                key={w.key}
                type="button"
                className={`tour-nav__dot${stop === w.stop ? ' is-active' : ''}`}
                aria-label={`${t.label} ${w.label}`}
                title={`${t.label} · ${w.label}`}
                aria-current={stop === w.stop ? 'true' : undefined}
                onClick={() => goTo(w.stop)}
              />
            ))}
          </span>
        </Fragment>
      ))}
      <button
        type="button"
        className={`tour-nav__cta${atCta ? ' is-active' : ''}`}
        onClick={() => goTo(CTA_STOP)}
      >
        {CTA_LABEL}
      </button>
      <button
        type="button"
        className="tour-nav__arrow"
        onClick={next}
        disabled={stop === SEGMENTS}
        aria-label="Next stop"
      >
        ›
      </button>
    </nav>
  )
}
