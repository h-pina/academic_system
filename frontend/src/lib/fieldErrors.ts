/** Validation errors keyed by form field. */
export type FieldErrors = Record<string, string>;

export interface ApiFieldError {
  field: string;
  message: string;
}

/**
 * Turns the API's `errors` array into one message per field (the first one
 * wins, so a field never shows a wall of text). Entries that are not
 * well-formed are ignored.
 */
export function toFieldErrors(raw: unknown): FieldErrors {
  if (!Array.isArray(raw)) return {};

  const result: FieldErrors = {};
  for (const entry of raw) {
    if (
      entry &&
      typeof entry === "object" &&
      typeof (entry as ApiFieldError).field === "string" &&
      typeof (entry as ApiFieldError).message === "string"
    ) {
      const { field, message } = entry as ApiFieldError;
      if (!(field in result)) result[field] = message;
    }
  }
  return result;
}

export function hasFieldErrors(errors: FieldErrors | undefined | null): boolean {
  return Boolean(errors) && Object.keys(errors as FieldErrors).length > 0;
}

/** Messages of the fields that were not rendered by the form (shown in a toast). */
export function unmappedMessages(
  errors: FieldErrors,
  knownFields: readonly string[],
): string[] {
  return Object.entries(errors)
    .filter(([field]) => !knownFields.includes(field))
    .map(([, message]) => message);
}
