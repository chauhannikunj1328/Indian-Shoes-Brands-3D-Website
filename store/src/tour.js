import * as THREE from 'three'
import { BRANDS, BAY_DEPTH, CORRIDOR_DEPTH, CTA_WALL, brandSlots } from './brands'

// The store tour: a list of camera STOPS (following the user's camera-path sketch) plus the
// shared "where are we" state. Scroll, keys, clicks and the on-screen buttons all move it;
// ScrollCamera.jsx turns it into camera movement.
//
// Per brand (left to right):
//   middle  - on the walkway, facing the logo block straight on
//   turn    - at the bay's left edge on the walkway, turning into the bay
//   left    - inside the bay, looking at the bay's left wall
//   back    - in front of the bay, looking at the back wall (where the shoes hang)
//   right   - inside the bay, looking at the bay's right wall
//   exit    - back on the walkway, looking along it to the next brand ("again start")
// The tour opens on the first block's corner view and ends on the CTA: the walkway part of the end wall.

const EYE = 4 // camera eye height
const WALK_Z = CORRIDOR_DEPTH - 4 // walkway line the camera travels along
const LOGO_Y = 4 // height the camera looks at on the logo blocks
const WALL_Y = 3.4 // height the camera looks at on bay walls
const SIDE_VIEW_DIST = 11 // how far from a bay side wall the camera stands to show all of it
const BACK_VIEW_DIST = 13 // how far from the back wall the camera stands to show all of it
const END_VIEW_DIST = 11 // how far from the end wall the last (CTA) camera stands; fits the walkway part
const EDGE = 1.5 // how far inside a bay edge the camera turns

// On a narrow (portrait / phone) screen a whole 20-unit back wall would make the shoes tiny, so each bay's back wall
// is shown in two stops: its left half (stop name `<brand>:back`) then its right half (`<brand>:back2`).
// Decided once when the page loads; ScrollCamera.jsx widens the view and backs the camera off to fit either way.
const PORTRAIT = typeof window !== 'undefined' && window.innerWidth / Math.max(1, window.innerHeight) < 0.9

const v = (x, y, z) => new THREE.Vector3(x, y, z)
const stop = (name, pos, look) => ({ name, pos, look })

function buildStops() {
  const stops = []
  const first = brandSlots(0).block

  // Start: on the 45° diagonal of the first block's front-left corner, looking at the block's
  // centre, so its side face and logo face show at equal size.
  const cornerDist = 8
  stops.push(stop('start', v(first.x0 - cornerDist, EYE, cornerDist), v(first.cx, WALL_Y, -BAY_DEPTH / 2)))

  BRANDS.forEach((brand, i) => {
    const { block, bay } = brandSlots(i)
    const sideZ = -BAY_DEPTH / 2 // centre of the bay's side walls
    const isLast = i === BRANDS.length - 1

    stops.push(stop(`${brand.id}:middle`, v(block.cx, EYE, WALK_Z), v(block.cx, LOGO_Y, 0)))
    stops.push(stop(`${brand.id}:turn`, v(bay.x0 + EDGE, EYE, WALK_Z), v(bay.x0 + EDGE, WALL_Y, -BAY_DEPTH)))
    stops.push(stop(`${brand.id}:left`, v(bay.x0 + SIDE_VIEW_DIST, EYE, sideZ), v(bay.x0, WALL_Y, sideZ)))
    if (PORTRAIT) {
      const quarter = (bay.x1 - bay.x0) / 4
      for (const [name, bx] of [['back', bay.cx - quarter], ['back2', bay.cx + quarter]]) {
        stops.push(stop(`${brand.id}:${name}`, v(bx, EYE, -BAY_DEPTH + BACK_VIEW_DIST), v(bx, WALL_Y, -BAY_DEPTH)))
      }
    } else {
      stops.push(stop(`${brand.id}:back`, v(bay.cx, EYE, -BAY_DEPTH + BACK_VIEW_DIST), v(bay.cx, WALL_Y, -BAY_DEPTH)))
    }
    stops.push(stop(`${brand.id}:right`, v(bay.x1 - SIDE_VIEW_DIST, EYE, sideZ), v(bay.x1, WALL_Y, sideZ)))

    if (!isLast) {
      // "Again start with new brand": back on the walkway, looking ahead at the next logo block.
      const next = brandSlots(i + 1).block
      stops.push(stop(`${brand.id}:exit`, v(bay.x1 - EDGE, EYE, WALK_Z), v(next.cx, LOGO_Y, 0)))
    } else {
      // Last stop: the walkway part of the store's end wall, where the call-to-action (CTA) is shown.
      stops.push(stop('cta', v(bay.x1 - END_VIEW_DIST, EYE, CTA_WALL.z), v(bay.x1, CTA_WALL.y, CTA_WALL.z)))
    }
  })
  return stops
}

export const STOPS = buildStops()
export const SEGMENTS = STOPS.length - 1
const SCROLL_PER_STOP = 700 // wheel/touch pixels to go from one stop to the next
const SCROLL_DISTANCE = SEGMENTS * SCROLL_PER_STOP

// ---- shared tour state: target = where the tour wants to be, 0 (start) .. 1 (end) ----
const state = { target: 0 }
const listeners = new Set()
const emit = () => listeners.forEach((fn) => fn())

export const getTarget = () => state.target
export const currentStop = () => Math.round(state.target * SEGMENTS) // index of the nearest stop
export function subscribe(fn) {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

// free movement (scroll / swipe), in wheel pixels
export function nudge(pixels) {
  state.target = THREE.MathUtils.clamp(state.target + pixels / SCROLL_DISTANCE, 0, 1)
  emit()
}
// jump to a stop (clicks, keys, buttons)
export function goTo(n) {
  state.target = THREE.MathUtils.clamp(n, 0, SEGMENTS) / SEGMENTS
  emit()
}
export const next = () => goTo(currentStop() + 1)
export const prev = () => goTo(currentStop() - 1)
