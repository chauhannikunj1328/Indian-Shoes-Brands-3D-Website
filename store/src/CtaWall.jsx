import { useLayoutEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import { useLoader, useThree } from '@react-three/fiber'
import { Text } from '@react-three/drei'
import { CTA, CTA_WALL } from './brands'
import { HaloSign } from './Store'

// The enquiry wall at the end of the tour, centred on the Gully-style cream leather wall:
//   embossed IndianShoes wordmark (raised letters + piping, like the Comet / Gully Labs block logos)
//   headline + one line of text
//   [Chat on WhatsApp]  [sales@theindianshoes.com]   side by side
//   embossed WhatsApp QR code (raised modules on a raised white plate) + caption
// The buttons and the QR are clickable (touch too), so phone visitors, who can't scan their own
// screen, still reach WhatsApp / email in one tap. Narrow (portrait) screens stack the two buttons.

const FOV = 55 // the store camera's vertical field of view
const VIEW_DIST = 11 // how far the CTA camera stops from this wall (tour.js END_VIEW_DIST)
const QR_PLATE_DEPTH = 0.1 // the white plate stands well off the wall (embossed)
const QR_MODULE_DEPTH = 0.015 // the dark modules are almost flat on the plate: tall modules smear into each other at an angle and the code stops scanning

function roundedShape(w, h, r) {
  const s = new THREE.Shape()
  const x = -w / 2
  const y = -h / 2
  s.moveTo(x + r, y)
  s.lineTo(x + w - r, y)
  s.quadraticCurveTo(x + w, y, x + w, y + r)
  s.lineTo(x + w, y + h - r)
  s.quadraticCurveTo(x + w, y + h, x + w - r, y + h)
  s.lineTo(x + r, y + h)
  s.quadraticCurveTo(x, y + h, x, y + h - r)
  s.lineTo(x, y + r)
  s.quadraticCurveTo(x, y, x + r, y)
  return s
}

// a raised (extruded) rounded slab: buttons and the QR plate
function useSlab(w, h, r, depth, bevel = 0.012) {
  return useMemo(
    () =>
      new THREE.ExtrudeGeometry(roundedShape(w, h, r), {
        depth,
        bevelEnabled: true,
        bevelThickness: bevel,
        bevelSize: bevel,
        bevelSegments: 5,
        curveSegments: 12,
      }),
    [w, h, r, depth, bevel],
  )
}

// A soft, blurred drop shadow on the wall behind a raised element (so it pops out): a rounded rectangle of the
// element's size, blurred, drawn as a transparent black plane just in front of the wall. `r` = the element's corner radius.
const SHADOW_BLUE = '#9db2ec' // a pale, soft blue that melts into the wall's blue pinstripes and trim (not grey-black)

function SoftShadow({ w, h, r, spread = 0.4, dy = -0.1, strength = 0.4, blur = spread * 0.45, color = SHADOW_BLUE }) {
  const tex = useMemo(() => {
    const ppu = 160 // texture pixels per world unit
    const pad = spread * ppu
    const cw = Math.ceil(w * ppu + pad * 2)
    const ch = Math.ceil(h * ppu + pad * 2)
    const c = document.createElement('canvas')
    c.width = cw
    c.height = ch
    const g = c.getContext('2d')
    // draw the shape far outside the canvas and let only its blurred shadow land inside (works in every browser)
    const OFF = 4000
    g.shadowColor = color
    g.shadowBlur = blur * ppu * 2 // `blur` in world units: keep it small on thin shapes (a wide blur on a thin button washes out)
    g.shadowOffsetX = OFF
    g.fillStyle = color
    g.beginPath()
    g.roundRect(pad - OFF, pad, w * ppu, h * ppu, r * ppu)
    g.fill()
    const t = new THREE.CanvasTexture(c)
    t.colorSpace = THREE.SRGBColorSpace
    return t
  }, [w, h, r, spread, blur, color])
  return (
    <mesh position={[0, dy, 0.003]} renderOrder={1}>
      <planeGeometry args={[w + spread * 2, h + spread * 2]} />
      <meshBasicMaterial map={tex} transparent opacity={strength} depthWrite={false} toneMapped={false} />
    </mesh>
  )
}

function open(href) {
  if (href.startsWith('mailto:')) window.location.href = href
  else window.open(href, '_blank', 'noopener')
}

function clickable(href, setHover) {
  return {
    onClick: (e) => {
      e.stopPropagation()
      open(href)
    },
    onPointerOver: (e) => {
      e.stopPropagation()
      setHover?.(true)
      document.body.style.cursor = 'pointer'
    },
    onPointerOut: () => {
      setHover?.(false)
      document.body.style.cursor = ''
    },
  }
}

// raised pill button; lifts a little off the wall on hover
function WallButton({ position, width, height, label, fill, textColor, outline, fontSize, href }) {
  const [hover, setHover] = useState(false)
  const depth = 0.12 // embossed: the button stands well off the wall, with a rounded bevel (no drop shadow)
  const bevel = 0.03
  const body = useSlab(width, height, height / 2, depth, bevel)
  const ring = useSlab(width + 0.06, height + 0.06, (height + 0.06) / 2, depth - 0.02, bevel)
  return (
    <group position={[position[0], position[1], position[2] + (hover ? 0.05 : 0)]} {...clickable(href, setHover)}>
      {outline && (
        <mesh geometry={ring} castShadow>
          <meshStandardMaterial color={outline} roughness={0.6} />
        </mesh>
      )}
      <mesh geometry={body} position={[0, 0, outline ? 0.012 : 0]} castShadow>
        <meshStandardMaterial color={fill} roughness={0.55} emissive={fill} emissiveIntensity={0.3} />
      </mesh>
      <Text
        position={[0, 0, depth + bevel + 0.02]}
        fontSize={fontSize}
        color={textColor}
        anchorX="center"
        anchorY="middle"
        fontWeight={700}
      >
        {label}
      </Text>
    </group>
  )
}

// embossed QR: a raised white plate with every dark module raised again in navy
function EmbossedQr({ position, size, captionSize }) {
  const data = useLoader(THREE.FileLoader, CTA.whatsapp.qrGrid)
  const { size: n, runs } = useMemo(() => JSON.parse(data), [data])
  const cell = size / n
  const margin = cell * 4.5 // a clear quiet zone all round, so the code reads (and scans) cleanly
  const plateW = size + margin * 2
  const plateH = plateW + captionSize * 2.6
  const plate = useSlab(plateW, plateH, 0.2, QR_PLATE_DEPTH, 0.035)
  const modules = useRef()
  useLayoutEffect(() => {
    const m = new THREE.Matrix4()
    runs.forEach(([r, c, len], i) => {
      const x = -size / 2 + (c + len / 2) * cell
      const y = size / 2 - (r + 0.5) * cell
      m.makeScale(len * cell, cell, 1)
      m.setPosition(x, y, 0)
      modules.current.setMatrixAt(i, m)
    })
    modules.current.instanceMatrix.needsUpdate = true
  }, [runs, cell, size])
  const plateTop = plateH / 2 - margin - size / 2 // QR centre, measured from the plate centre
  return (
    <group position={position} {...clickable(CTA.whatsapp.link)}>
      {/* pure white plate (lit by its own emissive so it stays true white) with a soft shadow behind it, so it pops out */}
      <SoftShadow w={plateW} h={plateH} r={0.2} spread={0.8} blur={0.38} dy={-0.1} strength={0.3} />
      <mesh geometry={plate} castShadow>
        <meshStandardMaterial color="#ffffff" roughness={0.45} emissive="#ffffff" emissiveIntensity={0.85} />
      </mesh>
      <instancedMesh
        ref={modules}
        args={[null, null, runs.length]}
        position={[0, plateTop, QR_PLATE_DEPTH + 0.035 + QR_MODULE_DEPTH / 2]}
        castShadow
      >
        <boxGeometry args={[1, 1, QR_MODULE_DEPTH]} />
        <meshBasicMaterial color={CTA.logo.outlineColor} toneMapped={false} />
      </instancedMesh>
      <Text
        position={[0, -plateH / 2 + captionSize * 1.35, QR_PLATE_DEPTH + 0.05]}
        fontSize={captionSize}
        color={CTA.colors.heading}
        anchorX="center"
        anchorY="middle"
        fontWeight={700}
      >
        {CTA.whatsapp.qrCaption}
      </Text>
    </group>
  )
}

function Logo({ position, width }) {
  const l = CTA.logo
  return (
    <group position={position}>
      <HaloSign
        shapeUrl={l.shape}
        outlineUrl={l.outline}
        outlineColor={l.outlineColor}
        glowUrl={l.glow}
        glowPad={0.25}
        width={width}
        color={l.color}
        glowStrength={l.glowStrength}
        depth={0.14}
      />
    </group>
  )
}

export default function CtaWall() {
  const aspect = useThree((s) => s.size.width / s.size.height)
  const visibleW = 2 * VIEW_DIST * Math.tan(THREE.MathUtils.degToRad(FOV / 2)) * aspect
  const portrait = aspect < 1
  const c = CTA.colors
  const mail = `mailto:${CTA.email}?subject=${encodeURIComponent('3D store enquiry')}`
  const wa = { label: CTA.whatsapp.label, fill: c.whatsapp, textColor: '#ffffff', href: CTA.whatsapp.link }
  const em = { label: CTA.email, fill: '#ffffff', outline: c.heading, textColor: c.heading, href: mail }
  const wall = [CTA_WALL.x - 0.02, CTA_WALL.y, CTA_WALL.z]

  if (portrait) {
    // one column, 7 units wide, scaled to fit the screen width
    const scale = Math.min(1, (visibleW * 0.9) / 7)
    return (
      <group position={wall} rotation={[0, -Math.PI / 2, 0]} scale={scale}>
        <Logo position={[0, 3.25, 0]} width={4.6} />
        <Text
          position={[0, 2.35, 0.01]}
          fontSize={0.44}
          lineHeight={1.12}
          maxWidth={6.6}
          textAlign="center"
          color={c.heading}
          anchorX="center"
          anchorY="top"
          fontWeight={800}
        >
          {CTA.headline}
        </Text>
        <Text
          position={[0, 1.15, 0.01]}
          fontSize={0.21}
          lineHeight={1.45}
          maxWidth={6.6}
          textAlign="center"
          color={c.text}
          anchorX="center"
          anchorY="top"
        >
          {CTA.text}
        </Text>
        <WallButton position={[0, -0.5, 0.01]} width={6.2} height={0.66} fontSize={0.25} {...wa} />
        <WallButton position={[0, -1.3, 0.01]} width={6.2} height={0.66} fontSize={0.23} {...em} />
        <EmbossedQr position={[0, -2.85, 0.01]} size={1.6} captionSize={0.14} />
      </group>
    )
  }

  // wide screens: the logo, headline, text and buttons are centred in the middle of the 16-unit wall (both ways);
  // the QR code sits on the right, vertically centred. Scaled down on narrow windows.
  const scale = Math.min(1, (visibleW * 0.95) / 15.5)
  return (
    <group position={wall} rotation={[0, -Math.PI / 2, 0]} scale={scale}>
      {/* the middle block is narrow (about 8 units) so the QR on the right has its own room */}
      <group position={[0, -1.0, 0]}>
        <Logo position={[0, 2.75, 0]} width={4.6} />
        <Text
          position={[0, 1.95, 0.01]}
          fontSize={0.5}
          lineHeight={1.15}
          maxWidth={7.2}
          textAlign="center"
          color={c.heading}
          anchorX="center"
          anchorY="top"
          fontWeight={800}
        >
          {CTA.headline}
        </Text>
        <Text
          position={[0, 0.62, 0.01]}
          fontSize={0.22}
          lineHeight={1.45}
          maxWidth={7.6}
          textAlign="center"
          color={c.text}
          anchorX="center"
          anchorY="top"
        >
          {CTA.text}
        </Text>
        <WallButton position={[-2.4, -1.0, 0.01]} width={3.3} height={0.72} fontSize={0.25} {...wa} />
        <WallButton position={[1.8, -1.0, 0.01]} width={4.5} height={0.72} fontSize={0.24} {...em} />
      </group>
      <EmbossedQr position={[5.9, 1.7, 0.01]} size={2.0} captionSize={0.15} />
    </group>
  )
}
