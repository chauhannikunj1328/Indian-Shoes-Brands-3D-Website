import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { useFrame, useThree } from '@react-three/fiber'
import { STOPS, SEGMENTS, getTarget, nudge, goTo, next, prev } from './tour'

// Moves the camera along the tour (stops defined in tour.js).
// Inputs: mouse wheel / trackpad / touch swipe = glide; click or tap on the scene = next stop;
// arrow keys, Space, Page Up/Down = next / previous stop; Home / End = first / last stop.
// Between two stops the camera eases in and out, so it settles at each stop.

const DAMPING = 4 // higher = camera catches up faster
const ease = (f) => f * f * (3 - 2 * f) // zero speed at each stop

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
    // click / tap on the scene = next stop (a swipe that ends on the scene doesn't count as a tap)
    const onClick = () => {
      if (swiped) return (swiped = false)
      next()
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
    canvas.addEventListener('click', onClick)

    // dev only: drive the tour from the console for testing
    //   window.__storeStop(n)  -> go to stop n (0 = start)     window.__storeStops -> list of stop names
    if (import.meta.env.DEV) {
      window.__storeStop = goTo
      window.__storeStops = STOPS.map((s, n) => `${n}: ${s.name}`)
    }
    return () => {
      window.removeEventListener('wheel', onWheel)
      window.removeEventListener('touchstart', onTouchStart)
      window.removeEventListener('touchmove', onTouchMove)
      window.removeEventListener('keydown', onKey)
      canvas.removeEventListener('click', onClick)
    }
  }, [canvas])

  useFrame(({ camera }, dt) => {
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
    camera.position.copy(pos.current)
    camera.lookAt(look.current)
  })

  return null
}
