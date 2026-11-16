import { Suspense, useEffect, useMemo } from 'react'
import * as THREE from 'three'
import { Canvas } from '@react-three/fiber'
import { OrbitControls, useGLTF } from '@react-three/drei'

// The shoe card's 3D view: the shoe's own model, turning slowly by itself (drag to turn it by hand).
// Loaded on demand (ProductCard.jsx lazy-imports this file), so it adds nothing to the store's first load.
// The model is fitted the same way as on the shelves (ShoeWall.jsx): its long side is turned along x, it is centred, and `flip` turns it
// 180 degrees if its toe points the wrong way.

const WIDTH = 3 // world units, toe to heel

function Shoe({ url, flip, onReady }) {
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
    const k = WIDTH / size.x
    const c = box.getCenter(new THREE.Vector3())
    return { obj, k, offset: [-c.x * k, -c.y * k, -c.z * k] }
  }, [scene])
  useEffect(() => {
    onReady?.()
  }, [onReady])
  return (
    <group rotation={[0, flip ? Math.PI : 0, 0]}>
      <group position={fitted.offset} scale={fitted.k}>
        <primitive object={fitted.obj} />
      </group>
    </group>
  )
}

// phones and tablets: a lighter canvas (1x pixels, no edge smoothing, low-power GPU) so it fits beside the store's own 3D view
const SMALL_SCREEN = typeof window !== 'undefined' && window.matchMedia?.('(max-width: 900px), (pointer: coarse)').matches

export default function ShoeViewer3D({ url, flip, onReady, onFail }) {
  const reduce = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  return (
    <Canvas
      dpr={SMALL_SCREEN ? 1 : [1, 2]}
      camera={{ position: [0, 0.5, 5.4], fov: 28 }}
      gl={{ alpha: true, antialias: !SMALL_SCREEN, powerPreference: SMALL_SCREEN ? 'low-power' : 'default', toneMapping: THREE.NeutralToneMapping }}
      style={{ touchAction: 'pan-y' }}
      onCreated={({ gl }) => {
        // if the browser drops this view (a phone short of graphics memory), the card goes back to the photo
        gl.domElement.addEventListener('webglcontextlost', (e) => {
          e.preventDefault()
          onFail?.()
        })
      }}
    >
      <ambientLight intensity={1.5} />
      <hemisphereLight args={['#ffffff', '#e6e3dd', 0.9]} />
      <directionalLight position={[3, 4, 5]} intensity={1.5} />
      <directionalLight position={[-4, 2, -3]} intensity={0.6} />
      <Suspense fallback={null}>
        <Shoe url={url} flip={flip} onReady={onReady} />
      </Suspense>
      <OrbitControls
        enableZoom={false}
        enablePan={false}
        autoRotate={!reduce}
        autoRotateSpeed={5}
        minPolarAngle={1.2}
        maxPolarAngle={1.6}
        target={[0, 0, 0]}
      />
    </Canvas>
  )
}
