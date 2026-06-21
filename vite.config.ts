import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: { globals: true, environment: 'jsdom', setupFiles: './src/test/setup.ts' },
  build: {
    target: 'es2022',
    rollupOptions: {
      output: { manualChunks(id) { if (id.includes('react-leaflet') || id.includes('/leaflet/')) return 'leaflet'; if (id.includes('@supabase')) return 'supabase'; if (id.includes('/react/') || id.includes('/react-dom/') || id.includes('react-router')) return 'react'; return undefined } },
    },
  },
})
