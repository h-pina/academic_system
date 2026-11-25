import { describe, expect, it, vi } from 'vitest';
import {
  assertSafeConfiguration,
  resolveCorsOrigins,
  securityHeaders,
} from './security';

describe('assertSafeConfiguration', () => {
  it('accepts anything outside production', () => {
    expect(() => assertSafeConfiguration({ NODE_ENV: 'development', JWT_SECRET: 'x' })).not.toThrow();
  });
  it('rejects a missing or short secret in production', () => {
    expect(() => assertSafeConfiguration({ NODE_ENV: 'production' })).toThrow(/JWT_SECRET/);
    expect(() => assertSafeConfiguration({ NODE_ENV: 'production', JWT_SECRET: 'short' })).toThrow();
  });
  it('accepts a long secret in production', () => {
    expect(() => assertSafeConfiguration({ NODE_ENV: 'production', JWT_SECRET: 'x'.repeat(40) })).not.toThrow();
  });
});

describe('resolveCorsOrigins', () => {
  it('allows every origin in development and none in production by default', () => {
    expect(resolveCorsOrigins({ NODE_ENV: 'development' })).toBe(true);
    expect(resolveCorsOrigins({ NODE_ENV: 'production' })).toBe(false);
  });
  it('uses the configured list', () => {
    expect(resolveCorsOrigins({ NODE_ENV: 'production', CORS_ORIGIN: 'https://a.edu, https://b.edu' })).toEqual([
      'https://a.edu',
      'https://b.edu',
    ]);
  });
});

describe('securityHeaders', () => {
  const run = (production: boolean) => {
    const headers: Record<string, string> = {};
    const res = {
      removeHeader: vi.fn(),
      setHeader: (name: string, value: string) => {
        headers[name] = value;
      },
    };
    const next = vi.fn();
    securityHeaders(production)({} as never, res as never, next);
    return { headers, next, res };
  };

  it('sets the baseline headers and calls next', () => {
    const { headers, next, res } = run(false);
    expect(headers['X-Content-Type-Options']).toBe('nosniff');
    expect(headers['X-Frame-Options']).toBe('DENY');
    expect(headers['Strict-Transport-Security']).toBeUndefined();
    expect(res.removeHeader).toHaveBeenCalledWith('X-Powered-By');
    expect(next).toHaveBeenCalled();
  });
  it('adds HSTS in production', () => {
    expect(run(true).headers['Strict-Transport-Security']).toContain('max-age');
  });
});
