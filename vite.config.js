import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import legacy from '@vitejs/plugin-legacy'

// https://vitejs.dev/config/
export default defineConfig({
  // Explicitly set base path (use './' for relative paths, '/' for absolute)
  base: '/',
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
        manualChunks: undefined,
        // Ensure consistent chunk file names
        chunkFileNames: 'assets/[name]-[hash].js',
        entryFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]',
      }
    },
    // Increase chunk size warning limit for polyfills
    chunkSizeWarningLimit: 1000,
    // Use esbuild for minification (faster, and preserves error messages better)
    minify: 'esbuild',
    // Don't drop console in production for Android debugging
    esbuild: {
      drop: [], // Keep console.log for debugging on Android
    },
    // Ensure assets are properly referenced
    assetsInlineLimit: 4096,
    // Source maps for debugging (can be disabled in production if needed)
    sourcemap: false,
  },
  // Define environment variables for better error handling
  define: {
    __DEV__: JSON.stringify(process.env.NODE_ENV === 'development'),
  }
})
