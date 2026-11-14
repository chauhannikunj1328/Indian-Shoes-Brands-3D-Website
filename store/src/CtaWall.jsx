import { useMemo, useState } from 'react'
import * as THREE from 'three'
import { useThree } from '@react-three/fiber'
import { Text, useTexture } from '@react-three/drei'
import { CTA, CTA_WALL } from './brands'

// The enquiry wall at the end of the tour: "Want a 3D store like this for your brand?" with a WhatsApp
// QR code, a WhatsApp button and the sales email. The buttons are clickable (touch too), so phone
// visitors, who can't scan their own screen, can still reach WhatsApp / email in one tap.
// Wide screens: text on the left, QR card on the right. Narrow (portrait) screens: everything stacked.

const FOV = 55 // the store camera's vertical field of view
const VIEW_DIST = 11 // how far the CTA camera stops from this wall (tour.js END_VIEW_DIST)

function roundedRect(w, h, r) {
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
  return new THREE.ShapeGeometry(s, 8)
}

function open(href) {
  if (href.startsWith('mailto:')) window.location.href = href
  else window.open(href, '_blank', 'noopener')
}

// a flat rounded button on the wall; grows a little and shows a hand cursor on hover
function WallButton({ position, width, height, label, fill, textColor, outline, fontSize, href }) {
  const [hover, setHover] = useState(false)
  const body = useMemo(() => roundedRect(width, height, height / 2), [width, height])
  const ring = useMemo(() => roundedRect(width + 0.05, height + 0.05, (height + 0.05) / 2), [width, height])
  return (
    <group
      position={position}
      scale={hover ? 1.04 : 1}
      onClick={(e) => {
        e.stopPropagation()
        open(href)
      }}
      onPointerOver={(e) => {
        e.stopPropagation()
        setHover(true)
        document.body.style.cursor = 'pointer'
      }}
      onPointerOut={() => {
        setHover(false)
        document.body.style.cursor = ''
      }}
    >
      {outline && (
        <mesh geometry={ring} position={[0, 0, -0.001]}>
          <meshBasicMaterial color={outline} toneMapped={false} />
        </mesh>
      )}
      <mesh geometry={body}>
        <meshBasicMaterial
          color={hover && !outline ? new THREE.Color(fill).multiplyScalar(0.9) : fill}
          toneMapped={false}
        />
      </mesh>
      <Text
        position={[0, 0, 0.01]}
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

// white card with the WhatsApp QR code and a caption
function QrCard({ position, size }) {
  const qr = useTexture(CTA.whatsapp.qr)
  qr.colorSpace = THREE.SRGBColorSpace
  qr.magFilter = THREE.NearestFilter // keep the QR modules crisp
  qr.generateMipmaps = false
  qr.minFilter = THREE.LinearFilter
  const w = size + 0.5
  const h = size + 1.25
  const card = useMemo(() => roundedRect(w, h, 0.22), [w, h])
  const shadow = useMemo(() => roundedRect(w + 0.12, h + 0.12, 0.28), [w, h])
  return (
    <group
      position={position}
      onClick={(e) => {
        e.stopPropagation()
        open(CTA.whatsapp.link)
      }}
      onPointerOver={(e) => {
        e.stopPropagation()
        document.body.style.cursor = 'pointer'
      }}
      onPointerOut={() => (document.body.style.cursor = '')}
    >
      <mesh geometry={shadow} position={[0.04, -0.06, -0.002]}>
        <meshBasicMaterial color="#000000" transparent opacity={0.08} />
      </mesh>
      <mesh geometry={card}>
        <meshBasicMaterial color="#ffffff" toneMapped={false} />
      </mesh>
      <mesh position={[0, 0.32, 0.005]}>
        <planeGeometry args={[size, size]} />
        <meshBasicMaterial map={qr} toneMapped={false} />
      </mesh>
      <Text
        position={[0, -h / 2 + 0.42, 0.01]}
        fontSize={size * 0.075}
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

export default function CtaWall() {
  const aspect = useThree((s) => s.size.width / s.size.height)
  const visibleW = 2 * VIEW_DIST * Math.tan(THREE.MathUtils.degToRad(FOV / 2)) * aspect
  const portrait = aspect < 1
  const c = CTA.colors
  const mail = `mailto:${CTA.email}?subject=${encodeURIComponent('3D store enquiry')}`

  if (portrait) {
    // stacked, 7 units wide, scaled to fit the screen width
    const scale = Math.min(1, (visibleW * 0.9) / 7)
    const x0 = -3.5
    return (
      <group position={[CTA_WALL.x - 0.02, CTA_WALL.y, CTA_WALL.z]} rotation={[0, -Math.PI / 2, 0]} scale={scale}>
        <Text
          position={[x0, 3.75, 0]}
          fontSize={0.24}
          letterSpacing={0.18}
          color={c.accent}
          anchorX="left"
          anchorY="top"
          fontWeight={700}
        >
          {CTA.eyebrow}
        </Text>
        <Text
          position={[x0, 3.35, 0]}
          fontSize={0.52}
          lineHeight={1.12}
          maxWidth={7}
          color={c.heading}
          anchorX="left"
          anchorY="top"
          fontWeight={800}
        >
          {CTA.headline.replace('\n', ' ')}
        </Text>
        <Text
          position={[x0, 1.95, 0]}
          fontSize={0.22}
          lineHeight={1.45}
          maxWidth={7}
          color={c.text}
          anchorX="left"
          anchorY="top"
        >
          {CTA.text}
        </Text>
        <WallButton
          position={[0, 0.55, 0.01]}
          width={7}
          height={0.68}
          label={CTA.whatsapp.label}
          fill={c.whatsapp}
          textColor="#ffffff"
          fontSize={0.26}
          href={CTA.whatsapp.link}
        />
        <WallButton
          position={[0, -0.3, 0.01]}
          width={7}
          height={0.68}
          label={CTA.email}
          fill="#ffffff"
          outline={c.heading}
          textColor={c.heading}
          fontSize={0.24}
          href={mail}
        />
        <QrCard position={[0, -2.55, 0.01]} size={2.4} />
      </group>
    )
  }

  // wide: text column on the left, QR card on the right; 14.6 units wide, scaled down on narrow windows
  const scale = Math.min(1, (visibleW * 0.92) / 14.6)
  const x0 = -7.1
  return (
    <group position={[CTA_WALL.x - 0.02, CTA_WALL.y, CTA_WALL.z]} rotation={[0, -Math.PI / 2, 0]} scale={scale}>
      <Text
        position={[x0, 2.3, 0]}
        fontSize={0.26}
        letterSpacing={0.2}
        color={c.accent}
        anchorX="left"
        anchorY="top"
        fontWeight={700}
      >
        {CTA.eyebrow}
      </Text>
      <Text
        position={[x0, 1.85, 0]}
        fontSize={0.64}
        lineHeight={1.12}
        color={c.heading}
        anchorX="left"
        anchorY="top"
        fontWeight={800}
      >
        {CTA.headline}
      </Text>
      <Text
        position={[x0, 0.12, 0]}
        fontSize={0.24}
        lineHeight={1.5}
        maxWidth={7.8}
        color={c.text}
        anchorX="left"
        anchorY="top"
      >
        {CTA.text}
      </Text>
      <WallButton
        position={[x0 + 1.65, -1.7, 0.01]}
        width={3.3}
        height={0.74}
        label={CTA.whatsapp.label}
        fill={c.whatsapp}
        textColor="#ffffff"
        fontSize={0.26}
        href={CTA.whatsapp.link}
      />
      <WallButton
        position={[x0 + 3.3 + 0.3 + 2.25, -1.7, 0.01]}
        width={4.5}
        height={0.74}
        label={CTA.email}
        fill="#ffffff"
        outline={c.heading}
        textColor={c.heading}
        fontSize={0.25}
        href={mail}
      />
      <Text position={[x0, -2.35, 0]} fontSize={0.2} color={c.text} anchorX="left" anchorY="top">
        {`WhatsApp ${CTA.whatsapp.number}   ·   ${CTA.email}`}
      </Text>
      <QrCard position={[4.75, 0.05, 0.01]} size={3.0} />
    </group>
  )
}
