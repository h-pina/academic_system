import { afterEach } from 'vitest';

// DOM helpers are only loaded for tests running in a DOM environment.
if (typeof document !== 'undefined') {
  const { cleanup } = await import('@testing-library/react');
  await import('@testing-library/jest-dom/vitest');
  afterEach(() => cleanup());
}
