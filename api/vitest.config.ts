import swc from 'unplugin-swc';
import { defineConfig } from 'vitest/config';

// SWC is used instead of esbuild so decorator metadata (`emitDecoratorMetadata`)
// is emitted, which NestJS dependency injection relies on.
export default defineConfig({
  plugins: [
    swc.vite({
      module: { type: 'es6' },
    }),
  ],
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.spec.ts', 'test/**/*.e2e-spec.ts'],
    // Each file gets its own in-memory SQLite database; run files serially.
    fileParallelism: false,
  },
});
