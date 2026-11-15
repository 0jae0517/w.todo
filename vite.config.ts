import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    // fonts stay separate files so the browser fetches only the blocks a page uses
    assetsInlineLimit: (file) => (/\.woff2?$/.test(file) ? false : undefined),
  },
})
