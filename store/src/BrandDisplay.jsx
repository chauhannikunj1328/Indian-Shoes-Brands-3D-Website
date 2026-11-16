import { Suspense, useEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import { RoundedBox, Text, useTexture, useVideoTexture } from '@react-three/drei'
import { buildShopUrl, trackClick } from './affiliate'

// A brand display for one half of a bay's back wall (instead of a grid of shoes): a screen playing the brand's film
// (or, until there is one, its logo) and one button under it that opens the brand's product-list page as an affiliate link.
// Configured per brand in brands.js as `shelves.<wall>.showcase`. Works in the wall's own frame, like ShoeWall:
// x across the wall, y up, +z out of the wall.
//
// `active` is false while the visitor is far away: nothing is mounted, so no video plays or is decoded.

const MAX_W = 7.8 // largest screen size (world units); the screen keeps the video's own proportions inside this
const MAX_H = 4.4
const SCREEN_Y = 4.3 // centre height of the screen
const BUTTON_Y = 1.45

// the screen's size for a given aspect ratio (width / height)
function fit(aspect) {
  const w = Math.min(MAX_W, MAX_H * aspect)
  return [w, w / aspect]
}

function VideoScreen({ src, onSize }) {
  const tex = useVideoTexture(src, { muted: true, loop: true, start: true, playsInline: true, crossOrigin: 'anonymous' })
  useEffect(() => {
    tex.colorSpace = THREE.SRGBColorSpace
    const v = tex.image
    const size = () => v.videoWidth && onSize(v.videoWidth / v.videoHeight)
    size()
    v.addEventListener('loadedmetadata', size)
    return () => {
      v.removeEventListener('loadedmetadata', size)
      // let go of the file when the visitor walks away
      v.pause()
      v.removeAttribute('src')
      v.load()
      tex.dispose()
    }
  }, [tex, onSize])
  return <meshBasicMaterial map={tex} toneMapped={false} />
}

function LogoScreen({ logo, color, w, h }) {
  const tex = useTexture(logo)
  const [lw, lh] = useMemo(() => {
    const a = tex.image ? tex.image.width / tex.image.height : 3
    const width = w * 0.55
    return [width, width / a]
  }, [tex, w])
  return (
    <>
      <mesh>
        <planeGeometry args={[w, h]} />
        <meshBasicMaterial color={color} toneMapped={false} />
      </mesh>
      <mesh position={[0, 0, 0.002]}>
        <planeGeometry args={[lw, lh]} />
        <meshBasicMaterial map={tex} transparent toneMapped={false} />
      </mesh>
    </>
  )
}

export default function BrandDisplay({ showcase, brand, brandName, active = true }) {
  const [aspect, setAspect] = useState(16 / 9)
  const [hover, setHover] = useState(false)
  const [down, setDown] = useState(false)
  const cap = useRef()
  const capColor = showcase.ctaColor || '#2f6bff'
  // the key slides in and out: raised at rest, a little lower on hover, flat when pressed
  useFrame((_, dt) => {
    if (!cap.current) return
    const target = down ? 0.04 : hover ? 0.08 : 0.06
    cap.current.position.z += (target - cap.current.position.z) * Math.min(1, dt * 18)
  })
  const [w, h] = fit(aspect)
  const bw = 3.9
  const url = showcase.shopUrl
  const open = (e) => {
    e.stopPropagation()
    e.nativeEvent.__handled = true // tells ScrollCamera not to also walk to the next stop
    trackClick(brand, { handle: 'shop-all', title: `Shop all ${brandName}`, price_inr: 0, url })
    window.open(buildShopUrl(brand, url), '_blank', 'noopener,noreferrer')
  }
  if (!active) return null
  return (
    <group>
      {/* frame */}
      <RoundedBox args={[w + 0.2, h + 0.2, 0.16]} radius={0.04} smoothness={3} position={[0, SCREEN_Y, 0.08]}>
        <meshStandardMaterial color="#141414" roughness={0.5} metalness={0.2} />
      </RoundedBox>
      {/* screen */}
      <group position={[0, SCREEN_Y, 0.166]}>
        <Suspense fallback={null}>
          {showcase.video ? (
            <mesh>
              <planeGeometry args={[w, h]} />
              <VideoScreen src={showcase.video} onSize={setAspect} />
            </mesh>
          ) : (
            <LogoScreen logo={showcase.logo} color={showcase.screenColor || '#ebe6dc'} w={w} h={h} />
          )}
        </Suspense>
      </group>
      {/* the CTA: a button fixed flat on the wall (its back touches the wall, nothing behind it); it pushes in when pressed */}
      <group
        position={[0, BUTTON_Y, 0]}
        onClick={open}
        onPointerDown={(e) => { e.stopPropagation(); setDown(true) }}
        onPointerUp={() => setDown(false)}
        onPointerOver={(e) => {
          e.stopPropagation()
          setHover(true)
          document.body.style.cursor = 'pointer'
        }}
        onPointerOut={() => {
          setHover(false)
          setDown(false)
          document.body.style.cursor = ''
        }}
      >
        <group ref={cap} position={[0, 0, 0.05]}>
          {/* the coloured pill: embossed, only slightly raised from the wall */}
          <RoundedBox args={[bw, 0.8, 0.1]} radius={0.04} smoothness={6}>
            <meshStandardMaterial color={capColor} emissive={capColor} emissiveIntensity={hover ? 0.4 : 0.15} roughness={0.5} metalness={0} />
          </RoundedBox>
          <Text position={[-0.28, 0, 0.056]} fontSize={0.27} color="#ffffff" anchorX="center" anchorY="middle" letterSpacing={0.03} outlineWidth={0.006} outlineColor="#000000" outlineOpacity={0.25}>
            {showcase.shopLabel || `Shop ${brandName}`}
          </Text>
          {/* arrow in a white disc */}
          <mesh position={[bw / 2 - 0.5, 0, 0.052]}>
            <circleGeometry args={[0.27, 40]} />
            <meshBasicMaterial color="#ffffff" toneMapped={false} />
          </mesh>
          <Text position={[bw / 2 - 0.5, 0.01, 0.056]} fontSize={0.3} color={capColor} anchorX="center" anchorY="middle">
            {'\u2192'}
          </Text>
        </group>
      </group>
      <Text position={[0, BUTTON_Y - 0.72, 0.02]} fontSize={0.07} color="#7a7a76" anchorX="center" anchorY="middle">
        {`Opens ${brandName}'s website (affiliate link)`}
      </Text>
    </group>
  )
}
