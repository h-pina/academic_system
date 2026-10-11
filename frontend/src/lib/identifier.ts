import { isValidCpf, sanitizeCpf } from "@/lib/cpf";

export const REGISTRATION_NUMBER_LENGTH = 10;

export type LoginIdentifierResult =
  | { ok: true; value: string; kind: "cpf" | "registration" }
  | { ok: false; error: string };

/**
 * Normalizes what the user typed in the login field: punctuation is ignored,
 * 11 digits must be a valid CPF, 10 digits is a matrícula (registration number).
 */
export function normalizeLoginIdentifier(raw: string): LoginIdentifierResult {
  const digits = sanitizeCpf(raw);

  if (digits.length === 11) {
    return isValidCpf(digits)
      ? { ok: true, value: digits, kind: "cpf" }
      : { ok: false, error: "CPF inválido." };
  }
  if (digits.length === REGISTRATION_NUMBER_LENGTH) {
    return { ok: true, value: digits, kind: "registration" };
  }
  return {
    ok: false,
    error: "Informe um CPF (11 dígitos) ou uma matrícula (10 dígitos).",
  };
}
