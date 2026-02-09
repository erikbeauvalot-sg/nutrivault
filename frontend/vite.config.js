import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true
      },
      '/public': {
        target: 'http://localhost:3001',
        changeOrigin: true
      },
      '/uploads': {
        target: 'http://localhost:3001',
        changeOrigin: true
      }
    }
  },
  build: {
    // Target modern browsers for smaller bundles
    target: 'es2015',

    // Enable minification with esbuild (faster than terser, included with Vite)
    minify: 'esbuild',

    // ESBuild minification options
    esbuild: {
      drop: ['console', 'debugger'],  // Remove console.* and debugger in production
    },

    // Code splitting and chunking strategy (US-9.2)
    rollupOptions: {
      output: {
        // Manual chunks for optimal code splitting
        manualChunks: {
          // Vendor chunk: React and related libs
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],

          // Vendor chunk: Bootstrap UI
          'vendor-ui': ['react-bootstrap', 'bootstrap'],

          // Vendor chunk: Forms and validation
          'vendor-forms': ['react-hook-form', '@hookform/resolvers', 'yup'],

          // Vendor chunk: i18n
          'vendor-i18n': ['react-i18next', 'i18next', 'i18next-browser-languagedetector'],

          // Vendor chunk: Charts
          'vendor-charts': ['recharts'],

          // Vendor chunk: PDF generation (large)
          'vendor-pdf': ['jspdf', 'html2canvas'],

          // Vendor chunk: Calendar (large)
          'vendor-calendar': ['react-big-calendar', 'date-fns'],

          // Vendor chunk: Utilities
          'vendor-utils': ['axios', 'uuid', 'file-saver', 'dompurify'],
        },

        // Asset file naming
        assetFileNames: (assetInfo) => {
          const info = assetInfo.name.split('.');
          let extType = info[info.length - 1];

          if (/\.(png|jpe?g|svg|gif|tiff|bmp|ico)$/i.test(assetInfo.name)) {
            extType = 'images';
          } else if (/\.(woff2?|eot|ttf|otf)$/i.test(assetInfo.name)) {
            extType = 'fonts';
          }

          return `assets/${extType}/[name]-[hash][extname]`;
        },

        // Chunk file naming
        chunkFileNames: 'assets/js/[name]-[hash].js',
        entryFileNames: 'assets/js/[name]-[hash].js',
      }
    },

    // Chunk size warnings (increased for large libraries like jspdf, recharts)
    chunkSizeWarningLimit: 800,

    // Source maps for debugging (disable in production for smaller size)
    sourcemap: false,

    // Report compressed size
    reportCompressedSize: true,
  },

  // Performance optimizations
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-router-dom',
      'react-bootstrap',
      'bootstrap',
      'react-hook-form',
      'react-i18next',
      'i18next'
    ],
  },
})
