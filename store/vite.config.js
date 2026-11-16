import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // a new id on every build: used to ask for the shoe lists under a new address after each deploy (src/dataUrl.js)
  define: { __BUILD_ID__: JSON.stringify(Date.now().toString(36)) },
  // pre-bundle these together with React in the dev server, so a lazily discovered dependency
  // (e.g. framer-motion) can never pull in a second copy of React ("Invalid hook call")
  optimizeDeps: {
    include: ['react', 'react-dom', 'react-dom/client', 'three', '@react-three/fiber', '@react-three/drei', 'framer-motion'],
  },
  resolve: { dedupe: ['react', 'react-dom', 'three'] },
})
