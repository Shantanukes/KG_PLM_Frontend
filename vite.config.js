import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    host: true,
    allowedHosts: true,
    proxy: {
      '/api': {
        target: 'http://203.16.202.17:5000',
        changeOrigin: true,
        secure: false,
      }
    }
  },
  build: {
    sourcemap: false, // Disable source maps in production to prevent source code exposure
  }
});

