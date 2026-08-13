import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'node',
    include: ['**/*.test.ts', '**/*.test.tsx'],
    globals: true,
    setupFiles: ['vitest.setup.ts'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './'),
      // `server-only` throws when bundled for the client; stub it so server
      // modules that import it can be unit-tested under node.
      'server-only': path.resolve(__dirname, './vitest.server-only-stub.ts'),
    },
  },
});
