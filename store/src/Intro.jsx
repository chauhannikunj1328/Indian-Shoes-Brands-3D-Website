import { useEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import { useProgress } from '@react-three/drei'
import { AnimatePresence, motion, useMotionValue, useSpring, useTransform } from 'framer-motion'
import { INTRO } from './brands'

// Intro / loading screen that plays while the 3D store loads underneath it.
//
// Logos (WebGL, plain three.js): six white logos (3 Comet + 3 Gully Labs) travel like a train along ONE continuous
// 3D path at a steady speed - in from the left on a wave, round a tilted 3D ring (where the six
// spread evenly and orbit), then out to the right on a wave. A faint motion trail follows each logo.
// Loader (Framer Motion): the IndianShoes wordmark in the centre and, at the bottom middle, a sliding
// number strip - the current % big and sharp, its neighbours small, faded and blurred - over a thin bar.
// The % follows the real loading progress of the store; the screen fades out once loading is done.

const FLOW = 5.2 // seconds the logo train takes from entering to leaving
const LOADER_IN = FLOW - 0.5 // the loader appears as the last logos leave
const MIN_COUNT = 1.1 // the number never counts to 100 faster than this (s)
const TRAIL = [0.14, 0.28, 0.42] // motion-trail ghosts, distance behind each logo (world units)
const TRAIL_OPACITY = [0.22, 0.11, 0.05]

const clamp01 = (v) => Math.min(1, Math.max(0, v))

// time since the intro started (dev only: window.__introT = 3 freezes it at 3 s)
function introTime(start) {
  const frozen = import.meta.env.DEV ? window.__introT : undefined
  return frozen ?? (performance.now() - start) / 1000
}

// ---------- WebGL logo train (plain three.js on its own canvas) ----------

function buildPath(hw, hh) {
  const R = Math.min(1.55, hw * 0.42) // ring radius
  const A = Math.min(0.38, hh * 0.12) // wave height
  const lambda = 1.7 // wave length
  const pts = []
  // wave in: from off-screen left to the left edge of the ring
  for (let x = -hw - 1.6; x < -R; x += 0.12) pts.push(new THREE.Vector3(x, A * Math.sin((Math.PI * (x + R)) / lambda), 0))
  // tilted 3D ring: 1.5 turns, from its left edge round to its right edge
  for (let k = 0; k <= 90; k++) {
    const th = Math.PI - (k / 90) * 3 * Math.PI
    pts.push(new THREE.Vector3(R * Math.cos(th), R * Math.sin(th) * 0.48, R * Math.sin(th) * 0.88))
  }
  // wave out: from the right edge of the ring to off-screen right
  for (let x = R + 0.12; x <= hw + 1.6; x += 0.12) pts.push(new THREE.Vector3(x, A * Math.sin((Math.PI * (x - R)) / lambda), 0))
  const curve = new THREE.CatmullRomCurve3(pts, false, 'centripetal')
  const length = curve.getLength()
  const gap = (2 * Math.PI * R) / 6 // six logos spread evenly round the ring
  const speed = (length + 5 * gap) / FLOW
  return { curve, length, gap, speed, R }
}

function LogoTrain({ start }) {
  const canvasRef = useRef(null)
  useEffect(() => {
    const canvas = canvasRef.current
    const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.outputColorSpace = THREE.SRGBColorSpace
    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 100)
    camera.position.set(0, 0, 10)

    let path
    const resize = () => {
      const w = canvas.clientWidth
      const h = canvas.clientHeight
      renderer.setSize(w, h, false)
      camera.aspect = w / h
      camera.updateProjectionMatrix()
      const hh = 10 * Math.tan(THREE.MathUtils.degToRad(35 / 2)) // half height of the view at z = 0
      path = buildPath(hh * camera.aspect, hh)
    }
    resize()
    window.addEventListener('resize', resize)

    // six logos (Comet, Gully Labs, ...) + faint trail copies behind each
    const loader = new THREE.TextureLoader()
    const textures = INTRO.logos.map((l) => {
      const t = loader.load(l.white)
      t.colorSpace = THREE.SRGBColorSpace
      t.anisotropy = 8
      return t
    })
    const planes = []
    const geos = INTRO.logos.map((l) => new THREE.PlaneGeometry(l.worldWidth, l.worldWidth / l.aspect))
    for (let i = 0; i < 6; i++) {
      const kind = i % 2
      ;[0, ...TRAIL].forEach((behind, k) => {
        const mat = new THREE.MeshBasicMaterial({ map: textures[kind], transparent: true, depthWrite: false, opacity: 0 })
        const mesh = new THREE.Mesh(geos[kind], mat)
        mesh.visible = false
        scene.add(mesh)
        planes.push({ mesh, index: i, behind, strength: k === 0 ? 1 : TRAIL_OPACITY[k - 1] })
      })
    }

    const p = new THREE.Vector3()
    const tan = new THREE.Vector3()
    let raf
    const frame = () => {
      const t = introTime(start)
      for (const pl of planes) {
        const s = t * path.speed - pl.index * path.gap - pl.behind
        const u = s / path.length
        if (u <= 0 || u >= 1) {
          pl.mesh.visible = false
          continue
        }
        pl.mesh.visible = true
        path.curve.getPointAt(u, p)
        path.curve.getTangentAt(u, tan)
        pl.mesh.position.copy(p)
        // lean with the wave; stay upright on the ring
        const lean = Math.atan2(tan.y, Math.abs(tan.x) + 0.001)
        pl.mesh.rotation.z = Math.max(-0.5, Math.min(0.5, lean * 0.6)) * clamp01(Math.abs(tan.x) * 1.4)
        // the back of the ring is dimmer (depth); fade in/out at the very ends of the path
        const back = 1 - 0.55 * clamp01(-p.z / path.R) // only the far half of the ring dims
        const ends = clamp01(u * 25) * clamp01((1 - u) * 25)
        pl.mesh.material.opacity = pl.strength * back * ends
      }
      renderer.render(scene, camera)
      raf = requestAnimationFrame(frame)
    }
    raf = requestAnimationFrame(frame)

    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', resize)
      planes.forEach((pl) => pl.mesh.material.dispose())
      geos.forEach((g) => g.dispose())
      textures.forEach((t) => t.dispose())
      renderer.dispose()
    }
  }, [start])
  return <canvas ref={canvasRef} className="intro__gl" />
}

// ---------- Framer Motion number strip ----------

function StripNumber({ n, pos, spacing }) {
  const d = useTransform(pos, (p) => n - p)
  const x = useTransform(d, (v) => v * spacing)
  const scale = useTransform(d, (v) => 1 - 0.52 * Math.min(Math.abs(v), 1))
  const opacity = useTransform(d, (v) => {
    const a = Math.abs(v)
    return a <= 1 ? 1 - 0.62 * a : Math.max(0, 0.38 - (a - 1) * 0.38)
  })
  const filter = useTransform(d, (v) => `blur(${(Math.min(Math.abs(v), 1.6) * 3.2).toFixed(2)}px)`)
  return (
    <motion.span className="intro__digit" style={{ x, scale, opacity, filter }}>
      {n}
    </motion.span>
  )
}

function NumberStrip({ value }) {
  const spacing = typeof window !== 'undefined' ? Math.min(118, window.innerWidth * 0.13) : 110
  const pos = useSpring(value, { stiffness: 140, damping: 26, mass: 0.6 })
  const fill = useTransform(pos, (p) => `scaleX(${clamp01(p / 100)})`)
  const numbers = useMemo(() => Array.from({ length: 101 }, (_, i) => i), [])
  return (
    <div className="intro__strip-wrap">
      <div className="intro__strip" style={{ width: spacing * 3 }}>
        {numbers.map((n) => (
          <StripNumber key={n} n={n} pos={pos} spacing={spacing} />
        ))}
      </div>
      <div className="intro__track">
        <motion.div className="intro__bar" style={{ transform: fill }} />
      </div>
    </div>
  )
}

// ---------- overlay ----------

export default function Intro() {
  const { progress } = useProgress()
  const progressRef = useRef(0)
  progressRef.current = progress

  const start = useMemo(() => {
    const reduce = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
    return performance.now() - (reduce ? LOADER_IN * 1000 : 0)
  }, [])
  const value = useMotionValue(0) // shown % (only ever goes up)
  const [showLoader, setShowLoader] = useState(false)
  const [visible, setVisible] = useState(true)
  const [logosDone, setLogosDone] = useState(false)

  useEffect(() => {
    let shown = 0
    let finishedAt = null
    let raf
    const frame = () => {
      const t = introTime(start)
      if (t >= LOADER_IN) setShowLoader(true)
      if (t >= FLOW + 0.3) setLogosDone(true) // free the logo WebGL canvas once the train has left
      if (t >= LOADER_IN) {
        const timeCap = clamp01((t - LOADER_IN) / MIN_COUNT) * 100
        const target = Math.min(progressRef.current, timeCap)
        shown = Math.max(shown, shown + (target - shown) * 0.12)
        if (target >= 100 && shown > 99.5) shown = 100
        value.set(shown)
        if (shown >= 100 && finishedAt === null) finishedAt = t
      }
      if (finishedAt !== null && t - finishedAt > 0.45) {
        setVisible(false)
        return
      }
      raf = requestAnimationFrame(frame)
    }
    raf = requestAnimationFrame(frame)
    return () => cancelAnimationFrame(raf)
  }, [start, value])

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key="intro"
          className="intro"
          role="status"
          aria-label="Loading the store"
          style={INTRO.background ? { backgroundImage: `url(${INTRO.background})` } : undefined}
          exit={{ opacity: 0, transition: { duration: 0.7, ease: 'easeInOut' } }}
        >
          {!logosDone && <LogoTrain start={start} />}
          <AnimatePresence>
            {showLoader && (
              <motion.div
                key="loader"
                className="intro__final"
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
              >
                <div className="intro__center">
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
                <NumberStrip value={value} />
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
