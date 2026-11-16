// Deep links: the build (scripts/prerender.mjs) makes a real page for /<brand> and /<brand>/<shoe>. When one of
// those URLs loads, the 3D store starts at that brand's logo block, or on the wall holding that shoe with its card open.
import { BRANDS } from './brands'
import { STOPS, goToInstant } from './tour'
import { selectShoe } from './ProductCard'

const stopIndex = (name) => STOPS.findIndex((s) => s.name === name)

// which tour stop looks at which shelf wall (see BayShelves in Store.jsx and tour.js; phones split the back wall in two)
function stopForWall(brandId, wall) {
  if (wall === 'left') return stopIndex(`${brandId}:left`)
  if (wall === 'right') return stopIndex(`${brandId}:right`)
  const back2 = stopIndex(`${brandId}:back2`)
  if (wall === 'backRight' && back2 >= 0) return back2
  if (wall === 'backLeft' || wall === 'backRight') return stopIndex(`${brandId}:back`)
  return -1
}

export async function applyRoute() {
  const [brandId, handle] = window.location.pathname.split('/').filter(Boolean)
  const brand = BRANDS.find((b) => b.id === brandId)
  if (!brand) return
  const start = stopIndex(`${brandId}:middle`)
  if (start >= 0) goToInstant(start)
  if (!handle) return
  for (const [wall, cfg] of Object.entries(brand.bay.shelves)) {
    try {
      const items = await (await fetch(cfg.list)).json()
      const item = items.find((it) => it.handle === handle)
      if (!item) continue
      const stop = stopForWall(brandId, wall)
      if (stop >= 0) goToInstant(stop)
      if (item.url) selectShoe({ brand: brandId, brandName: brand.tabLabel ?? brand.name, item })
      return
    } catch {
      /* a failed lookup just leaves the camera at the brand's logo block */
    }
  }
}
