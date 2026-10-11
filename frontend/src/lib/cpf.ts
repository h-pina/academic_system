export function sanitizeCpf(value: string | undefined | null): string {
  return (value ?? "").replace(/\D/g, "");
}

export function isValidCpf(value: string | undefined | null): boolean {
  const cpf = sanitizeCpf(value);

  if (cpf.length !== 11) return false;

  if (/^(\d)\1{10}$/.test(cpf)) return false;

  const digits = cpf.split("").map(Number);

  const checkDigit = (length: number): number => {
    let sum = 0;
    for (let i = 0; i < length; i++) {
      sum += digits[i] * (length + 1 - i);
    }
    const remainder = (sum * 10) % 11;
    return remainder === 10 ? 0 : remainder;
  };

  return checkDigit(9) === digits[9] && checkDigit(10) === digits[10];
}
