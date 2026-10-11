import { describe, expect, it } from 'vitest';
import { buildGraph, wouldCreateCycle } from './prerequisite-graph';

describe('wouldCreateCycle', () => {
  // 3 requires 2, 2 requires 1 (a chain 1 <- 2 <- 3).
  const chain = buildGraph([
    { subjectId: 3, prerequisiteId: 2 },
    { subjectId: 2, prerequisiteId: 1 },
  ]);

  it('accepts a subject with no prerequisites yet', () => {
    expect(wouldCreateCycle(new Map(), 1, [2])).toBe(false);
  });

  it('accepts an independent prerequisite', () => {
    expect(wouldCreateCycle(chain, 4, [1, 2, 3])).toBe(false);
  });

  it('accepts a prerequisite further down the chain', () => {
    expect(wouldCreateCycle(chain, 3, [1])).toBe(false);
  });

  it('rejects a subject requiring itself', () => {
    expect(wouldCreateCycle(new Map(), 1, [1])).toBe(true);
  });

  it('rejects a direct cycle (1 requires 2, 2 requires 1)', () => {
    const graph = buildGraph([{ subjectId: 2, prerequisiteId: 1 }]);
    expect(wouldCreateCycle(graph, 1, [2])).toBe(true);
  });

  it('rejects a transitive cycle (1 would require 3 in the chain 1 <- 2 <- 3)', () => {
    expect(wouldCreateCycle(chain, 1, [3])).toBe(true);
  });

  it('rejects when only one of several new prerequisites closes the cycle', () => {
    expect(wouldCreateCycle(chain, 1, [4, 3])).toBe(true);
  });

  it('ignores the subject’s own current edges, which are being replaced', () => {
    // 2 currently requires 1; replacing that with 3 is a cycle (3 requires 2)...
    expect(wouldCreateCycle(chain, 2, [3])).toBe(true);
    // ...but "replacing" it with the same prerequisite is fine.
    expect(wouldCreateCycle(chain, 2, [1])).toBe(false);
  });

  it('terminates on a diamond and on an existing unrelated cycle', () => {
    const diamond = buildGraph([
      { subjectId: 4, prerequisiteId: 2 },
      { subjectId: 4, prerequisiteId: 3 },
      { subjectId: 2, prerequisiteId: 1 },
      { subjectId: 3, prerequisiteId: 1 },
      { subjectId: 8, prerequisiteId: 9 },
      { subjectId: 9, prerequisiteId: 8 },
    ]);
    expect(wouldCreateCycle(diamond, 5, [4])).toBe(false);
    expect(wouldCreateCycle(diamond, 5, [8])).toBe(false);
    expect(wouldCreateCycle(diamond, 1, [4])).toBe(true);
  });
});
