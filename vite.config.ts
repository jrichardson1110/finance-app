import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

const API_PORT = 8787;

export default defineConfig({
  plugins: [react()],
  // Bind to loopback only; never expose the dev/preview server on all interfaces.
  server: {
    host: '127.0.0.1',
    port: 5173,
    // The browser calls same-origin /api; Vite forwards it to the local market data server.
    proxy: { '/api': `http://127.0.0.1:${API_PORT}` },
  },
  preview: { host: '127.0.0.1', port: 4173 },
  test: {
    css: false,
    restoreMocks: true,
    projects: [
      {
        extends: true,
        test: {
          name: 'client',
          environment: 'jsdom',
          setupFiles: ['./src/test/setup.ts'],
          include: ['src/**/*.test.{ts,tsx}'],
        },
      },
      {
        extends: true,
        test: {
          name: 'server',
          environment: 'node',
          include: ['server/**/*.test.ts', 'shared/**/*.test.ts'],
        },
      },
    ],
  },
});
