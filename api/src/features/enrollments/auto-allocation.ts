/**
 * The seats are allocated by itself once the enrollment period ends. It is on
 * by default and off under test (the tests control the moment themselves);
 * `AUTO_ALLOCATE=true|false` forces it either way.
 */
export function isAutoAllocationEnabled(env: NodeJS.ProcessEnv): boolean {
  if (env.AUTO_ALLOCATE === 'true') return true;
  if (env.AUTO_ALLOCATE === 'false') return false;
  return env.NODE_ENV !== 'test';
}

/** How often the background check looks for periods that ended. */
export const AUTO_ALLOCATION_INTERVAL_MS = 60_000;
