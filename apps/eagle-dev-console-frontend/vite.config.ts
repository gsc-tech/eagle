import path from "path"
import tailwindcss from "@tailwindcss/vite"
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@gsc-tech/eagle-widget-library": path.resolve(__dirname, "../../packages/eagle-widget-library/src/index.ts")
    },
    dedupe: ['react', 'react-dom', 'react/jsx-runtime']
  },
  // Watch the widget library source so HMR fires on every save — no manual rebuild needed
  server: {
    watch: {
      // Vite ignores node_modules by default; re-include the library source
      ignored: ['!**/packages/eagle-widget-library/src/**'],
    },
  },
  // Don't pre-bundle the aliased local source — let Vite transform it live
  optimizeDeps: {
    exclude: ['@gsc-tech/eagle-widget-library'],
  },
})
