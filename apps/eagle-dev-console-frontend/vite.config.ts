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
  }
})
