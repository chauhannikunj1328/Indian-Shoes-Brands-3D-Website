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
const QR_PLATE_DEPTH = 0.05
const QR_MODULE_DEPTH = 0.035

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
function useSlab(w, h, r, depth) {
  return useMemo(
    () =>
      new THREE.ExtrudeGeometry(roundedShape(w, h, r), {
        depth,
        bevelEnabled: true,
        bevelThickness: 0.012,
        bevelSize: 0.012,
        bevelSegments: 3,
        curveSegments: 10,
      }),
    [w, h, r, depth],
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
  const depth = 0.06
  const body = useSlab(width, height, height / 2, depth)
  const ring = useSlab(width + 0.06, height + 0.06, (height + 0.06) / 2, depth - 0.01)
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
        position={[0, 0, depth + 0.03]}
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
  const margin = cell * 3
  const plateW = size + margin * 2
  const plateH = plateW + captionSize * 2.6
  const plate = useSlab(plateW, plateH, 0.16, QR_PLATE_DEPTH)
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
      <mesh geometry={plate} castShadow>
        <meshStandardMaterial color="#ffffff" roughness={0.5} emissive="#ffffff" emissiveIntensity={0.35} />
      </mesh>
      <instancedMesh
        ref={modules}
        args={[null, null, runs.length]}
        position={[0, plateTop, QR_PLATE_DEPTH + 0.012 + QR_MODULE_DEPTH / 2]}
        castShadow
      >
        <boxGeometry args={[1, 1, QR_MODULE_DEPTH]} />
        <meshStandardMaterial color={CTA.logo.outlineColor} roughness={0.55} />
      </instancedMesh>
      <Text
        position={[0, -plateH / 2 + captionSize * 1.35, QR_PLATE_DEPTH + 0.02]}
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

  // wide screens: everything centred on the 16-unit wall, scaled down on narrow windows
  const scale = Math.min(1, (visibleW * 0.95) / 13)
  return (
    <group position={wall} rotation={[0, -Math.PI / 2, 0]} scale={scale}>
      <Logo position={[0, 2.75, 0]} width={5.0} />
      <Text position={[0, 1.95, 0.01]} fontSize={0.5} color={c.heading} anchorX="center" anchorY="top" fontWeight={800}>
        {CTA.headline}
      </Text>
      <Text
        position={[0, 1.25, 0.01]}
        fontSize={0.22}
        lineHeight={1.45}
        maxWidth={9.4}
        textAlign="center"
        color={c.text}
        anchorX="center"
        anchorY="top"
      >
        {CTA.text}
      </Text>
      <WallButton position={[-2.4, 0.05, 0.01]} width={3.3} height={0.72} fontSize={0.25} {...wa} />
      <WallButton position={[1.8, 0.05, 0.01]} width={4.5} height={0.72} fontSize={0.24} {...em} />
      <EmbossedQr position={[0, -1.95, 0.01]} size={2.0} captionSize={0.15} />
    </group>
  )
}
