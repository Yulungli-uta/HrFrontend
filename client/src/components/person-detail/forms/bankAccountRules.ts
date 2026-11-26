// Reglas para detectar cuentas bancarias duplicadas (las mismas que aplica el backend en BankAccountRules.cs):
// la misma entidad financiera (sin importar mayúsculas, tildes ni espacios) y el mismo número de cuenta (sin espacios ni guiones).

export interface BankAccountLike {
  accountId?: number | null;
  financialInstitution?: string | null;
  accountNumber?: string | null;
}

/** Entidad en minúsculas, sin tildes y con los espacios normalizados. */
export const normalizeInstitution = (value?: string | null): string =>
  (value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();

/** Número de cuenta solo con letras y dígitos, en mayúsculas. */
export const normalizeAccountNumber = (value?: string | null): string => (value ?? "").replace(/[^0-9A-Za-z]/g, "").toUpperCase();

/**
 * Devuelve la cuenta ya registrada que es igual a la candidata (misma entidad y mismo número), ignorando la que se está editando.
 * Un número vacío nunca cuenta como duplicado.
 */
export function findDuplicateBankAccount<T extends BankAccountLike>(
  existing: readonly T[],
  candidate: { accountId?: number | null; financialInstitution: string; accountNumber: string },
): T | undefined {
  const number = normalizeAccountNumber(candidate.accountNumber);
  if (!number) return undefined;
  const institution = normalizeInstitution(candidate.financialInstitution);
  return existing.find(
    (account) =>
      (account.accountId ?? -1) !== (candidate.accountId ?? -2) &&
      normalizeAccountNumber(account.accountNumber) === number &&
      normalizeInstitution(account.financialInstitution) === institution,
  );
}
