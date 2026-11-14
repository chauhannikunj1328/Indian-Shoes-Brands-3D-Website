// Store layout (top view), left to right, following the user's sketch:
//
//   back wall ──────────────────────────────────────────────────────────────
//   │          ┌───────┐              ┌───────┐                           │
//   │ (open)   │ BLOCK │  COMET AREA  │ BLOCK │  GULLY LABS AREA          │ end wall
//   │          │ logo→ │   (bay)      │ logo→ │    (bay)                  │
//   │          └───────┘              └───────┘                           │
//   ENTRANCE   ─────────────── walkway (corridor) ──────────────────────  │
//
// Each brand = one solid BLOCK (its logo on the front face) followed by its BAY.
// A bay has 3 walls: the block on its left, the back wall, and the next block
// (or the end wall for the last brand). The bay front is open to the walkway.
//
// To add a new brand:
//   1. put its photos, picks.json and logo.png in public/brands/<id>/
//   2. add an entry below. Its block + bay are appended on the right automatically.
export const BRANDS = [
  {
    id: 'comet',
    name: 'COMET',
    tabLabel: 'Comet', // label in the bottom tab bar
    logo: '/brands/comet/logo.png',
    wallColor: '#f2f2f0',
    accent: '#111111',
    currency: 'INR',
    // Logo block styled after Comet's Aeres Ajrakh shoe: the front (logo) face is real Ajrakh
    // block-print cloth (Comet's own tile from wearcomet.com/pages/the-ajrakh-collection), and the
    // logo is cream like the shoe's corduroy/suede with navy piping around it, softly halo-lit.
    // The other faces are royal dark blue textured concrete, matching the Ajrakh indigo and the
    // logo's navy piping. Assets: store/scripts/make-comet-block.py
    block: {
      finish: '/brands/comet/block_concrete_blue.jpg', // charcoal version: block_concrete.jpg
      finishTile: 5, // world units per concrete texture tile
      front: {
        texture: '/brands/comet/ajrakh_tile.jpg', // Ajrakh cloth, seamless tile
        tileWidth: 2.6, // world units per tile across
      },
      baseboard: '#141f42',
      sign: {
        shape: '/brands/comet/logo_shape.json', // traced from Comet's official logo
        outline: '/brands/comet/logo_outline_shape.json', // piping border, like the shoe
        outlineColor: '#2c4466', // navy piping (shoe laces / piping)
        glow: '/brands/comet/logo_glow.png',
        glowPad: 0.25, // must match GLOW_PAD in make-comet-block.py
        widthRatio: 0.66, // logo width as a fraction of the block width
        color: '#efe4d0', // cream, like the shoe's corduroy star panel and suede
        glowStrength: 0.2, // halo brightness behind the logo, 0 (off) .. 1 (full)
      },
    },
    // Bay theme from wearcomet.com, kept minimal so the shoes stand out
    // (graphics made by store/scripts/make-comet-bay.py): off-white back wall with a whisper-grey
    // comet star + small tagline, very faint grid-paper side walls, yellow baseboard trim.
    bay: {
      backGrid: true, // back wall uses the same grid as the side walls...
      tagline: '/brands/comet/bay_tagline.png', // ...with the comet icon + tagline strip along the top
      back: '/brands/comet/bay_back.jpg', // (used only if backGrid is false: off-white wall with faint comet star)
      sides: '/brands/comet/bay_grid.png',
      sidesTile: 4, // world units per grid tile (8 cells per tile)
      trim: '#EBEF29',
      label: '#9a9a96',
      // shoes on floating shelves: 3 shelves x 4 shoes per section = 24 women + 24 men.
      // Lists come from store/scripts/make-shoe-cutouts.py (photos from wearcomet.com).
      // display style from the reference video (hanging sign, one ledge per shoe), no backboard;
      // ledges in Comet yellow (src/ShoeWall.jsx; add panelTexture for a wood backboard)
      shelves: {
        left: { list: '/brands/comet/women_wall.json', heading: 'WOMEN', sign: { bg: '#111111' }, ledgeColor: '#EBEF29', labelColor: '#3a3a38' },
        backLeft: { list: '/brands/comet/women_back.json', heading: 'WOMEN', sign: { bg: '#111111' }, ledgeColor: '#EBEF29', labelColor: '#3a3a38' },
        backRight: { list: '/brands/comet/men_back.json', heading: 'MEN', sign: { bg: '#111111' }, ledgeColor: '#EBEF29', labelColor: '#3a3a38' },
        right: { list: '/brands/comet/men_right.json', heading: 'MEN', sign: { bg: '#111111' }, ledgeColor: '#EBEF29', labelColor: '#3a3a38' },
      },
    },
  },
  {
    id: 'gullylabs',
    name: 'GULLY LABS',
    tabLabel: 'Gully Labs',
    logo: '/brands/gullylabs/logo.png',
    wallColor: '#efece6',
    accent: '#111111',
    currency: 'INR',
    // Logo block: Gully Labs' flagship store facade ("Baithak", Delhi), blue-dominant: wide blue
    // pointed-leaf panels with white stitching and narrow white stucco gaps with blue stitching,
    // on every face. Raised white गलीLABS logo with navy piping and a soft halo.
    // Assets: store/scripts/make-gully-assets.py
    // (Other versions: facade.jpg = original lighter facade; block_dark.jpg = deep blue + tone-on-tone.)
    // NOW: a close copy of the flagship storefront itself (assets/gullylabs/brand/flagship_storefront.jpg):
    // stucco fins + window glass + blue pointed panels with stitching, and their giant white sneaker
    // (cut out of the storefront photo, गलीLABS on the sole) hanging on a twisted blue rope.
    // The sole carries the logo, so the raised wall logo is hidden (hideLogo).
    // NOW: themed on their bestseller, "Gully Number 001 - Magic Carpet" (store/scripts/make-magic-carpet.py):
    // front = a red Persian "magic carpet" rug (the shoe's insole print) hung on cream leather with blue
    // stitching; sides = the shoe's side panel (beige canvas, cream leather, blue embroidered swoosh).
    // Previous storefront look: texture facade_flagship.jpg with allFaces: true (and no sideTexture).
    block: {
      front: {
        texture: '/brands/gullylabs/mc_front_plain.jpg', // cream leather + blue stitching (rug printed in: mc_front.jpg)
        sideTexture: '/brands/gullylabs/mc_side.jpg',
        tileWidth: 10, // one image per block face
        bump: '/brands/gullylabs/leather_bump.png', // pebbled leather grain relief
        bumpTile: 1.4, // world units per grain tile
        bumpScale: 1.2,
      },
      // real 3D hand-knotted rug (the shoe's insole print) on a rod with brass finials
      rug: {
        texture: '/brands/gullylabs/mc_rug.jpg',
        bump: '/brands/gullylabs/rug_bump.png',
        width: 8.4, // fills the front inside the blue stitch frame (texture made at this 8.4 x 6.4 ratio)
        height: 6.4,
        top: 7.2, // height of the rod
      },
      // real 3D sneaker (src/Sneaker3D.jsx): the Magic Carpet, गलीLABS on the sole
      hangingSneaker3d: {
        logoUrl: '/brands/gullylabs/logo_shape.json',
        monogramUrl: '/brands/gullylabs/monogram_shape.json',
        insoleUrl: '/brands/gullylabs/carpet_tile.png', // red carpet print insole
        // real textured 3D model, made from the product photos with image-to-3D (Higgsfield / Meshy).
        // Remove modelUrl to go back to the code-built shoe.
        modelUrl: '/brands/gullylabs/magic_carpet.glb',
        modelRotation: [0, 0, 0], // turns the raw model so its heel is at -x and the sole at the bottom
        length: 5.2, // world units, heel to toe
        x: 0.2, // from the block's front centre
        y: 4.3, // height of the shoe
        z: 1.9, // how far it hangs in front of the wall
        tilt: 0.3, // heel raised (radians)
        showSole: 0.45, // how far the sole turns towards the viewer (radians): sole + side both visible
        ropeX: 0.3,
        ropeColor: '#d8262b', // red, like the shoe's laces
        sway: true,
      },
      // spotlight on the floor in front of the block, so the eye lands here first
      // removed at the user's request (beam + floor pool not wanted). To bring it back, rename to focusLight:
      // (poolRadius / poolStrength = the bright circle on the floor; beam = visible light cone, 0 = off)
      focusLightOff:{ floorZ: 3.2, intensity: 180, angle: 0.36, poolRadius: 2.8, poolStrength: 0.9, beam: 0.04 },
      // older flat photo cut-out (used only if hangingSneaker3d is removed)
      hangingShoe: {
        image: '/brands/gullylabs/hanging_shoe.png',
        width: 5.4, // world units
        x: 0.2, // from the block's front centre
        y: 4.0, // height of the shoe's centre
        z: 1.4, // how far it hangs in front of the wall
        ropeX: 0.35,
        ropeColor: '#1d3fc4',
      },
      hideLogo: true, // set false to show the raised गलीLABS logo (sign below) on the wall too
      baseboard: '#1d4fc9', // the shoe's embroidery blue
      sign: {
        shape: '/brands/gullylabs/logo_shape.json', // traced from Gully Labs' white logo
        outline: '/brands/gullylabs/logo_outline_shape.json', // piping border
        outlineColor: '#0b2280', // navy piping, so the white letters read on both blue and white
        glow: '/brands/gullylabs/logo_glow.png',
        glowPad: 0.25,
        glowStrength: 0.3,
        widthRatio: 0.62,
        color: '#ffffff',
        depth: 0.26, // deeper letters for a clear emboss
      },
    },
    // Bay: plain white back wall (minimal, for the shoes) with the गL monogram + tagline strip,
    // simple side walls (a few pale blue stitch lines on white stucco), Gully blue trim.
    bay: {
      backPlain: true,
      back: '/brands/gullylabs/mc_back.jpg', // cream leather + thin blue stitched frame (matches the side walls)
      backBump: '/brands/gullylabs/leather_bump.png',
      tagline: '/brands/gullylabs/bay_tagline.png',
      // minimal Magic Carpet side walls: cream leather, one thin blue stitched frame, ||| cross stitches
      // (older pale stitch-line walls: bay_sides.jpg)
      sides: '/brands/gullylabs/mc_front_plain.jpg',
      sidesBump: '/brands/gullylabs/leather_bump.png', // leather grain
      sidesTile: 10, // one image across each 10-unit side wall
      trim: '#1d4fc9', // the shoe's embroidery blue
      label: '#9a9a96',
      // 24 women + 24 men from gullylabs.com, same display as Comet, with Gully-blue sign + ledges
      shelves: {
        left: { list: '/brands/gullylabs/women_wall.json', heading: 'WOMEN', sign: { bg: '#1d4fc9' }, ledgeColor: '#1d4fc9', labelColor: '#1b2a6e' },
        backLeft: { list: '/brands/gullylabs/women_back.json', heading: 'WOMEN', sign: { bg: '#1d4fc9' }, ledgeColor: '#1d4fc9', labelColor: '#1b2a6e' },
        backRight: { list: '/brands/gullylabs/men_back.json', heading: 'MEN', sign: { bg: '#1d4fc9' }, ledgeColor: '#1d4fc9', labelColor: '#1b2a6e' },
        right: { list: '/brands/gullylabs/men_right.json', heading: 'MEN', sign: { bg: '#1d4fc9' }, ledgeColor: '#1d4fc9', labelColor: '#1b2a6e' },
      },
    },
  },
]

// Experiments that can be switched off (false) or deleted.
export const EXPERIMENTS = {
  gapsyLighting: true, // slotted light ceiling + wall-wash light, from gapsystudio.com (src/experiments/GapsyLighting.jsx)
}

// Entrance zone back wall (left of the first logo block): same royal dark blue concrete as the
// Comet block's sides, so the block and this wall read as one blue corner at the start view.
export const ENTRANCE = {
  leftWall: true, // close the left end with a wall (the front of the walkway stays open)
  wallFinish: '/brands/comet/block_concrete_blue.jpg',
  wallFinishTile: 5, // world units per texture tile
  baseboard: '#141f42',
}

// Floor finish. 'glass' = light grey polished glass that reflects the walls; 'concrete' = matte microcement.
export const FLOOR = {
  style: 'glass',
  // light grey marble slabs under the glass shine (made from the user's marble image:
  // assets/textures/floor_marble_source.png, laid as 4 x 2 slabs with thin joints)
  texture: '/textures/floor_marble.jpg',
  textureTile: 16, // world units covered by one texture (4 x 8 slabs)
  color: '#d6d6d3', // light grey (used only when there is no texture)
  mirror: 0.6, // reflection amount, 0..1
  reflectionStrength: 1.4, // how bright the reflections are
}

// Sizes (world units). Proportions follow the sketch, with bays widened to 2x the blocks.
export const WALL_HEIGHT = 8
export const ENTRANCE_WIDTH = 10 // open zone at the left before the first block
export const BLOCK_WIDTH = 10 // solid logo block, along X
export const BAY_WIDTH = 20 // brand area, along X (twice the block width)
export const BAY_DEPTH = 10 // how deep blocks and bays go back from the walkway
export const CORRIDOR_DEPTH = 16 // walkway in front of the blocks and bays (wide, so the camera can stand back)

// X ranges of one brand's block and bay (x = 0 is the entrance's left edge).
export function brandSlots(index) {
  const blockX0 = ENTRANCE_WIDTH + index * (BLOCK_WIDTH + BAY_WIDTH)
  const bayX0 = blockX0 + BLOCK_WIDTH
  return {
    block: { x0: blockX0, x1: bayX0, cx: blockX0 + BLOCK_WIDTH / 2 },
    bay: { x0: bayX0, x1: bayX0 + BAY_WIDTH, cx: bayX0 + BAY_WIDTH / 2 },
  }
}

export const STORE_LENGTH = ENTRANCE_WIDTH + BRANDS.length * (BLOCK_WIDTH + BAY_WIDTH)

// Text on the highlighted CTA button in the bottom tab bar (jumps to the CTA wall).
export const CTA_LABEL = 'Shop Now'

// Call-to-action area: the part of the store's end wall beside the walkway (z = 0 .. CORRIDOR_DEPTH).
// The scroll tour ends here.
export const CTA_WALL = {
  x: STORE_LENGTH, // the end wall's inner face
  z: CORRIDOR_DEPTH / 2, // centre of the walkway part
  y: WALL_HEIGHT / 2,
  width: CORRIDOR_DEPTH,
  // same white stucco + blue baseboard as the Gully Labs bay wall next to it, but plain (no stitch lines)
  // plain cream leather, no design (matches the Gully Labs bay next to it). Older: stucco_plain.jpg
  finish: '/brands/gullylabs/mc_plain.jpg',
  bump: '/brands/gullylabs/leather_bump.png',
  finishTile: 10, // world units per texture across
  trim: '#1d4fc9',
}

export async function loadProducts(brandId) {
  const res = await fetch(`/brands/${brandId}/picks.json`)
  const list = await res.json()
  return list.map((p) => ({ ...p, image: `/brands/${brandId}/${p.file}` }))
}

// Intro / loading screen (src/Intro.jsx): six logos ride a wave in, turn into a ring, wave out,
// then the site logo shows with the loading %. Logos are drawn in `color` using the PNG as a mask.
export const INTRO = {
  logos: [
    { src: '/brands/comet/logo.png', aspect: '1036 / 468', width: 'min(13vw, 150px)', color: '#ffffff' },
    { src: '/brands/gullylabs/logo.png', aspect: '1044 / 320', width: 'min(15vw, 175px)', color: '#ffffff' },
  ],
  // black concrete, the same grain as the entrance walls (made from block_concrete_blue.jpg)
  background: '/textures/loader_concrete_black.jpg',
  // your logo on the last screen: "Indian" written in Hindi script (इंडियन - the English word, not भारतीय)
  // + "Shoes" in English, drawn as text in Poppins (which has both alphabets).
  // To use an image instead, set siteLogo to a file in store/public, e.g. '/site-logo.png'.
  siteLogo: null,
  siteName: 'IndianShoes',
  wordmark: [
    { text: 'इंडियन', lang: 'hi' },
    { text: 'Shoes', lang: 'en' },
  ],
}
