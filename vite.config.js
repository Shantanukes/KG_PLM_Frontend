import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const apiTarget = env.VITE_API_BASE_URL || 'http://203.16.202.210:5000';

  return {
    server: {
      host: true,
      allowedHosts: true,
      proxy: {
        '/api': {
          target: apiTarget,
          changeOrigin: true,
          secure: mode === 'production', // Enforce TLS in production, allow self-signed in dev
        }
      }
    },
    build: {
      sourcemap: false, // Disable source maps in production to prevent source code exposure
    }
  };
});
