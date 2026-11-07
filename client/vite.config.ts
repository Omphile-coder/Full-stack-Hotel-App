import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

/** A same-origin development proxy forwards API calls and session cookies to Express. */
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    strictPort: true,
    proxy: { '/api': { target: 'http://localhost:3000', changeOrigin: true } },
  },
});

