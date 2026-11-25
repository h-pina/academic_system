import { describe, expect, it } from 'vitest';
import { allocateSeats, rankRequests } from './allocation';

const req = (
  enrollmentId: number,
  mandatory: boolean,
  entryYear: number,
  requestedAt = '2026-02-02T10:00:00Z',
) => ({ enrollmentId, mandatory, entryYear, requestedAt });

describe('rankRequests', () => {
  it('puts mandatory subjects before optional ones', () => {
    expect(rankRequests([req(1, false, 2020), req(2, true, 2026)]).map((r) => r.enrollmentId)).toEqual([2, 1]);
  });

  it('then favours older cohorts', () => {
    expect(rankRequests([req(1, true, 2026), req(2, true, 2024)]).map((r) => r.enrollmentId)).toEqual([2, 1]);
  });

  it('then the earlier request, and finally the lower id', () => {
    const ranked = rankRequests([
      req(3, true, 2025, '2026-02-03T00:00:00Z'),
      req(2, true, 2025, '2026-02-02T00:00:00Z'),
      req(1, true, 2025, '2026-02-02T00:00:00Z'),
    ]);
    expect(ranked.map((r) => r.enrollmentId)).toEqual([1, 2, 3]);
  });

  it('does not change the input', () => {
    const input = [req(1, false, 2026), req(2, true, 2020)];
    rankRequests(input);
    expect(input.map((r) => r.enrollmentId)).toEqual([1, 2]);
  });
});

describe('allocateSeats', () => {
  const requests = [req(1, true, 2024), req(2, true, 2025), req(3, false, 2020)];

  it('gives the seats to the best ranked', () => {
    const { allocated, notAllocated } = allocateSeats(requests, 2);
    expect(allocated.map((r) => r.enrollmentId)).toEqual([1, 2]);
    expect(notAllocated.map((r) => r.enrollmentId)).toEqual([3]);
  });

  it('allocates everyone when there are enough seats', () => {
    expect(allocateSeats(requests, 10).notAllocated).toEqual([]);
  });

  it('allocates nobody without free seats, and never uses a negative count', () => {
    expect(allocateSeats(requests, 0).allocated).toEqual([]);
    expect(allocateSeats(requests, -3).allocated).toEqual([]);
  });
});
