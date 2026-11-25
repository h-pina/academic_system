import { describe, expect, it } from 'vitest';
import { isAutoAllocationEnabled } from './auto-allocation';

describe('isAutoAllocationEnabled', () => {
  it('is on by default and off under test', () => {
    expect(isAutoAllocationEnabled({ NODE_ENV: 'development' })).toBe(true);
    expect(isAutoAllocationEnabled({ NODE_ENV: 'production' })).toBe(true);
    expect(isAutoAllocationEnabled({})).toBe(true);
    expect(isAutoAllocationEnabled({ NODE_ENV: 'test' })).toBe(false);
  });
  it('can be forced either way', () => {
    expect(isAutoAllocationEnabled({ NODE_ENV: 'test', AUTO_ALLOCATE: 'true' })).toBe(true);
    expect(isAutoAllocationEnabled({ NODE_ENV: 'production', AUTO_ALLOCATE: 'false' })).toBe(false);
  });
});
