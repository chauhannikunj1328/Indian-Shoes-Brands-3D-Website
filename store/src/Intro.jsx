import { useEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import { useProgress } from '@react-three/drei'
import { AnimatePresence, motion, useMotionValue, useSpring, useTransform } from 'framer-motion'
import { INTRO } from './brands'

// Intro / loading screen that plays while the 3D store loads underneath it. It lasts exactly as long
// as the store takes to load (plus the logos' exit), never a fixed time.
//
// Logos (WebGL, plain three.js): eight white logos (2 per brand: Neemans, Comet, Gully Labs, Bond Street) travel like a
// train along ONE continuous 3D path at a steady speed - in from the left on a wave, into a tilted 3D ring where they
// spread evenly and orbit. They keep orbiting for as long as the store is still loading; once it has
// loaded they finish their current turn and leave to the right on a wave. A faint motion trail follows each logo.
// Loader (Framer Motion): a sliding number strip at the bottom middle - the current % big and sharp, its
// neighbours small, faded and blurred - over a thin bar. It shows the REAL loading progress from the start
// and reaches 100 as the last logo leaves; then the IndianShoes wordmark shows and the screen fades out.

const LOGO_COUNT = INTRO.logos.length * 2 // two white logos per brand (8 for four brands), alternating brand by brand
const FLOW = 5.2 // seconds for the shortest run: wave in, 1.5 turns of the ring, wave out
const TRAIL = [0.14, 0.28, 0.42] // motion-trail ghosts, distance behind each logo (world units)
const TRAIL_OPACITY = [0.22, 0.11, 0.05]
const SETTLE = 0.8 // loading must stay at 100% this long (s) before it counts as done (more files can start)
const HOLD = 0.9 // the wordmark stays on screen this long after the train has left (s)

const SLOW_LOAD = import.meta.env.DEV ? Number(new URLSearchParams(window.location.search).get('holdload')) || 0 : 0

const clamp01 = (v) => Math.min(1, Math.max(0, v))

// time since the intro started (dev only: window.__introT = 3 freezes it at 3 s)
function introTime(start) {
  const frozen = import.meta.env.DEV ? window.__introT : undefined
  return frozen ?? (performance.now() - start) / 1000
}

// ---------- the logos' path ----------
// Three parts, measured as distance s along the path:
//   in   (0 .. inLen)          wave in from off-screen left + the first quarter of the ring (smooth curve)
//   ring (inLen .. exitAt)     the ring itself, any number of whole turns (exitAt = Infinity while loading)
//   out  (exitAt .. +outLen)   the last quarter of the ring + wave out to off-screen right (smooth curve)
function ringPoint(R, th, target) {
  return target.set(R * Math.cos(th), R * Math.sin(th) * 0.48, R * Math.sin(th) * 0.88)
}

function buildPath(hw, hh) {
  const R = Math.min(1.55, hw * 0.42) // ring radius
  const A = Math.min(0.38, hh * 0.12) // wave height
  const lambda = 1.7 // wave length
  const inPts = []
  for (let x = -hw - 1.6; x < -R; x += 0.12)
    inPts.push(new THREE.Vector3(x, A * Math.sin((Math.PI * (x + R)) / lambda), 0))
  for (let k = 0; k <= 15; k++) inPts.push(ringPoint(R, Math.PI - (k / 15) * (Math.PI / 2), new THREE.Vector3()))
  const outPts = []
  for (let k = 0; k <= 15; k++) outPts.push(ringPoint(R, Math.PI / 2 - (k / 15) * (Math.PI / 2), new THREE.Vector3()))
  for (let x = R + 0.12; x <= hw + 1.6; x += 0.12)
    outPts.push(new THREE.Vector3(x, A * Math.sin((Math.PI * (x - R)) / lambda), 0))
  const inCurve = new THREE.CatmullRomCurve3(inPts, false, 'centripetal')
  const outCurve = new THREE.CatmullRomCurve3(outPts, false, 'centripetal')
  const inLen = inCurve.getLength()
  const outLen = outCurve.getLength()
  const turn = 2 * Math.PI * R // one full turn of the ring (it is a circle of radius ~R)
  const gap = turn / LOGO_COUNT // the logos spread evenly round the ring
  const tail = (LOGO_COUNT - 1) * gap + TRAIL[TRAIL.length - 1] // distance from the first logo to the end of the last trail
  const speed = (inLen + turn + outLen + (LOGO_COUNT - 1) * gap) / FLOW
  return { inCurve, outCurve, inLen, outLen, turn, gap, tail, speed, R }
}

// where the path exits the ring: after whole turns, at least one, and not before the first logo gets there
function exitFor(path, lead) {
  return path.inLen + path.turn * Math.max(1, Math.ceil((lead - path.inLen) / path.turn))
}

// position + direction at distance s; false when off the path
function pathAt(path, exitAt, s, p, tan) {
  if (s <= 0) return false
  if (s < path.inLen) {
    path.inCurve.getPointAt(s / path.inLen, p)
    path.inCurve.getTangentAt(s / path.inLen, tan)
    return true
  }
  if (s < exitAt) {
    const th = Math.PI / 2 - (s - path.inLen) / path.R
    ringPoint(path.R, th, p)
    tan.set(Math.sin(th), -Math.cos(th) * 0.48, -Math.cos(th) * 0.88)
    return true
  }
  const o = s - exitAt
  if (o >= path.outLen) return false
  path.outCurve.getPointAt(o / path.outLen, p)
  path.outCurve.getTangentAt(o / path.outLen, tan)
  return true
}

// ---------- WebGL logo train (plain three.js on its own canvas) ----------
// `train` is a ref the overlay updates every frame: { path, lead, exitAt }

function LogoTrain({ train }) {
  const canvasRef = useRef(null)
  useEffect(() => {
    const canvas = canvasRef.current
    const renderer = new THREE.WebGLRenderer({
      canvas,
      alpha: true,
      antialias: true,
    })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.outputColorSpace = THREE.SRGBColorSpace
    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 100)
    camera.position.set(0, 0, 10)
    const resize = () => {
      if (!canvas.clientWidth || !canvas.clientHeight) return // 0 x 0 for now: wait for a real size
      renderer.setSize(canvas.clientWidth, canvas.clientHeight, false)
      camera.aspect = canvas.clientWidth / canvas.clientHeight
      camera.updateProjectionMatrix()
    }
    resize()
    window.addEventListener('resize', resize)

    // LOGO_COUNT logos (two per brand, all white) + faint trail copies behind each
    const loader = new THREE.TextureLoader()
    const textures = INTRO.logos.map((l) => {
      const t = loader.load(l.white)
      t.colorSpace = THREE.SRGBColorSpace
      t.anisotropy = 8
      return t
    })
    const planes = []
    const geos = INTRO.logos.map((l) => new THREE.PlaneGeometry(l.worldWidth, l.worldWidth / l.aspect))
    for (let i = 0; i < LOGO_COUNT; i++) {
      const kind = i % INTRO.logos.length
      ;[0, ...TRAIL].forEach((behind, k) => {
        const mat = new THREE.MeshBasicMaterial({
          map: textures[kind],
          transparent: true,
          depthWrite: false,
          opacity: 0,
        })
        const mesh = new THREE.Mesh(geos[kind], mat)
        mesh.visible = false
        scene.add(mesh)
        planes.push({
          mesh,
          index: i,
          behind,
          strength: k === 0 ? 1 : TRAIL_OPACITY[k - 1],
        })
      })
    }

    const p = new THREE.Vector3()
    const tan = new THREE.Vector3()
    let raf
    const frame = () => {
      const { path, lead, exitAt } = train.current
      for (const pl of planes) {
        const s = lead - pl.index * path.gap - pl.behind
        if (!pathAt(path, exitAt, s, p, tan)) {
          pl.mesh.visible = false
          continue
        }
        pl.mesh.visible = true
        pl.mesh.position.copy(p)
        // lean with the wave; stay upright on the ring
        const lean = Math.atan2(tan.y, Math.abs(tan.x) + 0.001)
        pl.mesh.rotation.z = Math.max(-0.5, Math.min(0.5, lean * 0.6)) * clamp01(Math.abs(tan.x) * 1.4)
        // the back of the ring is dimmer (depth); fade in/out at the very ends of the path
        const back = 1 - 0.55 * clamp01(-p.z / path.R) // only the far half of the ring dims
        const ends = clamp01(s / 0.4) * (s > exitAt ? clamp01((path.outLen - (s - exitAt)) / 0.4) : 1)
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
  }, [train])
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

// the path for the current window size (the logo canvas covers the whole window)
function pathForWindow() {
  const hh = 10 * Math.tan(THREE.MathUtils.degToRad(35 / 2)) // half height of the view at z = 0
  // a window can report 0 x 0 at first (background tab, hidden webview); use a laptop shape until it resizes
  const aspect = window.innerWidth > 0 && window.innerHeight > 0 ? window.innerWidth / window.innerHeight : 16 / 10
  return buildPath(hh * aspect, hh)
}

export default function Intro() {
  const { progress, active } = useProgress()
  const loadRef = useRef({ progress: 0, active: true })
  loadRef.current = { progress, active }

  const reduce = useMemo(
    () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    [],
  )
  const start = useMemo(() => performance.now(), [])
  const train = useRef(null)
  if (!train.current) train.current = { path: pathForWindow(), lead: 0, exitAt: Infinity }

  const value = useMotionValue(0) // shown % (only ever goes up)
  const [showWordmark, setShowWordmark] = useState(false)
  const [visible, setVisible] = useState(true)
  const [logosDone, setLogosDone] = useState(reduce)

  useEffect(() => {
    const onResize = () => {
      train.current.path = pathForWindow()
      if (train.current.exitAt !== Infinity) train.current.exitAt = exitFor(train.current.path, train.current.lead)
    }
    window.addEventListener('resize', onResize)

    let shown = 0
    let lastT = 0
    let fullSince = null // when loading last reached a steady 100%
    let loadedAt = null
    let trainDoneAt = null
    let raf
    const frame = () => {
      const t = introTime(start)
      const tr = train.current
      const { path } = tr
      let { progress: real, active: busy } = loadRef.current
      // dev only: ?holdload=10 pretends loading takes 10 s (to test a slow connection)
      if (SLOW_LOAD) {
        real = Math.min(real, (100 * t) / SLOW_LOAD)
        busy = busy || t < SLOW_LOAD
      }

      // loaded = 100% with nothing loading, and it stays that way for SETTLE seconds
      // (the shoe models only start loading once the shoe lists have arrived)
      if (real >= 100 && !busy) fullSince ??= t
      else fullSince = null
      if (loadedAt === null && fullSince !== null && t - fullSince >= SETTLE) loadedAt = t

      // the train: orbits while loading, exits after the current turn once loaded
      tr.lead = reduce ? 0 : t * path.speed
      if (loadedAt !== null && tr.exitAt === Infinity) tr.exitAt = exitFor(path, tr.lead)
      const end = (tr.exitAt === Infinity ? exitFor(path, tr.lead) + path.turn : tr.exitAt) + path.outLen + path.tail
      const trainDone = reduce ? loadedAt !== null : tr.exitAt !== Infinity && tr.lead >= end
      if (trainDone && trainDoneAt === null) {
        trainDoneAt = t
        setLogosDone(true) // free the logo WebGL canvas
      }
      if (reduce ? loadedAt !== null : tr.exitAt !== Infinity && tr.lead >= end - 0.7 * path.speed)
        setShowWordmark(true)

      // shown % = real progress, but it only reaches 100 as the last logo leaves
      const pace = reduce ? 1 : clamp01(tr.lead / end)
      const target = Math.min(real, loadedAt === null ? Math.min(97, 100 * pace) : 100 * pace)
      // ease towards the target by time, not per frame, so slow devices keep up too
      const dt = Math.min(1, Math.max(0, t - lastT))
      lastT = t
      shown = Math.max(shown, shown + (target - shown) * (1 - Math.exp(-dt * 7)))
      if (shown > 99.5 && trainDone) shown = 100
      value.set(shown)

      if (shown >= 100 && trainDoneAt !== null && t - trainDoneAt >= HOLD) {
        setVisible(false)
        return
      }
      raf = requestAnimationFrame(frame)
    }
    raf = requestAnimationFrame(frame)
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', onResize)
    }
  }, [start, value, reduce])

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key="intro"
          className="intro"
          role="status"
          aria-label="Loading the store"
          style={INTRO.background ? { backgroundImage: `url(${INTRO.background})` } : undefined}
          exit={{
            opacity: 0,
            transition: { duration: 0.7, ease: 'easeInOut' },
          }}
        >
          {!logosDone && <LogoTrain train={train} />}
          <div className="intro__final">
            <div className="intro__center">
              <AnimatePresence>
                {showWordmark && (
                  <motion.div
                    key="wordmark"
                    className="intro__center-in"
                    initial={{ opacity: 0, y: 14 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
                  >
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
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.8, delay: 0.3 }}>
              <NumberStrip value={value} />
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
