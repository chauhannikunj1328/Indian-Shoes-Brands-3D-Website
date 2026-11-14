import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import { useFrame, useLoader } from '@react-three/fiber'
import { useGLTF, useTexture } from '@react-three/drei'
import { ParametricGeometry } from 'three/examples/jsm/geometries/ParametricGeometry.js'
import { WALL_HEIGHT } from './brands'

// A real 3D sneaker built in code: Gully Labs' bestseller "Gully Number 001 - Magic Carpet"
// (gullylabs.com/products/gully-number-001-magic-carpet):
//   antique-white cupsole with the गलीLABS logo raised in navy on the bottom, cream leather upper,
//   beige canvas side panel, blue embroidered swoosh, red laces, blue heel tab with a red emblem,
//   blue stitching, perforated toe, red carpet-print insole.
// Hung on a twisted red rope like the giant shoe on their flagship store, with a slow sway.
//
// Model space: length along x (heel at -x, toe at +x), sole bottom at y = 0, width along z.

const COLORS = {
  leather: '#f1eadb',
  canvas: '#e0c38e',
  sole: '#ece5d2',
  logo: '#1b2a6e', // navy, like the sole print
  blue: '#1d4fc9', // embroidery + heel tab
  stitch: '#1d4fc9',
  lace: '#d8262b', // red laces
  emblem: '#d23a2c',
  perf: '#b9ab90',
}

function makeProfile(L) {
  const W = L * 0.36 // max width
  const H = L * 0.34 // upper height scale
  const SOLE_T = L * 0.065 // sole thickness
  // half-width of the footprint at u in [-1 (heel), 1 (toe)]: rounded ends, wider ball, slight waist
  const halfWidth = (u) => {
    const base = Math.pow(Math.max(0, 1 - u * u), 0.42)
    const m = 0.86 + 0.14 * Math.exp(-(((u - 0.35) / 0.45) ** 2)) - 0.07 * Math.exp(-(((u + 0.1) / 0.25) ** 2))
    return (W / 2) * base * m
  }
  // upper height: low-top court shoe - collar at the heel, sloping down to a low toe
  const height = (u) => {
    const h = 0.44 + 0.56 / (1 + Math.exp((u - 0.15) * 4))
    return H * h * Math.pow(Math.max(0, 1 - u * u), 0.2)
  }
  return { L, W, H, SOLE_T, halfWidth, height }
}

const MAPS = {
  leather: '/brands/gullylabs/leather_bump.png',
  canvas: '/brands/gullylabs/canvas_bump.png',
  satin: '/brands/gullylabs/satin_bump.png',
}

function useBump(url, rx, ry) {
  const tex = useTexture(url)
  return useMemo(() => {
    const t = tex.clone()
    t.wrapS = t.wrapT = THREE.RepeatWrapping
    t.repeat.set(rx, ry)
    t.anisotropy = 8
    t.needsUpdate = true
    return t
  }, [tex, rx, ry])
}

const SIDE_EXP = 0.5 // how upright the sides of the upper are (smaller = more vertical)

// point on the upper's surface: u along the shoe, f = 0 (sole line) .. 1 (top), side = +1 / -1
function surfacePoint(P, u, f, side, grow = 1) {
  const v = Math.asin(Math.min(1, Math.max(0, f)) ** (1 / SIDE_EXP))
  const x = (u * P.L) / 2
  const z = side * P.halfWidth(u) * 0.97 * grow * Math.cos(v)
  const y = P.SOLE_T + P.height(u) * grow * Math.sin(v) ** SIDE_EXP
  return new THREE.Vector3(x, y, z)
}

// Upper (or an overlay panel on it) as a parametric dome over the footprint.
// v range lets a panel cover only the sides (e.g. the canvas mid panel).
function upperGeometry(P, u0, u1, grow = 1, v0 = 0, v1 = Math.PI) {
  const fn = (s, t, target) => {
    const u = u0 + (u1 - u0) * s
    const v = v0 + (v1 - v0) * t
    const x = (u * P.L) / 2
    const z = P.halfWidth(u) * 0.97 * grow * Math.cos(v)
    const y = P.SOLE_T + P.height(u) * grow * Math.pow(Math.max(0, Math.sin(v)), SIDE_EXP)
    target.set(x, y, z)
  }
  return new ParametricGeometry(fn, 90, 36)
}

function soleGeometry(P) {
  const pts = []
  const N = 80
  for (let i = 0; i <= N; i++) {
    const u = -1 + (2 * i) / N
    pts.push(new THREE.Vector2((u * P.L) / 2, P.halfWidth(u) * 1.06))
  }
  for (let i = N; i >= 0; i--) {
    const u = -1 + (2 * i) / N
    pts.push(new THREE.Vector2((u * P.L) / 2, -P.halfWidth(u) * 1.06))
  }
  const g = new THREE.ExtrudeGeometry(new THREE.Shape(pts), {
    depth: P.SOLE_T,
    bevelEnabled: true,
    bevelThickness: P.SOLE_T * 0.12,
    bevelSize: P.SOLE_T * 0.1,
    bevelSegments: 3,
  })
  g.rotateX(-Math.PI / 2) // extrusion now runs up the y axis: sole from y = 0 to SOLE_T
  return g
}

// Extruded shape from a traced-outline JSON (logo / monogram).
function useTracedShape(url, width, depth) {
  const data = useLoader(THREE.FileLoader, url)
  return useMemo(() => {
    const { shapes } = JSON.parse(data)
    const toV = ([x, y]) => new THREE.Vector2(x * width, y * width)
    const s = shapes.map((sh) => {
      const shape = new THREE.Shape(sh.outer.map(toV))
      sh.holes.forEach((h) => shape.holes.push(new THREE.Path(h.map(toV))))
      return shape
    })
    return new THREE.ExtrudeGeometry(s, { depth, bevelEnabled: true, bevelThickness: depth * 0.3, bevelSize: depth * 0.15, bevelSegments: 2 })
  }, [data, width, depth])
}

// Blue embroidered swoosh: a flat band lying on the side of the upper, heel -> toe, tapering to a point.
function swooshGeometry(P, side, u0, u1, f0, f1, width) {
  const N = 60
  const pos = []
  const uv = []
  const idx = []
  for (let i = 0; i <= N; i++) {
    const t = i / N
    const u = u0 + (u1 - u0) * t
    const f = f0 + (f1 - f0) * (t * t * 0.4 + t * 0.6)
    const w = width * (0.7 + 0.3 * Math.sin(Math.min(t * 4, 1) * Math.PI / 2)) * (1 - t ** 3)
    const a = surfacePoint(P, u, f + w / 2 / P.H, side, 1.025)
    const b = surfacePoint(P, u, f - w / 2 / P.H, side, 1.025)
    pos.push(a.x, a.y, a.z, b.x, b.y, b.z)
    uv.push(t * 12, 1, t * 12, 0)
    if (i < N) {
      const k = i * 2
      idx.push(k, k + 1, k + 2, k + 1, k + 3, k + 2)
    }
  }
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2))
  g.setIndex(idx)
  g.computeVertexNormals()
  return g
}

function Swooshes({ P }) {
  const geos = useMemo(() => {
    const out = []
    for (const side of [1, -1]) {
      out.push(swooshGeometry(P, side, -0.82, 0.42, 0.72, 0.42, P.L * 0.035))
      out.push(swooshGeometry(P, side, -0.86, 0.42, 0.42, 0.3, P.L * 0.05))
    }
    return out
  }, [P])
  const satin = useBump(MAPS.satin, 1, 1)
  return geos.map((g, i) => (
    <mesh key={i} geometry={g} castShadow>
      <meshPhysicalMaterial color={COLORS.blue} roughness={0.55} sheen={1} sheenRoughness={0.4} sheenColor="#7fa2ff" bumpMap={satin} bumpScale={3} side={THREE.DoubleSide} polygonOffset polygonOffsetFactor={-2} />
    </mesh>
  ))
}

function Stitches({ P }) {
  // blue dashed stitching where the upper meets the sole, both sides
  const items = useMemo(() => {
    const out = []
    const N = 70
    for (const side of [1, -1]) {
      for (let i = 1; i < N; i += 2) {
        const u = -0.97 + (1.94 * i) / N
        const x = (u * P.L) / 2
        const z = side * P.halfWidth(u) * 0.985
        const u2 = u + 0.01
        const dz = side * (P.halfWidth(u2) - P.halfWidth(u)) * 0.985
        const ang = Math.atan2(dz, (0.01 * P.L) / 2)
        out.push({ pos: [x, P.SOLE_T + P.L * 0.014, z], rot: [0, -ang, 0] })
      }
    }
    return out
  }, [P])
  return items.map((s, i) => (
    <mesh key={i} position={s.pos} rotation={s.rot}>
      <boxGeometry args={[P.L * 0.022, P.L * 0.005, P.L * 0.006]} />
      <meshStandardMaterial color={COLORS.stitch} roughness={0.6} />
    </mesh>
  ))
}

// Red laces criss-crossing over the tongue.
function Laces({ P }) {
  const items = useMemo(() => {
    const out = []
    const rows = 6
    for (let k = 0; k < rows; k++) {
      const u = -0.28 + k * 0.1
      const top = P.SOLE_T + P.height(u) * 1.0 + P.L * 0.008
      const half = P.halfWidth(u) * 0.55
      for (const dir of [1, -1]) {
        const a = new THREE.Vector3((u * P.L) / 2, top, -half * dir)
        const b = new THREE.Vector3(((u + 0.1) * P.L) / 2, P.SOLE_T + P.height(u + 0.1) + P.L * 0.008, half * dir)
        if (k === rows - 1) b.set((u * P.L) / 2, top, half * dir)
        const mid = a.clone().add(b).multiplyScalar(0.5)
        mid.y += P.L * 0.012
        out.push(new THREE.TubeGeometry(new THREE.QuadraticBezierCurve3(a, mid, b), 16, P.L * 0.009, 8, false))
      }
    }
    // a bow on top
    const u = 0.22
    const top = P.SOLE_T + P.height(u) + P.L * 0.02
    for (const s of [1, -1]) {
      const c = new THREE.CatmullRomCurve3([
        new THREE.Vector3((u * P.L) / 2, top, 0),
        new THREE.Vector3((u * P.L) / 2 - P.L * 0.03, top + P.L * 0.02, s * P.L * 0.07),
        new THREE.Vector3((u * P.L) / 2 + P.L * 0.02, top + P.L * 0.005, s * P.L * 0.1),
        new THREE.Vector3((u * P.L) / 2, top, 0),
      ])
      out.push(new THREE.TubeGeometry(c, 30, P.L * 0.009, 8, false))
    }
    return out
  }, [P])
  return items.map((g, i) => (
    <mesh key={i} geometry={g} castShadow>
      <meshPhysicalMaterial color={COLORS.lace} roughness={0.85} sheen={1} sheenRoughness={0.6} sheenColor="#ff9a8a" />
    </mesh>
  ))
}

// Small perforation holes on the toe box.
function Perforations({ P }) {
  const items = useMemo(() => {
    const out = []
    for (const side of [1, -1]) {
      for (let i = 0; i < 5; i++) {
        for (let j = 0; j < 3; j++) {
          const u = 0.7 + i * 0.045
          const f = 0.82 - j * 0.12 - i * 0.02
          const p = surfacePoint(P, u, f, side, 1.012)
          out.push(p)
        }
      }
    }
    return out
  }, [P])
  return items.map((p, i) => (
    <mesh key={i} position={p}>
      <sphereGeometry args={[P.L * 0.0055, 8, 6]} />
      <meshStandardMaterial color={COLORS.perf} roughness={1} />
    </mesh>
  ))
}

function SneakerModel({ length, logoUrl, monogramUrl, insoleUrl }) {
  const P = useMemo(() => makeProfile(length), [length])
  const sole = useMemo(() => soleGeometry(P), [P])
  const upper = useMemo(() => upperGeometry(P, -0.995, 0.995), [P])
  // beige canvas mid panel on the sides (between the leather heel and toe overlays)
  const canvasL = useMemo(() => upperGeometry(P, -0.62, 0.55, 1.006, 0.05, 1.25), [P])
  const canvasR = useMemo(() => upperGeometry(P, -0.62, 0.55, 1.006, Math.PI - 1.25, Math.PI - 0.05), [P])
  const heelTab = useMemo(() => upperGeometry(P, -0.995, -0.8, 1.014, 0.9, Math.PI - 0.9), [P])
  const logo = useTracedShape(logoUrl, length * 0.6, length * 0.008)
  const mono = useTracedShape(monogramUrl, length * 0.07, length * 0.01)
  const leatherBump = useBump(MAPS.leather, 6, 3)
  const canvasBump = useBump(MAPS.canvas, 5, 3)
  const soleBump = useBump(MAPS.leather, 0.6, 0.6)
  const insoleTex = useTexture(insoleUrl)
  const insole = useMemo(() => {
    const t = insoleTex.clone()
    t.colorSpace = THREE.SRGBColorSpace
    t.wrapS = t.wrapT = THREE.RepeatWrapping
    t.repeat.set(1.4, 1)
    t.needsUpdate = true
    return t
  }, [insoleTex])
  // collar opening on top, towards the heel
  const collarU = -0.55
  const collarTop = P.SOLE_T + P.height(collarU) * 1.0
  const heelBack = surfacePoint(P, -0.97, 0.75, 1, 1.03)

  return (
    <group>
      {/* cupsole */}
      <mesh geometry={sole} castShadow receiveShadow>
        <meshPhysicalMaterial color={COLORS.sole} roughness={0.88} bumpMap={soleBump} bumpScale={0.6} />
      </mesh>
      {/* गलीLABS raised on the bottom of the sole (reads correctly when you look up at it) */}
      <mesh geometry={logo} rotation={[Math.PI / 2, 0, Math.PI]} position={[0, -P.SOLE_T * 0.12, 0]}>
        <meshStandardMaterial color={COLORS.logo} roughness={0.7} side={THREE.DoubleSide} />
      </mesh>
      {/* cream leather upper + overlays */}
      <mesh geometry={upper} castShadow receiveShadow>
        <meshPhysicalMaterial color={COLORS.leather} roughness={0.48} clearcoat={0.35} clearcoatRoughness={0.45} bumpMap={leatherBump} bumpScale={1.4} side={THREE.DoubleSide} />
      </mesh>
      {[canvasL, canvasR].map((g, i) => (
        <mesh key={i} geometry={g}>
          <meshPhysicalMaterial color={COLORS.canvas} roughness={0.95} sheen={0.6} sheenRoughness={0.7} sheenColor="#fff1d6" bumpMap={canvasBump} bumpScale={2} side={THREE.DoubleSide} polygonOffset polygonOffsetFactor={-1} />
        </mesh>
      ))}
      <mesh geometry={heelTab} castShadow>
        <meshPhysicalMaterial color={COLORS.blue} roughness={0.5} clearcoat={0.3} bumpMap={leatherBump} bumpScale={1.2} side={THREE.DoubleSide} polygonOffset polygonOffsetFactor={-1} />
      </mesh>
      {/* red embroidered emblem on the heel tab */}
      <mesh position={[heelBack.x - P.L * 0.004, heelBack.y, 0]} rotation={[0, -Math.PI / 2, 0]}>
        <circleGeometry args={[P.L * 0.025, 24]} />
        <meshStandardMaterial color={COLORS.emblem} roughness={0.8} side={THREE.DoubleSide} />
      </mesh>
      <Swooshes P={P} />
      <Perforations P={P} />
      {/* collar opening with the red carpet-print insole inside */}
      <mesh position={[(collarU * P.L) / 2, collarTop + 0.004, 0]} rotation={[-Math.PI / 2, 0, 0]} scale={[P.L * 0.2, P.halfWidth(collarU) * 0.66, 1]}>
        <circleGeometry args={[1, 40]} />
        <meshStandardMaterial map={insole} roughness={0.9} />
      </mesh>
      <mesh position={[(collarU * P.L) / 2, collarTop, 0]} rotation={[Math.PI / 2, 0, 0]} scale={[P.L * 0.2, P.halfWidth(collarU) * 0.66, 1]}>
        <torusGeometry args={[1, 0.08, 10, 48]} />
        <meshStandardMaterial color={COLORS.leather} roughness={0.6} />
      </mesh>
      <Laces P={P} />
      <Stitches P={P} />
      {/* गL monogram on the tongue */}
      <mesh
        geometry={mono}
        position={[(-0.36 * P.L) / 2, P.SOLE_T + P.height(-0.36) + P.L * 0.006, 0]}
        rotation={[-Math.PI / 2, 0, -Math.PI / 2]}
        castShadow
      >
        <meshStandardMaterial color={COLORS.blue} roughness={0.6} />
      </mesh>
    </group>
  )
}

// Real scanned-style 3D model (GLB made from the product photos with image-to-3D).
// It is auto-normalised into the same model space as SneakerModel: length along x (heel at -x),
// sole bottom at y = 0, centred. `rotation` turns the raw model into that pose first.
// The गलीLABS logo is added on the sole bottom (the real outsole has no logo).
const NO_ROTATION = [0, 0, 0]

function GLBSneaker({ url, length, rotation = NO_ROTATION, logoUrl, logoY = -0.004 }) {
  const { scene } = useGLTF(url)
  const logo = useTracedShape(logoUrl, length * 0.55, length * 0.006)
  const { object, scale, offset } = useMemo(() => {
    const obj = scene.clone(true)
    obj.rotation.set(...rotation)
    obj.updateMatrixWorld(true)
    obj.traverse((o) => {
      if (o.isMesh) {
        o.castShadow = true
        o.receiveShadow = true
        if (o.material) o.material.envMapIntensity = 1
      }
    })
    const box = new THREE.Box3().setFromObject(obj)
    const size = box.getSize(new THREE.Vector3())
    const k = length / size.x
    const c = box.getCenter(new THREE.Vector3())
    return { object: obj, scale: k, offset: [-c.x * k, -box.min.y * k, -c.z * k] }
  }, [scene, length, rotation])
  return (
    <group>
      <group position={offset} scale={scale}>
        <primitive object={object} />
      </group>
      <mesh geometry={logo} rotation={[Math.PI / 2, 0, Math.PI]} position={[0, logoY * length, 0]}>
        <meshStandardMaterial color={COLORS.logo} roughness={0.7} side={THREE.DoubleSide} />
      </mesh>
    </group>
  )
}

// Hanging version: twisted rope from the ceiling, shoe tilted so its sole (and logo) face the viewer.
export default function HangingSneaker({
  logoUrl,
  monogramUrl,
  insoleUrl = '/brands/gullylabs/carpet_tile.png',
  length = 5.2,
  x = 0,
  y = 4.2,
  z = 1.8,
  tilt = 0.42, // heel raised (radians)
  showSole = 0.3, // how far the sole is turned towards the viewer (radians)
  ropeX = 0.3,
  ropeColor = '#d8262b',
  sway = true,
  modelUrl, // optional GLB: use the real 3D model instead of the code-built shoe
  modelRotation,
}) {
  const swing = useRef()
  useFrame(({ clock }) => {
    if (sway && swing.current) swing.current.rotation.y = Math.sin(clock.elapsedTime * 0.6) * 0.12
  })
  const ropes = useMemo(() => {
    const top = WALL_HEIGHT
    const bottom = y + length * 0.18
    return [0, Math.PI].map((phase) => {
      const pts = []
      for (let i = 0; i <= 60; i++) {
        const t = i / 60
        const a = phase + t * 9 * Math.PI
        pts.push(new THREE.Vector3(ropeX + Math.cos(a) * 0.05, top - (top - bottom) * t, z + Math.sin(a) * 0.05))
      }
      return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 120, 0.035, 8, false)
    })
  }, [y, length, ropeX, z])

  return (
    <group>
      {ropes.map((g, i) => (
        <mesh key={i} geometry={g} castShadow>
          <meshStandardMaterial color={ropeColor} roughness={0.6} />
        </mesh>
      ))}
      <group position={[x, y, z]}>
        <group ref={swing}>
          <group rotation={[0, 0, tilt]}>
            <group rotation={[-showSole, 0, 0]}>
              {/* flip so the heel points right, like the storefront shoe */}
              <group rotation={[0, Math.PI, 0]} position={[0, -length * 0.08, 0]}>
                {modelUrl ? (
                  <GLBSneaker url={modelUrl} length={length} rotation={modelRotation} logoUrl={logoUrl} />
                ) : (
                  <SneakerModel length={length} logoUrl={logoUrl} monogramUrl={monogramUrl} insoleUrl={insoleUrl} />
                )}
              </group>
            </group>
          </group>
        </group>
      </group>
    </group>
  )
}
