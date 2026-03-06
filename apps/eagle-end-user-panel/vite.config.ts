import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      // Point to the local monorepo source so changes in packages/eagle-widget-library/src
      // are picked up by Vite's HMR without needing to rebuild the library dist.
      '@gsc-tech/eagle-widget-library': path.resolve(__dirname, '../../packages/eagle-widget-library/src/index.ts'),
    },
  },
})
