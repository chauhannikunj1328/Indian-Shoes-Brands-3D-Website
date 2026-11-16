import EntranceShowcase from './EntranceShowcase'
import { Suspense, useMemo, useState } from 'react'
import * as THREE from 'three'
import { useFrame, useLoader } from '@react-three/fiber'
import { MeshReflectorMaterial, Text, useTexture } from '@react-three/drei'
import {
  BRANDS,
  WALL_HEIGHT,
  BAY_DEPTH,
  CORRIDOR_DEPTH,
  BLOCK_WIDTH,
  STORE_LENGTH,
  CTA_WALL,
  ENTRANCE,
  ENTRANCE_WIDTH,
  FLOOR,
  EXPERIMENTS,
  brandSlots,
} from './brands'
import { GapsyCeiling, GapsySun } from './experiments/GapsyLighting' // gapsy experiment
import HangingSneaker from './Sneaker3D'
import ShoeWall from './ShoeWall'
import BrandDisplay from './BrandDisplay'
import CtaWall from './CtaWall'

// Coordinates: x runs left (entrance, x = 0) to right; z = 0 is the line where the
// block fronts / bay openings meet the walkway; the back wall is at z = -BAY_DEPTH
// and the walkway runs from z = 0 to z = CORRIDOR_DEPTH.

const T = 0.3 // wall thickness
const SLAB = 0.2 // floor + ceiling thickness
const BASEBOARD_H = 0.25
const BASEBOARD_T = 0.06 // baseboard thickness (how far it sticks out from the wall)
const WALL_TILE = 4 // world units per wall texture tile
const FLOOR_TILE = 6 // world units per floor texture tile
const STORE_WALL = '#f3f2ef'

const TEXTURES = {
  wall: '/textures/wall.jpg',
  wallNormal: '/textures/wall_normal.jpg',
  floor: '/textures/floor.jpg',
  floorNormal: '/textures/floor_normal.jpg',
}

// Clone a loaded texture and tile it so one tile covers `tile` world units.
function useTiled(tex, w, h, tile, isColor) {
  return useMemo(() => {
    const t = tex.clone()
    t.wrapS = t.wrapT = THREE.RepeatWrapping
    t.repeat.set(w / tile, h / tile)
    if (isColor) t.colorSpace = THREE.SRGBColorSpace
    t.needsUpdate = true
    return t
  }, [tex, w, h, tile, isColor])
}

// Matte plaster (walls, blocks, ceiling).
function PlasterMaterial({ w, h, color, ...props }) {
  const tex = useTexture(TEXTURES)
  const map = useTiled(tex.wall, w, h, WALL_TILE, true)
  const normalMap = useTiled(tex.wallNormal, w, h, WALL_TILE, false)
  return (
    <meshStandardMaterial
      color={color}
      map={map}
      normalMap={normalMap}
      normalScale={[0.25, 0.25]}
      roughness={0.95}
      {...props}
    />
  )
}

// Slim baseboard strip. `position` = point on the wall face at floor level; faces +z after `rotationY`.
function Baseboard({ position, rotationY = 0, width, color = '#f6f5f2' }) {
  return (
    <group position={position} rotation={[0, rotationY, 0]}>
      <mesh position={[0, BASEBOARD_H / 2, BASEBOARD_T / 2]}>
        <boxGeometry args={[width, BASEBOARD_H, BASEBOARD_T]} />
        <meshStandardMaterial color={color} roughness={0.6} />
      </mesh>
    </group>
  )
}

// Solid wall. `position` = centre of the INNER face (at floor level); thickness goes outward.
function Wall({ position, rotationY = 0, width, color = STORE_WALL }) {
  return (
    <group position={position} rotation={[0, rotationY, 0]}>
      <mesh position={[0, WALL_HEIGHT / 2, -T / 2]} castShadow receiveShadow>
        <boxGeometry args={[width, WALL_HEIGHT, T]} />
        <PlasterMaterial w={width} h={WALL_HEIGHT} color={color} />
      </mesh>
      <Baseboard position={[0, 0, 0]} width={width} />
    </group>
  )
}

function Floor({ x, z, w, d }) {
  const tex = useTexture(TEXTURES)
  const map = useTiled(tex.floor, w, d, FLOOR_TILE, true)
  const normalMap = useTiled(tex.floorNormal, w, d, FLOOR_TILE, false)
  return (
    <group>
      <mesh position={[x, -SLAB / 2, z]} receiveShadow>
        <boxGeometry args={[w, SLAB, d]} />
        <meshStandardMaterial map={map} normalMap={normalMap} normalScale={[0.15, 0.15]} roughness={0.55} />
      </mesh>
      {/* glossy glass finish: a reflective light grey surface just on top of the slab */}
      {FLOOR.style === 'glass' && <GlassFloor x={x} z={z} w={w} d={d} />}
    </group>
  )
}

// Light grey polished-glass floor that reflects the walls, blocks and bays above it,
// optionally over a texture (e.g. marble slabs).
function GlassFloor({ x, z, w, d }) {
  return FLOOR.texture ? <GlassFloorTextured x={x} z={z} w={w} d={d} /> : <GlassFloorSurface x={x} z={z} w={w} d={d} />
}

function GlassFloorTextured(props) {
  const tex = useTexture(FLOOR.texture)
  const map = useMemo(() => {
    const t = tex.clone()
    t.wrapS = t.wrapT = THREE.RepeatWrapping
    t.repeat.set(props.w / FLOOR.textureTile, props.d / FLOOR.textureTile)
    t.colorSpace = THREE.SRGBColorSpace
    t.anisotropy = 8
    t.needsUpdate = true
    return t
  }, [tex, props.w, props.d])
  return <GlassFloorSurface {...props} map={map} />
}

function GlassFloorSurface({ x, z, w, d, map }) {
  return (
    <mesh position={[x, 0.002, z]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
      <planeGeometry args={[w, d]} />
      <MeshReflectorMaterial
        map={map ?? null}
        color={map ? '#ffffff' : FLOOR.color}
        mirror={FLOOR.mirror} // how strong the reflection is
        blur={[400, 120]} // soft blur, like polished glass rather than a perfect mirror
        mixBlur={0.8}
        mixStrength={FLOOR.reflectionStrength}
        resolution={1024}
        depthScale={0.6}
        minDepthThreshold={0.4}
        maxDepthThreshold={1.2}
        roughness={0.25}
        metalness={0.1}
      />
    </mesh>
  )
}

function Ceiling({ x, z, w, d }) {
  return (
    <mesh position={[x, WALL_HEIGHT + SLAB / 2, z]}>
      <boxGeometry args={[w, SLAB, d]} />
      <PlasterMaterial w={w} h={d} color="#f7f6f3" />
    </mesh>
  )
}

function Logo({ url, width }) {
  const tex = useTexture(url)
  const ratio = tex.image ? tex.image.height / tex.image.width : 0.4
  return (
    <mesh>
      <planeGeometry args={[width, width * ratio]} />
      <meshBasicMaterial map={tex} transparent toneMapped={false} />
    </mesh>
  )
}

// Halo-lit 3D sign, like Comet's store signage: the traced logo outline is extruded into solid
// letters with a small bevel, mounted on stand-offs a little in front of the wall, with a soft
// light glowing on the wall behind them. `shapeUrl` = outlines JSON from make-comet-block.py.
const SIGN_DEPTH = 0.16 // letter thickness
const SIGN_STANDOFF = 0.12 // gap between the wall and the back of the letters (where the halo light shines)
const SIGN_BEVEL = { thickness: 0.025, size: 0.012, segments: 3 } // small rounded front edges

// Build an extruded 3D shape from a traced-outline JSON (from make-comet-block.py / make-gully-assets.py).
function useExtrudedLogo(url, width, depth) {
  return useExtrudedLogoWithSize(url, width, depth).geometry
}

function useExtrudedLogoWithSize(url, width, depth) {
  const data = useLoader(THREE.FileLoader, url)
  const parsed = useMemo(() => JSON.parse(data), [data])
  const geometry = useMemo(() => {
    const { shapes } = parsed
    const toV = ([x, y]) => new THREE.Vector2(x * width, y * width)
    const threeShapes = shapes.map((s) => {
      const shape = new THREE.Shape(s.outer.map(toV))
      s.holes.forEach((h) => shape.holes.push(new THREE.Path(h.map(toV))))
      return shape
    })
    return new THREE.ExtrudeGeometry(threeShapes, {
      depth,
      bevelEnabled: true,
      bevelThickness: SIGN_BEVEL.thickness,
      bevelSize: SIGN_BEVEL.size,
      bevelSegments: SIGN_BEVEL.segments,
    })
  }, [parsed, width, depth])
  return { geometry, height: parsed.height * width }
}

// Signboard behind the logo (like Gully Labs' blue store signs): a rectangle with notched corners,
// raised off the wall. The letters sit on its face.
function SignPanel({ w, h, notch, depth, color }) {
  const geometry = useMemo(() => {
    const x = w / 2
    const y = h / 2
    const n = notch
    const s = new THREE.Shape()
    s.moveTo(-x + n, -y)
    s.lineTo(x - n, -y)
    s.lineTo(x, -y + n)
    s.lineTo(x, y - n)
    s.lineTo(x - n, y)
    s.lineTo(-x + n, y)
    s.lineTo(-x, y - n)
    s.lineTo(-x, -y + n)
    s.closePath()
    return new THREE.ExtrudeGeometry(s, {
      depth,
      bevelEnabled: true,
      bevelThickness: 0.02,
      bevelSize: 0.02,
      bevelSegments: 2,
    })
  }, [w, h, notch, depth])
  return (
    <mesh geometry={geometry} castShadow receiveShadow>
      <meshStandardMaterial color={color} roughness={0.55} />
    </mesh>
  )
}

// Soft halo glow on the wall behind a sign.
function HaloGlow({ url, pad, width, strength }) {
  const glow = useTexture(url)
  const glowW = width * (1 + 2 * pad)
  const glowH = glow.image ? (glowW * glow.image.height) / glow.image.width : glowW * 0.5
  return (
    <mesh position={[0, 0, 0.01]}>
      <planeGeometry args={[glowW, glowH]} />
      <meshBasicMaterial
        map={glow}
        transparent
        opacity={strength}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
        toneMapped={false}
      />
    </mesh>
  )
}

// Piping border behind the letters (like the navy piping around the star panel on Comet's Ajrakh shoe).
// Slightly thinner than the letters, so the letter faces stand just proud of the piping.
const PIPING_INSET = 0.05

function SignPiping({ url, width, color, depth = SIGN_DEPTH }) {
  const geometry = useExtrudedLogo(url, width, depth - PIPING_INSET)
  return (
    <mesh geometry={geometry} position={[0, 0, SIGN_STANDOFF - 0.01]} castShadow>
      <meshStandardMaterial color={color} roughness={0.6} />
    </mesh>
  )
}

export function HaloSign({
  shapeUrl,
  outlineUrl,
  outlineColor,
  glowUrl,
  glowPad,
  width,
  color,
  glowStrength = 0.35,
  panel, // optional signboard behind the letters: { color, padX, padY, notch, depth }
  depth = SIGN_DEPTH, // letter thickness (per brand)
  letterGlow = 0.05, // how much the letters themselves light up (emissive), 0 = lit only by the room
}) {
  const { geometry, height } = useExtrudedLogoWithSize(shapeUrl, width, depth)
  // with a signboard, the letters sit on its face; otherwise they stand off the wall
  const lettersZ = panel ? panel.depth + 0.03 : SIGN_STANDOFF

  return (
    <group>
      {/* halo: light from behind the letters washing over the wall */}
      {glowUrl && <HaloGlow url={glowUrl} pad={glowPad} width={width} strength={glowStrength} />}
      {panel && (
        <SignPanel
          w={width + panel.padX * 2}
          h={height + panel.padY * 2}
          notch={panel.notch}
          depth={panel.depth}
          color={panel.color}
        />
      )}
      {/* optional piping border just behind the letters */}
      {outlineUrl && <SignPiping url={outlineUrl} width={width} color={outlineColor} depth={depth} />}
      {/* raised letters */}
      <mesh geometry={geometry} position={[0, 0, lettersZ]} castShadow>
        <meshStandardMaterial color={color} roughness={0.75} metalness={0} emissive={color} emissiveIntensity={letterGlow} />
      </mesh>
    </group>
  )
}

// Block finish: plaster by default, or a brand texture (e.g. Comet's charcoal concrete).
function BlockMaterial({ brand, ...props }) {
  if (brand.block?.finish) return <FinishMaterial url={brand.block.finish} tile={brand.block.finishTile ?? 5} {...props} />
  return <PlasterMaterial w={BLOCK_WIDTH} h={WALL_HEIGHT} color={brand.wallColor} {...props} />
}

function FinishMaterial({ url, tile, ...props }) {
  const tex = useTexture(url)
  const map = useTiled(tex, BLOCK_WIDTH, WALL_HEIGHT, tile, true)
  return <meshStandardMaterial map={map} roughness={0.9} {...props} />
}

// Pattern on the block's front (logo) face only, e.g. Comet's Ajrakh block-print cloth.
// The tile keeps its own proportions: `tileWidth` world units wide.
// Grey bump (relief) map tiled every `tile` world units, for real material grain (leather, canvas...).
export function useBumpMap(url, repeatX, repeatY) {
  const tex = useTexture(url)
  return useMemo(() => {
    const t = tex.clone()
    t.wrapS = t.wrapT = THREE.RepeatWrapping
    t.repeat.set(repeatX, repeatY)
    t.anisotropy = 8
    t.needsUpdate = true
    return t
  }, [tex, repeatX, repeatY])
}

function BumpedPatternMaterial({ url, tileWidth, bump, bumpTile = 1, bumpScale = 1.5, ...props }) {
  const bumpMap = useBumpMap(bump, BLOCK_WIDTH / bumpTile, WALL_HEIGHT / bumpTile)
  return <FrontPatternMaterial url={url} tileWidth={tileWidth} bumpMap={bumpMap} bumpScale={bumpScale} roughness={0.62} {...props} />
}

// A real hand-knotted rug hanging in front of the block: soft pile with knot relief, gentle folds,
// 3D fringe threads at the bottom, hung over a powder-coated rod with brass finials on wall brackets.
function HangingRug({ texture, bump, width = 4.8, height = 6, top = 7.1, offset = 0.14, rodColor = '#1d4fc9', fringeColor = '#efe3c8' }) {
  const map = useTexture(texture)
  const rugMap = useMemo(() => {
    const t = map.clone()
    t.colorSpace = THREE.SRGBColorSpace
    t.anisotropy = 8
    t.needsUpdate = true
    return t
  }, [map])
  const bumpMap = useBumpMap(bump, width * 3, height * 3)
  // gently draped plane: soft vertical folds, stronger towards the bottom; bulges a little over the rod
  const geo = useMemo(() => {
    const g = new THREE.PlaneGeometry(width, height, 80, 80)
    const p = g.attributes.position
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i)
      const y = p.getY(i)
      const down = (height / 2 - y) / height // 0 at top .. 1 at bottom
      const fold = Math.sin((x / width) * Math.PI * 5 + 0.6) * 0.035 * (0.3 + down) + Math.sin((x / width) * Math.PI * 11) * 0.008
      p.setZ(i, fold + 0.02 * Math.sin(down * Math.PI))
    }
    g.computeVertexNormals()
    return g
  }, [width, height])
  // fringe threads: thin twisted cords along the bottom edge
  const fringe = useMemo(() => {
    const n = 70
    const out = []
    for (let i = 0; i < n; i++) {
      const x = -width / 2 + 0.06 + (i * (width - 0.12)) / (n - 1)
      const len = 0.32 + ((i * 37) % 11) * 0.008
      const fx = Math.sin((x / width) * Math.PI * 5 + 0.6) * 0.035 * 1.3
      out.push({ x, len, z: fx, lean: (((i * 53) % 7) - 3) * 0.012 })
    }
    return out
  }, [width])
  const rodY = top + 0.06
  const rodLen = width + 0.4
  return (
    <group position={[0, 0, offset]}>
      <mesh geometry={geo} position={[0, top - height / 2, 0]} castShadow>
        <meshPhysicalMaterial map={rugMap} bumpMap={bumpMap} bumpScale={2.5} roughness={0.92} sheen={0.35} sheenRoughness={0.9} sheenColor="#8a3424" side={THREE.DoubleSide} />
      </mesh>
      {/* fold of the rug looping over the rod */}
      <mesh position={[0, rodY, -0.005]} rotation={[0, 0, Math.PI / 2]} castShadow>
        <cylinderGeometry args={[0.075, 0.075, width, 24, 1, true, Math.PI, Math.PI]} />
        <meshStandardMaterial color="#1b2a6e" roughness={1} side={THREE.DoubleSide} />
      </mesh>
      {fringe.map((f, i) => (
        <mesh key={i} position={[f.x + f.lean / 2, top - height - f.len / 2 + 0.01, f.z]} rotation={[0, 0, f.lean]}>
          <cylinderGeometry args={[0.012, 0.008, f.len, 5]} />
          <meshStandardMaterial color={fringeColor} roughness={1} />
        </mesh>
      ))}
      {/* rod, finials and wall brackets */}
      <mesh position={[0, rodY, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
        <cylinderGeometry args={[0.045, 0.045, rodLen, 24]} />
        <meshStandardMaterial color={rodColor} metalness={0.55} roughness={0.32} />
      </mesh>
      {[-1, 1].map((s) => (
        <group key={s}>
          <mesh position={[s * (rodLen / 2 + 0.06), rodY, 0]} castShadow>
            <sphereGeometry args={[0.085, 24, 16]} />
            <meshStandardMaterial color="#c9a14f" metalness={1} roughness={0.28} />
          </mesh>
          <mesh position={[s * (width / 2 + 0.1), rodY, -offset / 2]} rotation={[Math.PI / 2, 0, 0]} castShadow>
            <cylinderGeometry args={[0.025, 0.025, offset, 12]} />
            <meshStandardMaterial color="#c9a14f" metalness={1} roughness={0.3} />
          </mesh>
          <mesh position={[s * (width / 2 + 0.1), rodY, -offset + 0.01]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.07, 0.07, 0.02, 24]} />
            <meshStandardMaterial color="#c9a14f" metalness={1} roughness={0.3} />
          </mesh>
        </group>
      ))}
    </group>
  )
}

function FrontPatternMaterial({ url, tileWidth, ...props }) {
  const tex = useTexture(url)
  const map = useMemo(() => {
    const t = tex.clone()
    const tileH = tex.image ? (tileWidth * tex.image.height) / tex.image.width : tileWidth
    t.wrapS = t.wrapT = THREE.RepeatWrapping
    t.repeat.set(BLOCK_WIDTH / tileWidth, WALL_HEIGHT / tileH)
    t.colorSpace = THREE.SRGBColorSpace
    t.anisotropy = 8
    t.needsUpdate = true
    return t
  }, [tex, tileWidth])
  return <meshStandardMaterial map={map} roughness={0.95} {...props} />
}

// The block box's six faces in three.js order: +x, -x, +y, -y, +z (front / logo face), -z.
const FRONT_FACE = 4

function BlockFaces({ brand }) {
  const front = brand.block?.front
  if (!front) return <BlockMaterial brand={brand} />
  const Mat = front.bump ? BumpedPatternMaterial : FrontPatternMaterial
  const bumpProps = front.bump ? { bump: front.bump, bumpTile: front.bumpTile, bumpScale: front.bumpScale } : {}
  return [0, 1, 2, 3, 4, 5].map((i) =>
    i === FRONT_FACE || front.allFaces ? (
      <Mat key={i} attach={`material-${i}`} url={front.texture} tileWidth={front.tileWidth} {...bumpProps} />
    ) : front.sideTexture && (i === 0 || i === 1) ? (
      // the two side faces (they are also the side walls of the neighbouring bays)
      <Mat key={i} attach={`material-${i}`} url={front.sideTexture} tileWidth={front.tileWidth} {...bumpProps} />
    ) : (
      <BlockMaterial key={i} attach={`material-${i}`} brand={brand} />
    ),
  )
}

// Giant shoe hanging on a twisted rope in front of a block (like Gully Labs' flagship storefront).
// `image` = cut-out photo (transparent PNG); position is relative to the block's front-face centre.
function HangingShoe({ image, width, x = 0, y = 4.3, z = 1.6, ropeX = 0, ropeColor = '#1d3fc4' }) {
  const tex = useTexture(image)
  const map = useMemo(() => {
    const t = tex.clone()
    t.colorSpace = THREE.SRGBColorSpace
    t.anisotropy = 8
    t.needsUpdate = true
    return t
  }, [tex])
  const h = tex.image ? (width * tex.image.height) / tex.image.width : width * 0.7
  // rope: two strands twisted around each other, from the ceiling down to the shoe's tongue
  const ropes = useMemo(() => {
    const top = WALL_HEIGHT
    const bottom = y + h * 0.32
    return [0, Math.PI].map((phase) => {
      const pts = []
      for (let i = 0; i <= 60; i++) {
        const t = i / 60
        const yy = top - (top - bottom) * t
        const a = phase + t * 9 * Math.PI
        pts.push(new THREE.Vector3(ropeX + Math.cos(a) * 0.05, yy, z - 0.05 + Math.sin(a) * 0.05))
      }
      return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 120, 0.035, 8, false)
    })
  }, [y, h, ropeX, z])
  return (
    <group>
      {ropes.map((g, i) => (
        <mesh key={i} geometry={g} castShadow>
          <meshStandardMaterial color={ropeColor} roughness={0.6} />
        </mesh>
      ))}
      <mesh position={[x, y, z]}>
        <planeGeometry args={[width, h]} />
        <meshStandardMaterial map={map} transparent alphaTest={0.4} side={THREE.DoubleSide} roughness={0.7} />
      </mesh>
    </group>
  )
}

// Spotlight from the ceiling onto the floor in front of a block, so the eye goes there first.
// Soft radial gradient texture (white centre fading to transparent) for the light pool and beam.
function useRadialTexture() {
  return useMemo(() => {
    const c = document.createElement('canvas')
    c.width = c.height = 256
    const g = c.getContext('2d')
    const grd = g.createRadialGradient(128, 128, 0, 128, 128, 128)
    grd.addColorStop(0, 'rgba(255,255,255,1)')
    grd.addColorStop(0.45, 'rgba(255,255,255,0.75)')
    grd.addColorStop(0.75, 'rgba(255,255,255,0.25)')
    grd.addColorStop(1, 'rgba(255,255,255,0)')
    g.fillStyle = grd
    g.fillRect(0, 0, 256, 256)
    const t = new THREE.CanvasTexture(c)
    t.colorSpace = THREE.SRGBColorSpace
    return t
  }, [])
}

// Focus light: a spotlight from the ceiling, plus a visible bright pool on the floor and a faint
// light beam, so the eye goes to this block first.
function FocusLight({ cx, floorZ = 2.2, intensity = 180, angle = 0.36, color = '#fff6e6', poolRadius = 2.6, poolStrength = 0.9, beam = 0.07 }) {
  const target = useMemo(() => new THREE.Object3D(), [])
  const radial = useRadialTexture()
  const top = WALL_HEIGHT - 0.02
  const beamH = top - 0.02
  return (
    <>
      {/* bright pool on the floor */}
      <mesh position={[cx, 0.025, floorZ]} rotation={[-Math.PI / 2, 0, 0]} renderOrder={2}>
        <circleGeometry args={[poolRadius, 64]} />
        <meshBasicMaterial map={radial} color={color} transparent opacity={poolStrength} depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} />
      </mesh>
      {/* faint light beam from the ceiling fixture to the pool */}
      {beam > 0 && (
        <mesh position={[cx, beamH / 2, floorZ]} renderOrder={3}>
          <cylinderGeometry args={[0.18, poolRadius * 0.8, beamH, 48, 1, true]} />
          <meshBasicMaterial color={color} transparent opacity={beam} depthWrite={false} side={THREE.DoubleSide} blending={THREE.AdditiveBlending} toneMapped={false} />
        </mesh>
      )}
      <primitive object={target} position={[cx, 0, floorZ]} />
      <spotLight
        position={[cx, WALL_HEIGHT - 0.15, floorZ + 1.6]}
        target={target}
        angle={angle}
        penumbra={0.55}
        intensity={intensity}
        distance={20}
        decay={1.5}
        color={color}
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-bias={-0.0005}
      />
    </>
  )
}

// Solid brand block (full height, BLOCK_WIDTH x BAY_DEPTH) with the brand logo on its front face.
function BrandBlock({ brand, slot }) {
  const { cx } = slot
  const sign = brand.block?.sign
  const trim = brand.block?.baseboard
  return (
    <group>
      <mesh position={[cx, WALL_HEIGHT / 2, -BAY_DEPTH / 2]} castShadow receiveShadow>
        <boxGeometry args={[BLOCK_WIDTH, WALL_HEIGHT, BAY_DEPTH]} />
        <BlockFaces brand={brand} />
      </mesh>
      {/* baseboards on the three visible faces: front, left, right.
          They run past the block's front corners by the baseboard thickness so the corners join cleanly. */}
      <Baseboard position={[cx, 0, 0]} width={BLOCK_WIDTH + BASEBOARD_T * 2} color={trim} />
      <Baseboard
        position={[slot.x0, 0, -BAY_DEPTH / 2 + BASEBOARD_T / 2]}
        rotationY={-Math.PI / 2}
        width={BAY_DEPTH + BASEBOARD_T}
        color={trim}
      />
      <Baseboard
        position={[slot.x1, 0, -BAY_DEPTH / 2 + BASEBOARD_T / 2]}
        rotationY={Math.PI / 2}
        width={BAY_DEPTH + BASEBOARD_T}
        color={trim}
      />

      {brand.block?.rug && (
        <group position={[cx, 0, 0]}>
          <HangingRug {...brand.block.rug} />
        </group>
      )}

      {/* real 3D sneaker hanging in front of the block (or the older flat photo cut-out) */}
      {brand.block?.hangingSneaker3d ? (
        <group position={[cx, 0, 0]}>
          <HangingSneaker {...brand.block.hangingSneaker3d} />
        </group>
      ) : (
        brand.block?.hangingShoe && (
          <group position={[cx, 0, 0]}>
            <HangingShoe {...brand.block.hangingShoe} />
          </group>
        )
      )}
      {/* focus light: a spotlight from the ceiling onto the floor in front of the block */}
      {brand.block?.focusLight && <FocusLight cx={cx} {...brand.block.focusLight} />}

      <group position={[cx, WALL_HEIGHT * (brand.block?.logoY ?? 0.55), 0.02]}>
        {brand.block?.hideLogo ? null : sign ? (
          <HaloSign
            shapeUrl={sign.shape}
            outlineUrl={sign.outline}
            outlineColor={sign.outlineColor}
            glowUrl={sign.glow}
            glowPad={sign.glowPad}
            width={BLOCK_WIDTH * sign.widthRatio}
            color={sign.color}
            glowStrength={sign.glowStrength}
            panel={sign.panel}
            depth={sign.depth}
          />
        ) : brand.logo ? (
          <Logo url={brand.logo} width={BLOCK_WIDTH * 0.6} />
        ) : (
          <Text fontSize={1.1} color={brand.accent} anchorX="center" anchorY="middle">
            {brand.name}
          </Text>
        )}
      </group>
    </group>
  )
}

// A flat graphic panel laid over a wall face. `position` = centre of the face; faces +z after `rotationY`.
function Panel({ url, bump, ...props }) {
  return bump ? <BumpedPanel url={url} bump={bump} {...props} /> : <PlainPanel url={url} {...props} />
}

function BumpedPanel({ bump, w, h, bumpTile = 1.4, bumpScale = 1.2, ...props }) {
  const bumpMap = useBumpMap(bump, w / bumpTile, h / bumpTile)
  return <PlainPanel w={w} h={h} bumpMap={bumpMap} bumpScale={bumpScale} roughness={0.62} {...props} />
}

function PlainPanel({ url, position, rotationY = 0, w, h, tile, roughness = 0.9, ...matProps }) {
  const tex = useTexture(url)
  const map = useMemo(() => {
    const t = tex.clone()
    if (tile) {
      // `tile` = world units per texture across; the height keeps the image's own proportions
      const tileH = tex.image ? (tile * tex.image.height) / tex.image.width : tile
      t.wrapS = t.wrapT = THREE.RepeatWrapping
      t.repeat.set(w / tile, h / tileH)
    }
    t.colorSpace = THREE.SRGBColorSpace
    t.anisotropy = 8
    t.needsUpdate = true
    return t
  }, [tex, w, h, tile])
  return (
    <mesh position={position} rotation={[0, rotationY, 0]} receiveShadow>
      <planeGeometry args={[w, h]} />
      <meshStandardMaterial map={map} roughness={roughness} {...matProps} />
    </mesh>
  )
}

// Transparent graphic (e.g. a tagline strip) laid over a wall face. Faces +z.
const TAGLINE_H = WALL_HEIGHT * 0.12 // tagline strip height: top 12% of the back wall

function Overlay({ url, position, w, h }) {
  const tex = useTexture(url)
  const map = useMemo(() => {
    const t = tex.clone()
    t.colorSpace = THREE.SRGBColorSpace
    t.anisotropy = 8
    t.needsUpdate = true
    return t
  }, [tex])
  return (
    <mesh position={position}>
      <planeGeometry args={[w, h]} />
      <meshStandardMaterial map={map} transparent roughness={0.9} depthWrite={false} />
    </mesh>
  )
}

// Coloured baseboard that sits over the plain one, for themed bays.
function TrimBaseboard({ position, rotationY = 0, width, color }) {
  return (
    <group position={position} rotation={[0, rotationY, 0]}>
      <mesh position={[0, BASEBOARD_H / 2 + 0.005, 0.035]}>
        <boxGeometry args={[width, BASEBOARD_H + 0.01, 0.07]} />
        <meshStandardMaterial color={color} roughness={0.6} />
      </mesh>
    </group>
  )
}

// The brand's bay (open to the walkway): back wall + two side faces. Shoes will hang on the back wall.
// If the brand has a `bay` theme, its graphics cover the three walls.
function BrandBay({ brand, slot }) {
  const theme = brand.bay
  const off = 0.006 // lift panels just off the wall to avoid flicker
  const midY = WALL_HEIGHT / 2
  const midZ = -BAY_DEPTH / 2
  return (
    <group>
      {theme && (
        <>
          {/* back wall: either a full graphic, or the same grid as the side walls with a tagline strip on top */}
          {theme.backPlain ? (
            // plain back wall (minimal, for the shoes) with just the tagline strip on top;
            // `back` adds a finish image under it (e.g. Gully Labs' cream leather)
            <>
              {theme.back && (
                <Panel url={theme.back} bump={theme.backBump} position={[slot.cx, midY, -BAY_DEPTH + off]} w={slot.x1 - slot.x0} h={WALL_HEIGHT} />
              )}
              {theme.tagline && (
                <Overlay
                  url={theme.tagline}
                  position={[slot.cx, WALL_HEIGHT - TAGLINE_H / 2, -BAY_DEPTH + off * 2]}
                  w={slot.x1 - slot.x0}
                  h={TAGLINE_H}
                />
              )}
            </>
          ) : theme.backGrid ? (
            <>
              <Panel
                url={theme.sides}
                position={[slot.cx, midY, -BAY_DEPTH + off]}
                w={slot.x1 - slot.x0}
                h={WALL_HEIGHT}
                tile={theme.sidesTile}
              />
              {theme.tagline && (
                <Overlay
                  url={theme.tagline}
                  position={[slot.cx, WALL_HEIGHT - TAGLINE_H / 2, -BAY_DEPTH + off * 2]}
                  w={slot.x1 - slot.x0}
                  h={TAGLINE_H}
                />
              )}
            </>
          ) : (
            <Panel url={theme.back} position={[slot.cx, midY, -BAY_DEPTH + off]} w={slot.x1 - slot.x0} h={WALL_HEIGHT} />
          )}
          {/* left side = right face of this brand's block (faces +x) */}
          <Panel url={theme.sides} bump={theme.sidesBump} position={[slot.x0 + off, midY, midZ]} rotationY={Math.PI / 2} w={BAY_DEPTH} h={WALL_HEIGHT} tile={theme.sidesTile} />
          {/* right side = left face of the next block or the end wall (faces -x) */}
          <Panel url={theme.sides} bump={theme.sidesBump} position={[slot.x1 - off, midY, midZ]} rotationY={-Math.PI / 2} w={BAY_DEPTH} h={WALL_HEIGHT} tile={theme.sidesTile} />

          <TrimBaseboard position={[slot.cx, 0, -BAY_DEPTH]} width={slot.x1 - slot.x0} color={theme.trim} />
          <TrimBaseboard position={[slot.x0, 0, midZ]} rotationY={Math.PI / 2} width={BAY_DEPTH} color={theme.trim} />
          <TrimBaseboard position={[slot.x1, 0, midZ]} rotationY={-Math.PI / 2} width={BAY_DEPTH} color={theme.trim} />
        </>
      )}
      {/* light from the ceiling slots: pools on the back wall under each slot, a soft wash on the side walls */}
      {EXPERIMENTS.gapsyLighting && (
        <>
          <WallLight w={slot.x1 - slot.x0} h={WALL_HEIGHT} mode="pools" offset={SLOT_STEP / 2 - (slot.x0 % SLOT_STEP)} position={[slot.cx, midY, -BAY_DEPTH + 0.009]} />
          <WallLight w={BAY_DEPTH} h={WALL_HEIGHT} mode="wash" strength={0.2} position={[slot.x0 + 0.009, midY, midZ]} rotationY={Math.PI / 2} />
          <WallLight w={BAY_DEPTH} h={WALL_HEIGHT} mode="wash" strength={0.2} position={[slot.x1 - 0.009, midY, midZ]} rotationY={-Math.PI / 2} />
        </>
      )}
      {theme?.shelves ? (
        <BayShelves shelves={theme.shelves} slot={slot} brand={brand.id} brandName={brand.tabLabel ?? brand.name} />
      ) : (
        <Text
          position={[slot.cx, WALL_HEIGHT * 0.45, -BAY_DEPTH + 0.02]}
          fontSize={0.35}
          color={theme?.label ?? '#9a9a96'}
          anchorX="center"
          anchorY="middle"
        >
          shoes go here
        </Text>
      )}
    </group>
  )
}

// Light from the ceiling slots on a wall (adds light only, never darkens).
//   pools: a soft vertical band of light under each ceiling light slot, ceiling to floor (slots run front-to-back every SLOT_STEP units),
//          for walls that face the slots (bay back walls). `offset` = x of the first slot from the wall's left end.
//   wash:  an even glow, brightest under the ceiling, for walls that run along the slots (bay side walls).
const SLOT_STEP = 5 // must match SLOT_SPACING in experiments/GapsyLighting.jsx

export function WallLight({ w, h, mode = 'pools', offset = SLOT_STEP / 2, strength = 0.4, color = '#fff4e2', position, rotationY = 0 }) {
  const tex = useMemo(() => {
    const W = 1024
    const H = Math.round((W * h) / w)
    const c = document.createElement('canvas')
    c.width = W
    c.height = H
    const g = c.getContext('2d')
    const px = W / w
    if (mode === 'pools') {
      // a vertical band of light under each slot, top to floor (like the Gapsy wall light):
      // brightest at the ceiling, still clearly lit at the floor, soft edges
      for (let x = offset; x < w; x += SLOT_STEP) {
        const half = 1.35 * px
        const across = g.createLinearGradient(x * px - half, 0, x * px + half, 0)
        across.addColorStop(0, 'rgba(255,255,255,0)')
        across.addColorStop(0.3, 'rgba(255,255,255,0.8)')
        across.addColorStop(0.5, 'rgba(255,255,255,1)')
        across.addColorStop(0.7, 'rgba(255,255,255,0.8)')
        across.addColorStop(1, 'rgba(255,255,255,0)')
        g.fillStyle = across
        g.fillRect(x * px - half, 0, half * 2, H)
      }
      // fade towards the floor (multiply alpha by a vertical ramp)
      g.globalCompositeOperation = 'destination-in'
      const down = g.createLinearGradient(0, 0, 0, H)
      down.addColorStop(0, 'rgba(0,0,0,1)')
      down.addColorStop(1, 'rgba(0,0,0,0.45)')
      g.fillStyle = down
      g.fillRect(0, 0, W, H)
      g.globalCompositeOperation = 'source-over'
    } else {
      const grd = g.createLinearGradient(0, 0, 0, H)
      grd.addColorStop(0, 'rgba(255,255,255,0.85)')
      grd.addColorStop(0.45, 'rgba(255,255,255,0.3)')
      grd.addColorStop(1, 'rgba(255,255,255,0)')
      g.fillStyle = grd
      g.fillRect(0, 0, W, H)
    }
    const t = new THREE.CanvasTexture(c)
    t.colorSpace = THREE.SRGBColorSpace
    return t
  }, [w, h, mode, offset])
  return (
    <mesh position={position} rotation={[0, rotationY, 0]} renderOrder={1}>
      <planeGeometry args={[w, h]} />
      <meshBasicMaterial map={tex} color={color} transparent opacity={strength} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} />
    </mesh>
  )
}

// The same slot light on the floor: a stripe under each ceiling slot running front-to-back,
// brightest near the back wall and fading towards the walkway's front edge.
function FloorLightBands({ strength = 0.22, color = '#fff4e2' }) {
  const tex = useMemo(() => {
    const c = document.createElement('canvas')
    c.width = 128
    c.height = 512
    const g = c.getContext('2d')
    const across = g.createLinearGradient(0, 0, 128, 0)
    across.addColorStop(0, 'rgba(255,255,255,0)')
    across.addColorStop(0.3, 'rgba(255,255,255,0.8)')
    across.addColorStop(0.5, 'rgba(255,255,255,1)')
    across.addColorStop(0.7, 'rgba(255,255,255,0.8)')
    across.addColorStop(1, 'rgba(255,255,255,0)')
    g.fillStyle = across
    g.fillRect(0, 0, 128, 512)
    g.globalCompositeOperation = 'destination-in'
    const along = g.createLinearGradient(0, 0, 0, 512) // top of the image = back wall
    along.addColorStop(0, 'rgba(0,0,0,1)')
    along.addColorStop(1, 'rgba(0,0,0,0.25)')
    g.fillStyle = along
    g.fillRect(0, 0, 128, 512)
    const t = new THREE.CanvasTexture(c)
    t.colorSpace = THREE.SRGBColorSpace
    return t
  }, [])
  const xs = []
  for (let x = SLOT_STEP / 2; x < STORE_LENGTH; x += SLOT_STEP) xs.push(x)
  const len = BAY_DEPTH + CORRIDOR_DEPTH
  return xs.map((x) => (
    <mesh key={x} position={[x, 0.012, -BAY_DEPTH + len / 2]} rotation={[-Math.PI / 2, 0, 0]} renderOrder={1}>
      <planeGeometry args={[2.7, len]} />
      <meshBasicMaterial map={tex} color={color} transparent opacity={strength} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} />
    </mesh>
  ))
}

// Shoe shelves on the bay's walls. Each wall section: { list, heading, ...ShoeWall options }.
//   left  = the block's side wall (left as you face the back wall)
//   backLeft / backRight = left / right half of the back wall
//   right = the right side wall
// All 3D shoe models load from the start (the shoe photos stand in only while a model downloads).
// A bay's shoes (the 3D models) are only on screen while the camera is near the bay: they start loading when the camera
// comes within SHOES_ENTER units and are freed again beyond SHOES_LEAVE. At any time that is one bay, two while walking
// between them, instead of all ~190 shoes (~480 MB of graphics memory, which crashed phones).
const SHOES_ENTER = 20
const SHOES_LEAVE = 26

function BayShelves({ shelves, slot, brand, brandName }) {
  const [active, setActive] = useState(false)
  useFrame(({ camera }) => {
    const x = camera.position.x
    const d = x < slot.x0 ? slot.x0 - x : x > slot.x1 ? x - slot.x1 : 0
    if (!active && d < SHOES_ENTER) setActive(true)
    else if (active && d > SHOES_LEAVE) setActive(false)
  })
  const bw = slot.x1 - slot.x0
  const place = {
    left: { position: [slot.x0 + 0.01, 0, -BAY_DEPTH / 2 - 0.1], rotation: [0, Math.PI / 2, 0] },
    right: { position: [slot.x1 - 0.01, 0, -BAY_DEPTH / 2 - 0.1], rotation: [0, -Math.PI / 2, 0] },
    backLeft: { position: [slot.x0 + bw / 4, 0, -BAY_DEPTH + 0.01], rotation: [0, 0, 0] },
    backRight: { position: [slot.x0 + (3 * bw) / 4, 0, -BAY_DEPTH + 0.01], rotation: [0, 0, 0] },
  }
  return Object.entries(shelves).map(([where, cfg]) =>
    place[where] ? (
      <group key={where} position={place[where].position} rotation={place[where].rotation}>
        {cfg.showcase ? (
          <BrandDisplay showcase={cfg.showcase} brand={brand} brandName={brandName} active={active} />
        ) : (
          <ShoeWall {...cfg} brand={brand} brandName={brandName} active={active} />
        )}
      </group>
    ) : null,
  )
}

export default function Store() {
  const L = STORE_LENGTH
  const backZ = -BAY_DEPTH
  // floor/ceiling: from behind the back wall to the front edge of the walkway, and under the end wall
  const slabW = L + T
  const slabD = BAY_DEPTH + T + CORRIDOR_DEPTH
  const slabX = slabW / 2
  const slabZ = (CORRIDOR_DEPTH - BAY_DEPTH - T) / 2

  return (
    <group>
      <Floor x={slabX} z={slabZ} w={slabW} d={slabD} />
      {EXPERIMENTS.gapsyLighting ? (
        // gapsy experiment: slotted light ceiling + wall-wash spotlights
        <>
          <GapsyCeiling material={(w, d) => <PlasterMaterial w={w} h={d} color="#f7f6f3" />} />
          <GapsySun />
          <FloorLightBands />
        </>
      ) : (
        <Ceiling x={slabX} z={slabZ} w={slabW} d={slabD} />
      )}

      {/* one long back wall behind every block and bay */}
      <Wall position={[L / 2, 0, backZ]} width={L} />
      {/* end wall closes the right side (left side stays open = entrance) */}
      <Wall position={[L, 0, slabZ]} rotationY={-Math.PI / 2} width={slabD} />

      {/* left end wall (closes the entrance end; the front of the walkway stays open), same blue finish */}
      {ENTRANCE.leftWall && (
        <>
          <Wall position={[0, 0, slabZ]} rotationY={Math.PI / 2} width={slabD} />
          {ENTRANCE.wallFinish && (
            <>
              <Panel
                url={ENTRANCE.wallFinish}
                position={[0.006, WALL_HEIGHT / 2, slabZ]}
                rotationY={Math.PI / 2}
                w={slabD}
                h={WALL_HEIGHT}
                tile={ENTRANCE.wallFinishTile}
              />
              <TrimBaseboard position={[0, 0, slabZ]} rotationY={Math.PI / 2} width={slabD} color={ENTRANCE.baseboard} />
              {/* the IndianShoes wordmark, raised in the middle of this big wall (the tour opens facing it) */}
              {ENTRANCE.logo && (
                <group position={[0.03, WALL_HEIGHT * ENTRANCE.logo.y, slabZ]} rotation={[0, Math.PI / 2, 0]}>
                  <HaloSign
                    shapeUrl={ENTRANCE.logo.shape}
                    outlineUrl={ENTRANCE.logo.outline}
                    outlineColor={ENTRANCE.logo.outlineColor}
                    glowUrl={ENTRANCE.logo.glow}
                    glowPad={0.25}
                    width={ENTRANCE.logo.width}
                    color={ENTRANCE.logo.color}
                    glowStrength={0} // no halo behind the wordmark: the letters themselves are lit
                    letterGlow={ENTRANCE.logo.letterGlow}
                    depth={ENTRANCE.logo.depth ?? 0.14}
                  />
                </group>
              )}
            </>
          )}
        </>
      )}

      {/* entrance zone back wall finish (matching the first block's side) */}
      {ENTRANCE.wallFinish && (
        <>
          <Panel
            url={ENTRANCE.wallFinish}
            position={[ENTRANCE_WIDTH / 2, WALL_HEIGHT / 2, backZ + 0.006]}
            w={ENTRANCE_WIDTH}
            h={WALL_HEIGHT}
            tile={ENTRANCE.wallFinishTile}
          />
          <TrimBaseboard position={[ENTRANCE_WIDTH / 2, 0, backZ]} width={ENTRANCE_WIDTH} color={ENTRANCE.baseboard} />
          <EntranceShowcase z={backZ} />
        </>
      )}

      {/* CTA wall finish + trim (continues the last bay's wall along the walkway part of the end wall) */}
      {CTA_WALL.finish && (
        <Panel
          url={CTA_WALL.finish}
          bump={CTA_WALL.bump}
          position={[CTA_WALL.x - 0.006, CTA_WALL.y, CTA_WALL.z]}
          rotationY={-Math.PI / 2}
          w={CTA_WALL.width}
          h={WALL_HEIGHT}
          tile={CTA_WALL.finishTile}
        />
      )}
      {CTA_WALL.wash > 0 && (
        <WallLight
          w={CTA_WALL.width}
          h={WALL_HEIGHT}
          mode="wash"
          strength={CTA_WALL.wash}
          position={[CTA_WALL.x - 0.009, CTA_WALL.y, CTA_WALL.z]}
          rotationY={-Math.PI / 2}
        />
      )}
      {CTA_WALL.trim && (
        <TrimBaseboard
          position={[CTA_WALL.x, 0, CTA_WALL.z]}
          rotationY={-Math.PI / 2}
          width={CTA_WALL.width}
          color={CTA_WALL.trim}
        />
      )}

      {/* enquiry wall for brands (WhatsApp QR, WhatsApp button, sales email) - last stop of the tour */}
      <Suspense fallback={null}>
        <CtaWall />
      </Suspense>

      {BRANDS.map((brand, i) => {
        const slots = brandSlots(i)
        return (
          <group key={brand.id}>
            <BrandBlock brand={brand} slot={slots.block} />
            <BrandBay brand={brand} slot={slots.bay} />
          </group>
        )
      })}
    </group>
  )
}
