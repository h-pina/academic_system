export interface SeatRequest {
  enrollmentId: number;
  /** The subject is mandatory (not optional) in the student's curriculum. */
  mandatory: boolean;
  entryYear: number;
  /** ISO date-time the request was made. */
  requestedAt: string;
}

/**
 * Priority of the requests for a class, best first:
 * 1. subject mandatory in the student's curriculum, before optional;
 * 2. earlier entry year (older cohorts first);
 * 3. earlier request time;
 * 4. lower id, so the order is always deterministic.
 */
export function rankRequests<T extends SeatRequest>(requests: readonly T[]): T[] {
  return [...requests].sort(
    (a, b) =>
      Number(b.mandatory) - Number(a.mandatory) ||
      a.entryYear - b.entryYear ||
      a.requestedAt.localeCompare(b.requestedAt) ||
      a.enrollmentId - b.enrollmentId,
  );
}

/** Splits the ranked requests between the free seats and the rest. */
export function allocateSeats<T extends SeatRequest>(
  requests: readonly T[],
  freeSeats: number,
): { allocated: T[]; notAllocated: T[] } {
  const ranked = rankRequests(requests);
  const seats = Math.max(freeSeats, 0);
  return { allocated: ranked.slice(0, seats), notAllocated: ranked.slice(seats) };
}
