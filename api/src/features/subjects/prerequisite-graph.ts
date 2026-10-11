/**
 * Prerequisite graph helpers. The graph maps a subject id to the ids of the
 * subjects it requires.
 */
export type PrerequisiteGraph = ReadonlyMap<number, readonly number[]>;

/**
 * True when making `subjectId` require `newPrerequisiteIds` would create a
 * cycle, i.e. when `subjectId` is already (transitively) a prerequisite of
 * any of the new prerequisites, or is one of them.
 *
 * The existing edges of `subjectId` itself are ignored, since they are the
 * ones being replaced.
 */
export function wouldCreateCycle(
  graph: PrerequisiteGraph,
  subjectId: number,
  newPrerequisiteIds: readonly number[],
): boolean {
  const visited = new Set<number>();
  const stack = [...newPrerequisiteIds];

  while (stack.length > 0) {
    const current = stack.pop() as number;
    if (current === subjectId) {
      return true;
    }
    if (visited.has(current)) {
      continue;
    }
    visited.add(current);

    for (const next of graph.get(current) ?? []) {
      stack.push(next);
    }
  }
  return false;
}

/** Builds the graph from `subject -> prerequisite` rows. */
export function buildGraph(
  rows: readonly { subjectId: number; prerequisiteId: number }[],
): Map<number, number[]> {
  const graph = new Map<number, number[]>();
  for (const { subjectId, prerequisiteId } of rows) {
    const list = graph.get(subjectId) ?? [];
    list.push(prerequisiteId);
    graph.set(subjectId, list);
  }
  return graph;
}
