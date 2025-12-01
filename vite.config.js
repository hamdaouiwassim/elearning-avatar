import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import legacy from '@vitejs/plugin-legacy'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    legacy({
      // Target Android 4.4+ (KitKat) and later versions
      targets: [
        'Android >= 4.4',
        'Chrome >= 30',
        'Safari >= 9',
        'iOS >= 9',
        'defaults',
        'not IE 11'
      ],
      // Additional polyfills needed for old Android WebView
      additionalLegacyPolyfills: [
        'regenerator-runtime/runtime',
        'core-js/stable',
        'whatwg-fetch'
      ],
      // Enable modern polyfills for better compatibility
      modernPolyfills: [
        'es.promise',
        'es.array.iterator',
        'es.object.assign',
        'es.string.includes',
        'es.string.starts-with',
        'es.string.ends-with'
      ],
      // Render legacy chunks
      renderLegacyChunks: true,
      // Polyfills for specific features
      polyfills: [
        'es.symbol',
        'es.array.filter',
        'es.promise',
        'es.promise.finally',
        'es/map',
        'es/set',
        'es.array.for-each',
        'es.object.define-properties',
        'es.object.define-property',
        'es.object.get-own-property-descriptor',
        'es.object.get-own-property-descriptors',
        'es.object.keys',
        'es.array.find',
        'es.array.find-index',
        'es.array.some',
        'es.array.every',
        'es.array.includes',
        'es.string.includes',
        'es.string.starts-with',
        'es.string.ends-with'
      ]
    }),
  ],
  build: {
    // Ensure proper chunking for legacy builds
    rollupOptions: {
      output: {
        manualChunks: undefined
      }
    },
    // Increase chunk size warning limit for polyfills
    chunkSizeWarningLimit: 1000
  }
})
