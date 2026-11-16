import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { useFrame, useThree } from '@react-three/fiber'
import { STOPS, SEGMENTS, getTarget, nudge, goTo, goToInstant, next, prev, consumeSnap } from './tour'

// Moves the camera along the tour (stops defined in tour.js).
// Inputs: mouse wheel / trackpad / touch swipe = glide;
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

export default function ScrollCamera() {
  const progress = useRef(0) // smoothed position along the tour, 0..1
  const pos = useRef(new THREE.Vector3())
  const look = useRef(new THREE.Vector3())
  const canvas = useThree((s) => s.gl.domElement)

  useEffect(() => {
    const onWheel = (e) => {
      e.preventDefault()
      nudge(e.deltaY + e.deltaX) // vertical or horizontal trackpad swipes both move the tour
    }
    let touchY = null
    let swiped = false
    const onTouchStart = (e) => {
      touchY = e.touches[0].clientY
      swiped = false
    }
    const onTouchMove = (e) => {
      if (touchY === null) return
      const y = e.touches[0].clientY
      if (Math.abs(touchY - y) > 2) swiped = true
      nudge((touchY - y) * 2.5) // swipe up = go forward
      touchY = y
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
    window.addEventListener('keydown', onKey)

    // dev only: drive the tour from the console for testing
    //   window.__storeStop(n)  -> go to stop n (0 = start)     window.__storeStops -> list of stop names
    if (import.meta.env.DEV || window.location.search.includes('debug3d')) {
      window.__storeStop = goTo
      window.__storeStopNow = goToInstant // jump with no travel (for screenshots)
      window.__storeStops = STOPS.map((s, n) => `${n}: ${s.name}`)
    }
    return () => {
      window.removeEventListener('wheel', onWheel)
      window.removeEventListener('touchstart', onTouchStart)
      window.removeEventListener('touchmove', onTouchMove)
      window.removeEventListener('keydown', onKey)
    }
  }, [canvas])

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
