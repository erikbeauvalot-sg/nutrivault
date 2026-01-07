import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { visualizer } from 'rollup-plugin-visualizer';

export default defineConfig({
  plugins: [
    react(),
    visualizer({
      open: false,
      gzipSize: true,
      brotliSize: true,
      filename: 'dist/bundle-stats.html',
    }),
  ],
  server: {
    port: 5173,
    open: true,
    strictPort: false,
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: {
          // React vendor chunk (largest dependencies)
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          // UI library chunk
          'ui-vendor': ['react-bootstrap', 'bootstrap', 'react-bootstrap-icons'],
          // Chart library chunk
          'chart-vendor': ['chart.js', 'react-chartjs-2'],
          // Form handling chunk
          'form-vendor': ['react-hook-form', '@hookform/resolvers', 'yup'],
          // Utility libraries
          'utils': ['axios', 'date-fns', 'uuid', 'react-toastify'],
        },
      },
    },
    chunkSizeWarningLimit: 1000, // 1MB warning threshold
  },
});
