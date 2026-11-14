import { useEffect, useRef, useState } from 'react'
import { useProgress } from '@react-three/drei'
import { INTRO } from './brands'

// Intro / loading screen that plays while the 3D store loads underneath it.
//   Screen 1  six logos (3 Comet + 3 Gully Labs) enter from the left riding a wave
//   Screen 2  the wave closes into a rotating ring
//   Screen 3  the ring opens back into a wave and the logos leave to the right
//   Screen 4  your logo in the centre; big % number + small loading bar at the bottom middle
// The % follows the real loading progress of the store (all models and textures). The overlay fades
// out once loading is done and the intro has played. All motion runs on one requestAnimationFrame loop
// writing transforms straight to the elements (no React re-render per frame).

const T_WAVE_IN = 2.0 // screen 1 length (s)
const T_RING = 2.6 // screen 2 length
const T_WAVE_OUT = 1.5 // screen 3 length
const T_LOADER_IN = T_WAVE_IN + T_RING + T_WAVE_OUT - 0.3 // screen 4 starts as the logos leave
const MIN_COUNT = 1.1 // the number never counts to 100 faster than this (s)

const clamp01 = (v) => Math.min(1, Math.max(0, v))
const smooth = (v) => {
  const t = clamp01(v)
  return t * t * (3 - 2 * t)
}
const easeOut = (t) => 1 - Math.pow(1 - clamp01(t), 3)
const easeIn = (t) => Math.pow(clamp01(t), 3)
const lerp = (a, b, t) => a + (b - a) * t

export default function Intro() {
  const { progress } = useProgress()
  const progressRef = useRef(0)
  progressRef.current = progress

  const [done, setDone] = useState(false)
  const root = useRef(null)
  const logoEls = useRef([])
  const center = useRef(null)
  const loader = useRef(null)
  const number = useRef(null)
  const bar = useRef(null)

  useEffect(() => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const start = performance.now() - (reduce ? T_LOADER_IN * 1000 : 0)
    let shown = 0 // the number on screen (only ever goes up)
    let finishedAt = null
    let raf

    const frame = (now) => {
      // dev only: window.__introT = 3 freezes the intro at 3 s (for checking each screen)
      const frozen = import.meta.env.DEV ? window.__introT : undefined
      const t = frozen ?? (now - start) / 1000
      const w = window.innerWidth
      const h = window.innerHeight
      const sp = Math.min(w * 0.14, 200) // gap between logos on the wave
      const amp = Math.min(h * 0.07, 60) // wave height
      const R = Math.min(w * 0.32, 380) // ring radius (wide)
      const r = R * 0.38 // ring radius (tall) - an ellipse, like a ring seen at an angle

      // how far we are into each screen
      const kRing = smooth((t - T_WAVE_IN) / 0.7) // wave -> ring
      const tOut = T_WAVE_IN + T_RING
      const kOut = smooth((t - tOut) / 0.45) // ring -> wave
      const ring = kRing * (1 - kOut)

      // the whole wave travels: in from the left, then out to the right
      const baseX = t < tOut ? lerp(-w * 0.85, 0, easeOut(t / T_WAVE_IN)) : lerp(0, w * 1.05, easeIn((t - tOut) / T_WAVE_OUT))

      logoEls.current.forEach((el, i) => {
        if (!el) return
        // wave position
        const wx = baseX + (i - 2.5) * sp
        const phase = (wx / (sp * 3.2)) * Math.PI * 2 - t * 4
        const wy = Math.sin(phase) * amp
        const tilt = Math.atan(Math.cos(phase) * amp * ((Math.PI * 2) / (sp * 3.2))) * 0.6
        // ring position (rotating)
        const a = (t - T_WAVE_IN) * 1.5 + (i * Math.PI * 2) / 6 + Math.PI / 2
        const rx = Math.cos(a) * R
        const ry = Math.sin(a) * r
        const depth = (Math.sin(a) + 1) / 2 // 0 back .. 1 front
        // blend
        const x = lerp(wx, rx, ring)
        const y = lerp(wy, ry, ring)
        const scale = lerp(1, 0.7 + 0.45 * depth, ring)
        const rot = lerp(tilt, 0, ring)
        const fade = Math.min(smooth((t - 0.05) / 0.4), 1 - smooth((x - w * 0.42) / (w * 0.12)))
        el.style.transform = `translate(-50%, -50%) translate(${x}px, ${y}px) rotate(${rot}rad) scale(${scale})`
        el.style.opacity = String(Math.max(0, fade) * lerp(1, 0.55 + 0.45 * depth, ring))
        el.style.zIndex = String(Math.round(lerp(1, 1 + depth * 10, ring)))
      })

      // screen 4: logo + loader
      const k4 = smooth((t - T_LOADER_IN) / 0.6)
      if (center.current) {
        center.current.style.opacity = String(k4)
        center.current.style.transform = `translate(-50%, -50%) scale(${lerp(0.85, 1, k4)})`
      }
      if (loader.current) loader.current.style.opacity = String(k4)
      if (t >= T_LOADER_IN) {
        const timeCap = clamp01((t - T_LOADER_IN) / MIN_COUNT) * 100
        const target = Math.min(progressRef.current, timeCap)
        shown = Math.max(shown, shown + (target - shown) * 0.12)
        if (target >= 100 && shown > 99.5) shown = 100
        if (number.current) number.current.textContent = `${Math.floor(shown)}%`
        if (bar.current) bar.current.style.transform = `scaleX(${shown / 100})`
        if (shown >= 100 && finishedAt === null) finishedAt = t
      }

      // fade the whole overlay away once loading is complete
      if (finishedAt !== null && root.current) {
        const k = smooth((t - finishedAt - 0.35) / 0.7)
        root.current.style.opacity = String(1 - k)
        if (k >= 1) {
          setDone(true)
          return
        }
      }
      raf = requestAnimationFrame(frame)
    }
    raf = requestAnimationFrame(frame)
    return () => cancelAnimationFrame(raf)
  }, [])

  if (done) return null
  const logos = Array.from({ length: 6 }, (_, i) => INTRO.logos[i % INTRO.logos.length])
  return (
    <div
      className="intro"
      ref={root}
      aria-label="Loading the store"
      role="status"
      style={INTRO.background ? { backgroundImage: `url(${INTRO.background})` } : undefined}
    >
      <div className="intro__stage">
        {logos.map((l, i) => (
          <div
            key={i}
            ref={(el) => (logoEls.current[i] = el)}
            className="intro__logo"
            style={{ width: l.width, aspectRatio: l.aspect, backgroundColor: l.color, WebkitMaskImage: `url(${l.src})`, maskImage: `url(${l.src})` }}
            aria-hidden="true"
          />
        ))}
        <div className="intro__center" ref={center}>
          {INTRO.siteLogo ? (
            <img src={INTRO.siteLogo} alt={INTRO.siteName} />
          ) : (
            <span className="intro__wordmark" aria-label={INTRO.siteName}>
              {(INTRO.wordmark || [{ text: INTRO.siteName }]).map((part, i) => (
                <span key={i} lang={part.lang} className={`intro__word intro__word--${part.lang || 'en'}`}>
                  {part.text}
                </span>
              ))}
            </span>
          )}
        </div>
      </div>
      <div className="intro__loader" ref={loader}>
        <div className="intro__number" ref={number}>
          0%
        </div>
        <div className="intro__track">
          <div className="intro__bar" ref={bar} />
        </div>
      </div>
    </div>
  )
}
