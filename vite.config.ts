import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

const demo = process.env.VITE_DEMO === '1'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // La demo se arma como un solo archivo con rutas relativas
  base: demo ? './' : '/',
  build: demo ? { outDir: 'dist-demo', rolldownOptions: { output: { inlineDynamicImports: true } } } : {},
})
