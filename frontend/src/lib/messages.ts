/**
 * The subject itself is saved before its prerequisites are applied, so when
 * the API rejects the prerequisites the user must learn both facts: the
 * subject was saved, and why the prerequisites were not.
 */
export function prerequisiteFailureMessage(reason: string): string {
  const detail = reason.trim().replace(/[.\s]+$/, "");
  return detail
    ? `A disciplina foi salva, mas os pré-requisitos não foram aplicados: ${detail}.`
    : "A disciplina foi salva, mas os pré-requisitos não foram aplicados.";
}
