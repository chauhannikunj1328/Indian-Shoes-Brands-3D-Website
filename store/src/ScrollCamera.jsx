import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { useFrame, useThree } from '@react-three/fiber'
import { STOPS, SEGMENTS, getTarget, nudge, goTo, goToInstant, next, prev, consumeSnap } from './tour'

// Moves the camera along the tour (stops defined in tour.js).
// Inputs: mouse wheel / trackpad / touch swipe (up-down or left-right) / mouse press-and-drag = glide (a plain click does nothing);
// arrow keys, Space, Page Up/Down = next / previous stop; Home / End = first / last stop.
// Between two stops the camera eases in and out, so it settles at each stop.

const DAMPING = 4 // higher = camera catches up faster
const ease = (f) => f * f * (3 - 2 * f) // zero speed at each stop

// Responsive framing. The stops in tour.js are placed for a landscape screen (vertical fov 55). On a narrow
// (portrait / phone) screen the horizontal view shrinks, so the camera would sit far too close. So:
//  - the vertical fov widens from FOV_LANDSCAPE to FOV_PORTRAIT as the screen gets narrower, and
//  - if the view is still narrower than MIN_COVER world units at the target, the camera backs off along its own
//    line of sight (at most MAX_BACKOFF times the stop's distance) until it covers that much width.
// Landscape screens are left exactly as before.
const FOV_LANDSCAPE = 55
const FOV_PORTRAIT = 72
const ASPECT_WIDE = 1.2 // at this aspect or wider: no change
const ASPECT_NARROW = 0.5 // at this aspect or narrower: full portrait fov
const MIN_COVER = 9.5 // world units of width we want to see at the target (a whole block, or half a shoe wall, + margin)
const MAX_BACKOFF = 1.6

export default function ScrollCamera({ enabled = true }) {
  const progress = useRef(getTarget()) // smoothed position along the tour, 0..1
  const pos = useRef(new THREE.Vector3())
  const look = useRef(new THREE.Vector3())
  const canvas = useThree((s) => s.gl.domElement)

  useEffect(() => {
    if (!enabled) return // another page (For Brands...) is on top: leave the wheel, keys and drags to it
    const onWheel = (e) => {
      e.preventDefault()
      nudge(e.deltaY + e.deltaX) // vertical or horizontal trackpad swipes both move the tour
    }
    // Touch: swipe up OR left = forward, down OR right = back. The first few pixels of a swipe decide which way it goes
    // (up/down or left/right) and it keeps to that, so a slightly diagonal swipe does not jitter.
    let touch = null // { x, y, axis } while a finger is down
    let swiped = false
    const onTouchStart = (e) => {
      touch = { x: e.touches[0].clientX, y: e.touches[0].clientY, axis: null }
      swiped = false
    }
    const onTouchMove = (e) => {
      if (!touch) return
      const x = e.touches[0].clientX
      const y = e.touches[0].clientY
      const dx = touch.x - x
      const dy = touch.y - y
      if (!touch.axis) {
        if (Math.hypot(dx, dy) < 6) return
        touch.axis = Math.abs(dx) > Math.abs(dy) ? 'x' : 'y'
      }
      swiped = true
      nudge((touch.axis === 'x' ? dx : dy) * 2.5)
      touch.x = x
      touch.y = y
    }
    const onTouchEnd = () => {
      touch = null
    }
    // Mouse: press, hold and drag to move along the tour (drag left or up = forward, right or down = back).
    // A plain click moves nothing; a click that ends a drag is swallowed so it cannot open a shoe or button by accident.
    let drag = null // { x, y, moved } while the mouse button is down on the scene
    let justDragged = false
    const DRAG_START = 5 // px of movement before it counts as a drag
    const onPointerDown = (e) => {
      if (e.pointerType !== 'mouse' || e.button !== 0) return
      drag = { x: e.clientX, y: e.clientY, moved: false }
    }
    const onPointerMove = (e) => {
      if (!drag || e.pointerType !== 'mouse') return
      const dx = e.clientX - drag.x
      const dy = e.clientY - drag.y
      if (!drag.moved) {
        if (Math.hypot(dx, dy) < DRAG_START) return
        drag.moved = true
        canvas.style.cursor = 'grabbing'
      }
      nudge(-(dx + dy) * 2.5)
      drag.x = e.clientX
      drag.y = e.clientY
    }
    const onPointerUp = () => {
      if (!drag) return
      if (drag.moved) {
        justDragged = true
        setTimeout(() => (justDragged = false), 0)
        canvas.style.cursor = ''
      }
      drag = null
    }
    const swallowClickAfterDrag = (e) => {
      if (justDragged) {
        e.stopPropagation()
        e.preventDefault()
      }
    }
    const onKey = (e) => {
      if (['ArrowDown', 'ArrowRight', 'PageDown', ' '].includes(e.key)) next()
      if (['ArrowUp', 'ArrowLeft', 'PageUp'].includes(e.key)) prev()
      if (e.key === 'Home') goTo(0)
      if (e.key === 'End') goTo(SEGMENTS)
    }
    window.addEventListener('wheel', onWheel, { passive: false })
    window.addEventListener('touchstart', onTouchStart, { passive: true })
    window.addEventListener('touchmove', onTouchMove, { passive: true })
    window.addEventListener('touchend', onTouchEnd, { passive: true })
    window.addEventListener('touchcancel', onTouchEnd, { passive: true })
    window.addEventListener('keydown', onKey)
    canvas.addEventListener('pointerdown', onPointerDown)
    window.addEventListener('pointermove', onPointerMove)
    window.addEventListener('pointerup', onPointerUp)
    window.addEventListener('pointercancel', onPointerUp)
    window.addEventListener('click', swallowClickAfterDrag, true)

    // dev only: drive the tour from the console for testing
    //   window.__storeStop(n)  -> go to stop n (0 = start)     window.__storeStops -> list of stop names
    if (import.meta.env.DEV || window.location.search.includes('debug3d')) {
      window.__storeStop = goTo
      window.__storeTarget = () => getTarget() // where the tour is heading, 0..1
      window.__storeStopNow = goToInstant // jump with no travel (for screenshots)
      window.__storeStops = STOPS.map((s, n) => `${n}: ${s.name}`)
    }
    return () => {
      window.removeEventListener('wheel', onWheel)
      window.removeEventListener('touchstart', onTouchStart)
      window.removeEventListener('touchmove', onTouchMove)
      window.removeEventListener('touchend', onTouchEnd)
      window.removeEventListener('touchcancel', onTouchEnd)
      window.removeEventListener('keydown', onKey)
      canvas.removeEventListener('pointerdown', onPointerDown)
      window.removeEventListener('pointermove', onPointerMove)
      window.removeEventListener('pointerup', onPointerUp)
      window.removeEventListener('pointercancel', onPointerUp)
      window.removeEventListener('click', swallowClickAfterDrag, true)
    }
  }, [canvas, enabled])

  const size = useThree((s) => s.size)
  const dir = useRef(new THREE.Vector3())

  useFrame(({ camera }, dt) => {
    if (consumeSnap()) progress.current = getTarget() // opened on a brand / shoe URL: start there, don't glide
    progress.current = THREE.MathUtils.damp(progress.current, getTarget(), DAMPING, dt)
    const s = progress.current * SEGMENTS
    const i = Math.min(Math.floor(s), SEGMENTS - 1)
    const f = ease(s - i)
    pos.current.lerpVectors(STOPS[i].pos, STOPS[i + 1].pos, f)
    look.current.lerpVectors(STOPS[i].look, STOPS[i + 1].look, f)
    // dev only: window.__camOverride = { pos: [x, y, z], look: [x, y, z] } freezes the camera there (for screenshots)
    const o = import.meta.env.DEV && window.__camOverride
    if (o) {
      camera.position.set(...o.pos)
      camera.lookAt(...o.look)
      return
    }
    // responsive framing (see the constants above)
    const aspect = size.width / Math.max(1, size.height)
    const t = THREE.MathUtils.clamp((ASPECT_WIDE - aspect) / (ASPECT_WIDE - ASPECT_NARROW), 0, 1)
    const fov = THREE.MathUtils.lerp(FOV_LANDSCAPE, FOV_PORTRAIT, t)
    if (camera.fov !== fov) {
      camera.fov = fov
      camera.updateProjectionMatrix()
    }
    dir.current.subVectors(pos.current, look.current)
    const dist = dir.current.length()
    const cover = 2 * dist * Math.tan(THREE.MathUtils.degToRad(fov / 2)) * aspect
    const k = cover < MIN_COVER ? Math.min(MAX_BACKOFF, MIN_COVER / cover) : 1
    camera.position.copy(look.current).addScaledVector(dir.current, k)
    camera.lookAt(look.current)
  })

  return null
}
