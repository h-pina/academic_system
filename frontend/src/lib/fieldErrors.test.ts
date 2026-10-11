import { describe, expect, it } from "vitest";
import { hasFieldErrors, toFieldErrors, unmappedMessages } from "@/lib/fieldErrors";

describe("toFieldErrors", () => {
  it("keeps one message per field, the first winning", () => {
    expect(
      toFieldErrors([
        { field: "cpf", message: "CPF deve ser um CPF válido" },
        { field: "cpf", message: "outra mensagem" },
        { field: "name", message: "Nome é curto demais" },
      ]),
    ).toEqual({
      cpf: "CPF deve ser um CPF válido",
      name: "Nome é curto demais",
    });
  });

  it("ignores anything that is not a well-formed entry", () => {
    expect(toFieldErrors(undefined)).toEqual({});
    expect(toFieldErrors("erro")).toEqual({});
    expect(toFieldErrors([null, 3, { field: 1 }, { field: "ok" }, { message: "x" }])).toEqual({});
  });
});

describe("hasFieldErrors", () => {
  it("is true only when some field has a message", () => {
    expect(hasFieldErrors({ cpf: "x" })).toBe(true);
    expect(hasFieldErrors({})).toBe(false);
    expect(hasFieldErrors(undefined)).toBe(false);
  });
});

describe("unmappedMessages", () => {
  it("lists the messages of fields the form does not have", () => {
    expect(
      unmappedMessages({ cpf: "a", extra: "O campo não é permitido" }, ["cpf", "name"]),
    ).toEqual(["O campo não é permitido"]);
  });
});
