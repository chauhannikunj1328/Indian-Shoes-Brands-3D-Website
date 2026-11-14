import { Suspense } from 'react'
import * as THREE from 'three'
import { Canvas } from '@react-three/fiber'
import { STORE_LENGTH, CORRIDOR_DEPTH, EXPERIMENTS } from './brands'
import Store from './Store'
import ScrollCamera from './ScrollCamera'
import TourNav from './TourNav'
import ProductCard from './ProductCard'
import Intro from './Intro'
import { GAPSY_AMBIENT } from './experiments/GapsyLighting' // gapsy experiment

const cx = STORE_LENGTH / 2
const DEFAULT_LIGHT = { ambient: 1.6, hemisphere: 0.9, front: 1.3, fill: 0.45 }
const LIGHT = EXPERIMENTS.gapsyLighting ? GAPSY_AMBIENT : DEFAULT_LIGHT // gapsy experiment

export default function App() {
  return (
    <>
      {/* Neutral tone mapping keeps whites white (the default ACES look greys them out). */}
      <Canvas
        camera={{ position: [2, 4, 8], fov: 55 }} // ScrollCamera sets the real start view on the first frame
        gl={{ toneMapping: THREE.NeutralToneMapping }}
        shadows={EXPERIMENTS.gapsyLighting ? 'soft' : false} // gapsy experiment: light bands through the ceiling slots
        // dev only: expose the scene state so the view can be inspected from the console
        onCreated={(state) => {
          if (import.meta.env.DEV) window.__store3d = state.get
        }}
      >
        <color attach="background" args={['#f4f4f2']} />
        {/* soft, even gallery light like the reference video (dimmer when the gapsy experiment is on) */}
        <ambientLight intensity={LIGHT.ambient} />
        <hemisphereLight args={['#ffffff', '#e6e3dd', LIGHT.hemisphere]} />
        {/* main light from the front of the walkway, lights block fronts and bay back walls */}
        <directionalLight position={[cx, 6, CORRIDOR_DEPTH + 20]} intensity={LIGHT.front} />
        {/* fill from the entrance side so block side faces read as separate planes */}
        <directionalLight position={[-30, 5, 4]} intensity={LIGHT.fill} />

        {/* scrolling walks the camera from the entrance to the end of the hall */}
        <ScrollCamera />
        <Suspense fallback={null}>
          <Store />
        </Suspense>
      </Canvas>
      <TourNav />
      <ProductCard />
      {/* intro + loading screen over everything while the store loads */}
      <Intro />
    </>
  )
}
