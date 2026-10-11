import { afterEach } from 'vitest';

/** A minimal in-memory Web Storage, for DOM tests. */
class MemoryStorage implements Storage {
  private data = new Map<string, string>();

  get length(): number {
    return this.data.size;
  }
  clear(): void {
    this.data.clear();
  }
  getItem(key: string): string | null {
    return this.data.has(key) ? (this.data.get(key) as string) : null;
  }
  key(index: number): string | null {
    return [...this.data.keys()][index] ?? null;
  }
  removeItem(key: string): void {
    this.data.delete(key);
  }
  setItem(key: string, value: string): void {
    this.data.set(key, String(value));
  }
  [name: string]: unknown;
}

// DOM helpers are only loaded for tests running in a DOM environment.
if (typeof document !== 'undefined') {
  // Node's own experimental Web Storage shadows jsdom's and is not usable here.
  for (const name of ['localStorage', 'sessionStorage'] as const) {
    Object.defineProperty(window, name, {
      value: new MemoryStorage(),
      configurable: true,
      writable: true,
    });
  }

  const { cleanup } = await import('@testing-library/react');
  await import('@testing-library/jest-dom/vitest');
  afterEach(() => cleanup());
}
