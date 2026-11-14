import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // pre-bundle these together with React in the dev server, so a lazily discovered dependency
  // (e.g. framer-motion) can never pull in a second copy of React ("Invalid hook call")
  optimizeDeps: {
    include: ['react', 'react-dom', 'react-dom/client', 'three', '@react-three/fiber', '@react-three/drei', 'framer-motion'],
  },
  resolve: { dedupe: ['react', 'react-dom', 'three'] },
})
