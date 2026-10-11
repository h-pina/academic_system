import { describe, expect, it } from "vitest";
import { prerequisiteFailureMessage } from "@/lib/messages";

describe("prerequisiteFailureMessage", () => {
  it("keeps the API reason so the user knows why", () => {
    expect(
      prerequisiteFailureMessage(
        "Estes pré-requisitos criariam um ciclo de dependência",
      ),
    ).toBe(
      "A disciplina foi salva, mas os pré-requisitos não foram aplicados: Estes pré-requisitos criariam um ciclo de dependência.",
    );
  });

  it("does not double the final period", () => {
    expect(prerequisiteFailureMessage("Algo falhou.")).toBe(
      "A disciplina foi salva, mas os pré-requisitos não foram aplicados: Algo falhou.",
    );
  });

  it("falls back to a generic message without a reason", () => {
    expect(prerequisiteFailureMessage("  ")).toBe(
      "A disciplina foi salva, mas os pré-requisitos não foram aplicados.",
    );
  });
});
