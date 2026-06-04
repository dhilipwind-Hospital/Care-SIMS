import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'icons/icon-192.png', 'icons/icon-512.png'],
      manifest: {
        name: 'Ayphen HMS',
        short_name: 'Ayphen',
        description: 'Modern Hospital Management System',
        theme_color: '#0F766E',
        background_color: '#ffffff',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any maskable' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/.*\.vercel\.app\/api\/.*/i,
            handler: 'NetworkFirst',
            options: { cacheName: 'api-cache', networkTimeoutSeconds: 10 },
          },
        ],
      },
    }),
  ],
  resolve: { alias: { '@': path.resolve(__dirname, './src') } },
  build: {
    // Split big vendor deps into named chunks so they cache independently
    // of app code. The default behaviour bundles everything react-adjacent
    // into the main entry, which is why first-paint was 445KB+.
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'recharts-vendor': ['recharts'],
          'icons-vendor': ['lucide-react'],
          'ui-vendor': ['react-hot-toast'],
          'barcode-vendor': ['@zxing/library'],
          'socket-vendor': ['socket.io-client'],
        },
      },
    },
  },
  server: {
    port: 5555,
    host: true,
    proxy: {
      '/api': { target: 'http://localhost:6666', changeOrigin: true },
      '/uploads': { target: 'http://localhost:6666', changeOrigin: true },
      '/socket.io': { target: 'http://localhost:6666', ws: true, changeOrigin: true },
    },
  },
})
