import { CPF_LENGTH, REGISTRATION_NUMBER_LENGTH } from '../domain/domain.constants';
import { isValidCpf, sanitizeCpf } from './cpf.util';

export type LoginIdentifier =
  | { type: 'cpf'; value: string }
  | { type: 'registration'; value: string };

/**
 * Resolves what the user typed in the login field: strip everything that is
 * not a digit; 11 digits is a CPF, 10 digits is a matrícula (registration
 * number). Anything else is not a valid identifier.
 */
export function resolveLoginIdentifier(raw: unknown): LoginIdentifier | null {
  if (typeof raw !== 'string') {
    return null;
  }

  const digits = sanitizeCpf(raw);
  if (digits.length === CPF_LENGTH && isValidCpf(digits)) {
    return { type: 'cpf', value: digits };
  }
  if (digits.length === REGISTRATION_NUMBER_LENGTH) {
    return { type: 'registration', value: digits };
  }
  return null;
}
