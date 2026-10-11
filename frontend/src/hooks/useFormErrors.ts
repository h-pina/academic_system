"use client";

import { useCallback, useEffect, useState } from "react";
import type { FieldErrors } from "@/lib/fieldErrors";

/**
 * The error messages shown on a form's fields. They start from what the
 * parent hands in (typically the API's validation errors), can be replaced
 * by the form's own client-side validation, and a field's message goes away
 * as soon as the person edits that field.
 */
export function useFormErrors(incoming?: FieldErrors) {
  const [errors, setErrors] = useState<FieldErrors>(incoming ?? {});

  useEffect(() => {
    if (incoming) setErrors(incoming);
  }, [incoming]);

  const clear = useCallback((field: string) => {
    setErrors((current) => {
      if (!(field in current)) return current;
      const next = { ...current };
      delete next[field];
      return next;
    });
  }, []);

  return { errors, setErrors, clear };
}
