import { Suspense, useEffect, useMemo, useState } from 'react'
import * as THREE from 'three'
import { RoundedBox, Text, useTexture, useVideoTexture } from '@react-three/drei'
import { buildShopUrl, trackClick } from './affiliate'

// A brand display for one half of a bay's back wall (instead of a grid of shoes): a screen playing the brand's film
// (or, until there is one, its logo) and one button under it that opens the brand's product-list page as an affiliate link.
// Configured per brand in brands.js as `shelves.<wall>.showcase`. Works in the wall's own frame, like ShoeWall:
// x across the wall, y up, +z out of the wall.
//
// `active` is false while the visitor is far away: nothing is mounted, so no video plays or is decoded.

const MAX_W = 6.6 // largest screen size (world units); the screen keeps the video's own proportions inside this
const MAX_H = 3.9
const SCREEN_Y = 4.15 // centre height of the screen
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
  const [w, h] = fit(aspect)
  const bw = 3.1
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
      {/* the one button under the screen */}
      <group
        position={[0, BUTTON_Y, 0.07]}
        scale={hover ? 1.05 : 1}
        onClick={open}
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
        <RoundedBox args={[bw, 0.62, 0.14]} radius={0.31} smoothness={4}>
          <meshStandardMaterial color={showcase.buttonColor || '#1d4fc9'} roughness={0.45} />
        </RoundedBox>
        <Text position={[0, 0, 0.075]} fontSize={0.2} color="#ffffff" anchorX="center" anchorY="middle" letterSpacing={0.04}>
          {showcase.shopLabel || `Shop ${brandName}`}
        </Text>
      </group>
      <Text position={[0, BUTTON_Y - 0.55, 0.02]} fontSize={0.07} color="#7a7a76" anchorX="center" anchorY="middle">
        {`Opens ${brandName}'s website (affiliate link)`}
      </Text>
    </group>
  )
}
