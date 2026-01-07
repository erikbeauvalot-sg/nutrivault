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
          // Vendor chunks for better caching
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'ui-vendor': ['@heroicons/react'],
          'utils': ['axios', 'jwt-decode'],
        },
      },
    },
    chunkSizeWarningLimit: 1000, // 1MB warning threshold
  },
});
