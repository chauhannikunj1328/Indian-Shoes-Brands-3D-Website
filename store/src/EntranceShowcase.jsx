import { Suspense } from 'react'
import { useTexture } from '@react-three/drei'
import { ENTRANCE, INTRO, ENTRANCE_WIDTH } from './brands'
import { ShoeModel } from './ShoeWall'

// The entrance's back wall: the four brand logos (white) in a row near the top and four small 3D shoes per brand, each on its own little ledge.
// Purely decorative: no click or hover handlers, so nothing here reacts to the pointer.
// Works in the wall's own frame: x across, y up, +z out of the wall. Configured by ENTRANCE.showcase / INTRO.logos in brands.js.

const LOGO_Y = 5.9 // centre height of the logos
const LOGO_MAX_W = 2.6 // 0.7 of the first size
const LOGO_MAX_H = 1.02
const ROW_YS = [3.7, 1.7] // top of the two rows of ledges under each logo
const SHOE_W = 1.05 // shoe length: 0.7 of the first size
const SHOE_DX = 1.15 // the two shoes in a row stand this far left and right of the logo's centre
const LEDGE_W = 1.35 // every shoe has its own small ledge
const LEDGE_D = 0.45
const LEDGE_T = 0.06

function Logo({ src, aspect, x }) {
  const tex = useTexture(src)
  const w = Math.min(LOGO_MAX_W, LOGO_MAX_H * aspect)
  return (
    <mesh position={[x, LOGO_Y, 0.02]}>
      <planeGeometry args={[w, w / aspect]} />
      <meshBasicMaterial map={tex} transparent toneMapped={false} depthWrite={false} />
    </mesh>
  )
}

export default function EntranceShowcase({ z }) {
  const items = ENTRANCE.showcase
  if (!items?.length) return null
  const step = ENTRANCE_WIDTH / items.length
  return (
    <group position={[0, 0, z + 0.02]}>
      {items.map((it, i) => {
        const x = step * (i + 0.5)
        const logo = INTRO.logos[i]
        return (
          <group key={it.shoes[0].model}>
            {logo && (
              <Suspense fallback={null}>
                <Logo src={logo.white} aspect={logo.aspect} x={x} />
              </Suspense>
            )}
            {ROW_YS.map((ly, r) =>
              [-1, 1].map((side, c) => {
                const shoe = it.shoes[r * 2 + c]
                if (!shoe) return null
                const sx = x + side * SHOE_DX
                return (
                  <group key={shoe.model}>
                    <mesh position={[sx, ly - LEDGE_T / 2, LEDGE_D / 2]}>
                      <boxGeometry args={[LEDGE_W, LEDGE_T, LEDGE_D]} />
                      <meshStandardMaterial color="#d8d3c8" roughness={0.5} />
                    </mesh>
                    <group position={[sx, ly, LEDGE_D / 2]}>
                      <Suspense fallback={null}>
                        <ShoeModel url={shoe.model} width={SHOE_W} flip={!!shoe.flip} />
                      </Suspense>
                    </group>
                  </group>
                )
              }),
            )}
          </group>
        )
      })}
    </group>
  )
}
