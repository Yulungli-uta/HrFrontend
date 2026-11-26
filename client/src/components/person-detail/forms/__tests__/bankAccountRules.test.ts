import { describe, expect, it } from "vitest";
import { findDuplicateBankAccount, normalizeAccountNumber, normalizeInstitution } from "../bankAccountRules";

const existing = [
  { accountId: 1, financialInstitution: "Banco Pichincha", accountNumber: "2200123456" },
  { accountId: 2, financialInstitution: "Banco del Pacífico", accountNumber: "998877" },
];

describe("normalizadores", () => {
  it("la entidad se compara sin tildes, mayúsculas ni espacios sobrantes", () => {
    expect(normalizeInstitution("  Cooperativa  Jardín   Azuayo ")).toBe("cooperativa jardin azuayo");
  });
  it("el número ignora espacios, guiones y puntos", () => {
    expect(normalizeAccountNumber(" 22-00.12 ab ")).toBe("220012AB");
  });
});

describe("findDuplicateBankAccount", () => {
  it("detecta la misma entidad y número", () => {
    expect(findDuplicateBankAccount(existing, { financialInstitution: "BANCO PICHINCHA", accountNumber: "2200123456" })?.accountId).toBe(1);
  });
  it("detecta tildes y guiones distintos", () => {
    expect(findDuplicateBankAccount(existing, { financialInstitution: "banco del pacifico", accountNumber: "99-88 77" })?.accountId).toBe(2);
  });
  it("la misma cuenta que se edita no cuenta como duplicado", () => {
    expect(findDuplicateBankAccount(existing, { accountId: 1, financialInstitution: "Banco Pichincha", accountNumber: "2200123456" })).toBeUndefined();
  });
  it("otro banco con el mismo número no es duplicado", () => {
    expect(findDuplicateBankAccount(existing, { financialInstitution: "Produbanco", accountNumber: "2200123456" })).toBeUndefined();
  });
  it("otro número en el mismo banco no es duplicado", () => {
    expect(findDuplicateBankAccount(existing, { financialInstitution: "Banco Pichincha", accountNumber: "2200123457" })).toBeUndefined();
  });
  it("un número vacío nunca es duplicado", () => {
    expect(findDuplicateBankAccount(existing, { financialInstitution: "Banco Pichincha", accountNumber: "" })).toBeUndefined();
  });
});
