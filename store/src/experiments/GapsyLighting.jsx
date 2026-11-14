// EXPERIMENT: ceiling + light inspired by gapsystudio.com.
//   - ceiling with long recessed light slots (angled sides, glowing panel at the top)
//   - a sun-like light shining down through the slots: the solid ceiling strips cast real shadows,
//     so each slot throws a straight band of light down the walls and across the floor.
//
// Turn on/off with EXPERIMENTS.gapsyLighting in src/brands.js.
// To remove completely: delete this file and the lines marked "gapsy experiment" in
// Store.jsx and App.jsx (and the flag in brands.js).
import { useMemo } from 'react'
import * as THREE from 'three'
import { WALL_HEIGHT, BAY_DEPTH, CORRIDOR_DEPTH, STORE_LENGTH } from '../brands'

const SLOT_SPACING = 5 // distance between light slots along the hall
const SLOT_WIDTH = 2.2 // opening width at the ceiling (= width of each light band)
const SLOT_TOP = 1.4 // width of the glowing panel at the top of the well (sides are angled)
const SLOT_HEIGHT = 0.9 // depth of the light well above the ceiling
const SLAB = 0.2
const T = 0.3

// Ceiling area: from behind the back wall to the front of the walkway.
const Z0 = -BAY_DEPTH - T
const Z1 = CORRIDOR_DEPTH
const DEPTH = Z1 - Z0
const ZC = (Z0 + Z1) / 2

export const SLOT_XS = (() => {
  const xs = []
  for (let x = SLOT_SPACING / 2; x < STORE_LENGTH; x += SLOT_SPACING) xs.push(x)
  return xs
})()

function LightWell({ x }) {
  const lean = Math.atan((SLOT_WIDTH - SLOT_TOP) / 2 / SLOT_HEIGHT)
  const sideH = Math.hypot(SLOT_HEIGHT, (SLOT_WIDTH - SLOT_TOP) / 2)
  const sideX = (SLOT_WIDTH + SLOT_TOP) / 4
  return (
    <group position={[x, WALL_HEIGHT, ZC]}>
      {/* angled sides, lit by the panel above */}
      <mesh position={[-sideX, SLOT_HEIGHT / 2, 0]} rotation={[0, 0, -lean]}>
        <boxGeometry args={[0.03, sideH, DEPTH]} />
        <meshStandardMaterial color="#f4f3f0" emissive="#ffffff" emissiveIntensity={0.45} roughness={0.9} />
      </mesh>
      <mesh position={[sideX, SLOT_HEIGHT / 2, 0]} rotation={[0, 0, lean]}>
        <boxGeometry args={[0.03, sideH, DEPTH]} />
        <meshStandardMaterial color="#f4f3f0" emissive="#ffffff" emissiveIntensity={0.45} roughness={0.9} />
      </mesh>
      {/* glowing light panel at the top of the well (lets the sun through: casts no shadow) */}
      <mesh position={[0, SLOT_HEIGHT, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <planeGeometry args={[SLOT_TOP + 0.05, DEPTH]} />
        <meshBasicMaterial color="#ffffff" side={THREE.DoubleSide} toneMapped={false} />
      </mesh>
    </group>
  )
}

// Ceiling with slots: solid ceiling strips (which cast the shadows) between the light wells.
export function GapsyCeiling({ material }) {
  const strips = useMemo(() => {
    const edges = [0, ...SLOT_XS.flatMap((x) => [x - SLOT_WIDTH / 2, x + SLOT_WIDTH / 2]), STORE_LENGTH + T]
    const out = []
    for (let i = 0; i < edges.length; i += 2) {
      const a = edges[i]
      const b = edges[i + 1]
      if (b > a) out.push({ x: (a + b) / 2, w: b - a })
    }
    return out
  }, [])
  return (
    <group>
      {strips.map((s) => (
        <mesh key={s.x} position={[s.x, WALL_HEIGHT + SLAB / 2, ZC]} castShadow>
          {/* extra height so light can't leak between strips at an angle */}
          <boxGeometry args={[s.w, SLAB, DEPTH]} />
          {material(s.w, DEPTH)}
        </mesh>
      ))}
      {SLOT_XS.map((x) => (
        <LightWell key={x} x={x} />
      ))}
    </group>
  )
}

// Sun-like light shining down through the slots. It comes from above and slightly from the front,
// with no sideways angle: each band falls straight down the wall under its slot and then runs
// straight across the floor toward the viewer.
const SUN_DIR = new THREE.Vector3(0, 1, 0.4).normalize()
const SUN_INTENSITY = 2.4 // strong light through the slots: a bright store
const SHADOW_STRENGTH = 0.16 // how dark the areas between the bands get: 0 = no shadow, 1 = full shadow

export function GapsySun() {
  const target = useMemo(() => new THREE.Object3D(), [])
  const center = new THREE.Vector3(STORE_LENGTH / 2, 0, ZC)
  const pos = center.clone().add(SUN_DIR.clone().multiplyScalar(40))
  const half = STORE_LENGTH / 2 + 10
  return (
    <>
      <primitive object={target} position={center.toArray()} />
      <directionalLight
        position={pos.toArray()}
        target={target}
        intensity={SUN_INTENSITY}
        color="#fff6e8"
        castShadow
        shadow-intensity={SHADOW_STRENGTH}
        shadow-mapSize={[4096, 4096]}
        shadow-bias={-0.0004}
        shadow-normalBias={0.04}
        shadow-camera-left={-half}
        shadow-camera-right={half}
        shadow-camera-top={half}
        shadow-camera-bottom={-half}
        shadow-camera-near={1}
        shadow-camera-far={90}
      />
    </>
  )
}

// General light levels while the experiment is on: close to the normal bright store light,
// so the areas between the bands stay light and the bands are only a gentle brightening.
export const GAPSY_AMBIENT = { ambient: 1.7, hemisphere: 0.95, front: 1.15, fill: 0.4 }
