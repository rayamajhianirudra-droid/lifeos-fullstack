import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // Keep the existing REACT_APP_* variable names so the Vercel settings keep
  // working unchanged. Only variables with these prefixes reach the browser
  // bundle, so server secrets can never leak into it by accident.
  envPrefix: ['VITE_', 'REACT_APP_'],
  server: { port: 3000 },          // the backend's CORS allowlist covers localhost:3000
  preview: { port: 3000 },
  build: {
    outDir: 'build',               // same folder CRA used, so Vercel's output setting still matches
    sourcemap: false,              // don't publish readable source maps of the app
    chunkSizeWarningLimit: 1500,
  },
  test: {
    environment: 'jsdom',
    setupFiles: './src/setupTests.js',
    include: ['src/**/*.test.{js,jsx}'],
    css: false,
  },
});
