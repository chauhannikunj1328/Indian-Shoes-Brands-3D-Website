import { Suspense } from 'react'
import { useState } from 'react'
import { ENTRANCE, INTRO, ENTRANCE_WIDTH, BRANDS } from './brands'
import { STOPS, goTo } from './tour'
import { ShoeModel } from './ShoeWall'
import { HaloSign } from './Store'

// The entrance's back wall: the four brand logos (white) in a row near the top and four small 3D shoes per brand, each on its own little ledge.
// The shoes are decorative (no click or hover handlers). Each LOGO is a link: click it to walk to that brand's section.
// Works in the wall's own frame: x across, y up, +z out of the wall. Configured by ENTRANCE.showcase / INTRO.logos in brands.js.

const SIDE_MARGIN = 0.85 // free wall left of the first brand and right of the last one
const LOGO_Y = 6.25 // centre height of the logos
const LOGO_MAX_W = 2.6 // 0.7 of the first size
const LOGO_DEPTH = 0.1 // letter thickness (the block logos use 0.14 to 0.26 at about 2.5x this size)
const LOGO_MAX_H = 1.02
const ROW_YS = [3.7, 2.35] // top of the two rows of ledges under each logo
const SHOE_W = 1.05 // shoe length: 0.7 of the first size
const SHOE_DX = 1.0 // the two shoes in a row stand this far left and right of the logo's centre
const LEDGE_W = 1.35 // every shoe has its own small ledge
const LEDGE_D = 0.45
const LEDGE_T = 0.06

// An embossed logo, like the block logos: raised white letters with a soft piping, from the brand's traced logo shape (block.sign in brands.js).
// An invisible plane over it is the click target (thin letters alone would leave holes).
function Logo({ brand, aspect, x }) {
  const [hover, setHover] = useState(false)
  const sign = brand.block?.sign
  const w = Math.min(LOGO_MAX_W, LOGO_MAX_H * aspect)
  const h = w / aspect
  if (!sign) return null
  const open = (e) => {
    e.stopPropagation()
    e.nativeEvent.__handled = true
    const stop = STOPS.findIndex((st) => st.name === `${brand.id}:middle`)
    if (stop >= 0) goTo(stop)
  }
  return (
    <group
      position={[x, LOGO_Y, 0.02]}
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
      <HaloSign
        shapeUrl={sign.shape}
        outlineUrl={sign.outline}
        outlineColor={ENTRANCE.logo?.outlineColor ?? '#5f6b8f'}
        glowUrl={sign.glow}
        glowPad={sign.glowPad}
        width={w}
        color="#ffffff"
        glowStrength={0} // no halo behind the letters
        letterGlow={hover ? 0.9 : 0.3} // the letters themselves light up; brighter on hover (the logo does not change size)
        depth={LOGO_DEPTH}
      />
      <mesh position={[0, 0, 0.2]}>
        <planeGeometry args={[w * 1.15, h * 1.5]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>
    </group>
  )
}

export default function EntranceShowcase({ z }) {
  const items = ENTRANCE.showcase
  if (!items?.length) return null
  const step = (ENTRANCE_WIDTH - 2 * SIDE_MARGIN) / items.length
  return (
    <group position={[0, 0, z + 0.02]}>
      {items.map((it, i) => {
        const x = SIDE_MARGIN + step * (i + 0.5)
        const logo = INTRO.logos[i]
        return (
          <group key={it.shoes[0].model}>
            {logo && (
              <Suspense fallback={null}>
                <Logo brand={BRANDS[i]} aspect={logo.aspect} x={x} />
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
