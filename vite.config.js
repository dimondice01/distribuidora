import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'masked-icon.svg'],
      workbox: {
        maximumFileSizeToCacheInBytes: 5000000 // Aumentamos a 5MB para que el build no falle
      },
      manifest: {
        name: 'Distribuidora NOAR ERP',
        short_name: 'Distribuidora',
        description: 'Plataforma de logística y ventas',
        theme_color: '#4f46e5',
        icons: [
          {
            src: 'vite.svg',
            sizes: '192x192',
            type: 'image/svg+xml'
          },
          {
            src: 'vite.svg',
            sizes: '512x512',
            type: 'image/svg+xml'
          }
        ]
      }
    })
  ],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('firebase')) return 'vendor-firebase';
            if (id.includes('react')) return 'vendor-react';
            if (id.includes('lucide') || id.includes('heroicons')) return 'vendor-icons';
            if (id.includes('recharts') || id.includes('d3-') || id.includes('victory-vendor')) return 'vendor-charts';
            if (id.includes('leaflet')) return 'vendor-maps';
            return 'vendor'; // El resto de librerías
          }
        }
      }
    },
    chunkSizeWarningLimit: 1000, // Subimos el aviso a 1MB
  },
  base: './',
})