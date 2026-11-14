import { Suspense, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import { useFrame, useLoader } from '@react-three/fiber'
import { RoundedBox, Text, useGLTF, useTexture } from '@react-three/drei'
import { WALL_HEIGHT } from './brands'

// A shoe display like the reference store video: a raised light-oak backboard on the wall,
// one short white ledge per shoe in a neat grid, and a sign hanging from the ceiling above it.
// Works in the wall's own frame: x across the wall (left -> right as you face it), y up, +z out of the wall.
// `list` = JSON made by store/scripts/make-shoe-cutouts.py: [{ title, price_inr, image, aspect }, ...]
// in order row by row (top row first), left to right.

const PANEL_T = 0.12 // backboard thickness
const LEDGE_DEPTH = 0.4
const LEDGE_T = 0.05

function useSoftShadowTexture() {
  return useMemo(() => {
    const c = document.createElement('canvas')
    c.width = 256
    c.height = 64
    const g = c.getContext('2d')
    const grd = g.createRadialGradient(128, 32, 0, 128, 32, 128)
    grd.addColorStop(0, 'rgba(0,0,0,0.5)')
    grd.addColorStop(0.5, 'rgba(0,0,0,0.16)')
    grd.addColorStop(1, 'rgba(0,0,0,0)')
    g.fillStyle = grd
    g.fillRect(0, 0, 256, 64)
    return new THREE.CanvasTexture(c)
  }, [])
}

// dark at the top, fading downwards: the soft shadow a ledge throws on the wall under it
function useLedgeShadowTexture() {
  return useMemo(() => {
    const c = document.createElement('canvas')
    c.width = 64
    c.height = 128
    const g = c.getContext('2d')
    const grd = g.createLinearGradient(0, 0, 0, 128)
    grd.addColorStop(0, 'rgba(0,0,0,0.32)')
    grd.addColorStop(0.35, 'rgba(0,0,0,0.12)')
    grd.addColorStop(1, 'rgba(0,0,0,0)')
    g.fillStyle = grd
    g.fillRect(0, 0, 64, 128)
    // soften the two ends
    g.globalCompositeOperation = 'destination-in'
    const side = g.createLinearGradient(0, 0, 64, 0)
    side.addColorStop(0, 'rgba(0,0,0,0)')
    side.addColorStop(0.15, 'rgba(0,0,0,1)')
    side.addColorStop(0.85, 'rgba(0,0,0,1)')
    side.addColorStop(1, 'rgba(0,0,0,0)')
    g.fillStyle = side
    g.fillRect(0, 0, 64, 128)
    return new THREE.CanvasTexture(c)
  }, [])
}

function useWood(url, w, h, tile = 3) {
  const tex = useTexture(url)
  return useMemo(() => {
    const t = tex.clone()
    t.wrapS = t.wrapT = THREE.RepeatWrapping
    t.repeat.set(w / tile, h / tile)
    t.colorSpace = THREE.SRGBColorSpace
    t.anisotropy = 8
    t.needsUpdate = true
    return t
  }, [tex, w, h, tile])
}

function Shoe({ item, width, shadowTex, wallGap = 0 }) {
  const tex = useTexture(item.image)
  const map = useMemo(() => {
    const t = tex.clone()
    t.colorSpace = THREE.SRGBColorSpace
    t.anisotropy = 8
    t.needsUpdate = true
    return t
  }, [tex])
  const h = width / (item.aspect || 2)
  return (
    <group>
      {/* soft contact shadow on the ledge */}
      <mesh position={[0, 0.003, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[width * 1.05, LEDGE_DEPTH * 0.75]} />
        <meshBasicMaterial map={shadowTex} transparent depthWrite={false} />
      </mesh>
      {/* faint silhouette shadow on the wall behind the shoe (light from above-front) */}
      {wallGap > 0 && (
        <mesh position={[0.03, h / 2 - h * 0.12, -wallGap + 0.004]}>
          <planeGeometry args={[width * 1.03, h * 1.03]} />
          <meshBasicMaterial map={map} color="#000000" transparent opacity={0.13} depthWrite={false} />
        </mesh>
      )}
      <mesh position={[0, h / 2 - h * 0.02, 0]}>
        <planeGeometry args={[width, h]} />
        <meshStandardMaterial map={map} transparent alphaTest={0.35} roughness={0.75} side={THREE.DoubleSide} />
      </mesh>
    </group>
  )
}

// Real 3D shoe (low-poly GLB made from the product photo). Auto-fitted: its longest horizontal side
// becomes `width`, it stands on the ledge (y = 0), centred, turned `turn` radians so it reads as 3D.
// `flip` (item.modelFlip) turns it 180 degrees if the toe points the wrong way.
function ShoeModel({ url, width, turn = 0.35, flip = false }) {
  const { scene } = useGLTF(url)
  const fitted = useMemo(() => {
    const obj = scene.clone(true)
    let box = new THREE.Box3().setFromObject(obj)
    let size = box.getSize(new THREE.Vector3())
    if (size.z > size.x) {
      obj.rotation.y = Math.PI / 2
      obj.updateMatrixWorld(true)
      box = new THREE.Box3().setFromObject(obj)
      size = box.getSize(new THREE.Vector3())
    }
    obj.traverse((o) => {
      if (o.isMesh) {
        o.castShadow = true
        o.receiveShadow = true
      }
    })
    const k = width / size.x
    const c = box.getCenter(new THREE.Vector3())
    return { obj, k, offset: [-c.x * k, -box.min.y * k, -c.z * k] }
  }, [scene, width])
  return (
    <group rotation={[0, (flip ? Math.PI : 0) + turn, 0]}>
      <group position={fitted.offset} scale={fitted.k}>
        <primitive object={fitted.obj} />
      </group>
    </group>
  )
}

// Display letters that appear one by one, hold, then start again.
// The full word is measured once (invisible) so each letter lands in its final place.
const LETTER_STEP = 0.16 // seconds per letter
const HOLD = 3.5 // seconds the full word stays up before the next cycle

function TypedLetters({ text, fontSize, color }) {
  const [shown, setShown] = useState(0)
  const [width, setWidth] = useState(null)
  const last = useRef(-1)
  const period = text.length * LETTER_STEP + HOLD
  useFrame(({ clock }) => {
    const t = clock.elapsedTime % period
    const n = Math.min(text.length, Math.floor(t / LETTER_STEP) + 1)
    if (n !== last.current) {
      last.current = n
      setShown(n)
    }
  })
  return (
    <group>
      {/* invisible full word, only to measure its width */}
      <Text fontSize={fontSize} letterSpacing={0.18} anchorX="center" anchorY="middle" fillOpacity={0}
        onSync={(m) => { const b = m.textRenderInfo?.blockBounds; if (b) setWidth(b[2] - b[0]) }}>
        {text}
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </Text>
      {width !== null && shown > 0 && (
        <Text position={[-width / 2, 0, 0.001]} fontSize={fontSize} letterSpacing={0.18} anchorX="left" anchorY="middle" color={color}>
          {text.slice(0, shown)}
          <meshBasicMaterial toneMapped={false} />
        </Text>
      )}
    </group>
  )
}

// Sign hanging from the ceiling on two thin wires (like the "SHOES" sign in the reference).
// A thick light-box style board with rounded edges, a thin metal frame round its rim and
// metal end caps where the wires meet it, so it reads as a solid 3D object from any angle.
// The letters are lit like an LED display (not affected by the room light) and type in one by one.
function HangingSign({ text, y = 7.15, z = 1.0, width = 2.4, height = 0.5, depth = 0.2, bg = '#111111', fg = '#ffffff', rim = '#b9bcc2' }) {
  const wireLen = WALL_HEIGHT - (y + height / 2)
  return (
    <group position={[0, y, z]}>
      {/* solid board */}
      <RoundedBox args={[width, height, depth]} radius={0.035} smoothness={4} castShadow>
        <meshStandardMaterial color={bg} roughness={0.35} metalness={0.15} />
      </RoundedBox>
      {/* thin metal frame around the rim (shows the thickness) */}
      <mesh>
        <boxGeometry args={[width + 0.02, height + 0.02, depth * 0.35]} />
        <meshStandardMaterial color={rim} metalness={0.85} roughness={0.3} />
      </mesh>
      {[1, -1].map((s) => (
        <group key={s} position={[0, 0, s * (depth / 2 + 0.004)]} rotation={[0, s > 0 ? 0 : Math.PI, 0]}>
          <TypedLetters text={text} fontSize={height * 0.42} color={fg} />
        </group>
      ))}
      {[-1, 1].map((s) => (
        <group key={s} position={[s * width * 0.38, 0, 0]}>
          <mesh position={[0, height / 2 + wireLen / 2, 0]}>
            <cylinderGeometry args={[0.008, 0.008, wireLen, 6]} />
            <meshStandardMaterial color="#8a8a8a" metalness={0.8} roughness={0.3} />
          </mesh>
          {/* metal caps: on the board top and at the ceiling */}
          <mesh position={[0, height / 2 + 0.025, 0]}>
            <cylinderGeometry args={[0.035, 0.035, 0.05, 16]} />
            <meshStandardMaterial color={rim} metalness={0.9} roughness={0.25} />
          </mesh>
          <mesh position={[0, height / 2 + wireLen - 0.015, 0]}>
            <cylinderGeometry args={[0.06, 0.06, 0.03, 20]} />
            <meshStandardMaterial color={rim} metalness={0.9} roughness={0.25} />
          </mesh>
        </group>
      ))}
    </group>
  )
}

// optional raised wood backboard
function Backboard({ url, w, h, y }) {
  const wood = useWood(url, w, h)
  return (
    <mesh position={[0, y, PANEL_T / 2]} castShadow receiveShadow>
      <boxGeometry args={[w, h, PANEL_T]} />
      <meshStandardMaterial map={wood} roughness={0.7} />
    </mesh>
  )
}

const inr = (n) => '₹' + Number(n).toLocaleString('en-IN')

export default function ShoeWall({
  list,
  shelves = [5.2, 3.17, 1.1], // height of each ledge top (world units), top row first
  perShelf = 4,
  width = 8.2, // width of the grid along the wall
  shoeWidth = 1.3, // 0.7x of the earlier 1.85
  panelTexture = null, // e.g. '/textures/oak_panel.jpg' for a wood backboard behind the shoes (off by default)
  ledgeColor = '#f7f7f5',
  labelColor = '#5b4630',
  heading, // text on the hanging sign, e.g. "WOMEN"
  sign = {}, // { bg, fg } colours of the hanging sign
  loadModels = true, // false = show the photos only (3D models load once the visitor gets near)
}) {
  const data = useLoader(THREE.FileLoader, list)
  const items = useMemo(() => JSON.parse(data), [data])
  const shadowTex = useSoftShadowTexture()
  const ledgeShadow = useLedgeShadowTexture()
  const step = width / perShelf
  const panelW = width + 0.5
  const panelTop = shelves[0] + 1.15
  const panelBottom = shelves[shelves.length - 1] - 0.55
  const panelH = panelTop - panelBottom
  const base = panelTexture ? PANEL_T : 0 // ledges stand off the backboard, or straight off the wall
  const ledgeZ = base + LEDGE_DEPTH / 2
  return (
    <group>
      {panelTexture && <Backboard url={panelTexture} w={panelW} h={panelH} y={(panelTop + panelBottom) / 2} />}
      {heading && <HangingSign text={heading} {...sign} />}
      {shelves.map((y, r) =>
        items.slice(r * perShelf, (r + 1) * perShelf).map((item, c) => {
          const x = -width / 2 + step * (c + 0.5)
          return (
            <group key={item.handle} position={[x, y, 0]}>
              {/* floating ledge in the brand colour */}
              <mesh position={[0, -LEDGE_T / 2, ledgeZ]} castShadow receiveShadow>
                <boxGeometry args={[step * 0.82, LEDGE_T, LEDGE_DEPTH]} />
                <meshStandardMaterial color={ledgeColor} roughness={0.5} />
              </mesh>
              {/* the ledge's soft shadow on the wall below it */}
              <mesh position={[0, -LEDGE_T - 0.2, base + 0.002]}>
                <planeGeometry args={[step * 0.9, 0.4]} />
                <meshBasicMaterial map={ledgeShadow} transparent depthWrite={false} />
              </mesh>
              <group position={[0, 0, ledgeZ]}>
                {item.model && loadModels ? (
                  // real 3D shoe; the photo shows while the model loads
                  <Suspense fallback={<Shoe item={item} width={shoeWidth} shadowTex={shadowTex} wallGap={ledgeZ - base} />}>
                    <ShoeModel url={item.model} width={shoeWidth} flip={item.modelFlip} />
                  </Suspense>
                ) : (
                  <Shoe item={item} width={shoeWidth} shadowTex={shadowTex} wallGap={ledgeZ - base} />
                )}
              </group>
              {/* name + price, on the wall just under the ledge */}
              <Text position={[0, -LEDGE_T - 0.13, base + 0.005]} fontSize={0.075} color={labelColor} anchorX="center" anchorY="middle" maxWidth={step * 0.95} textAlign="center">
                {`${item.title}\n${inr(item.price_inr)}`}
              </Text>
            </group>
          )
        }),
      )}
    </group>
  )
}
