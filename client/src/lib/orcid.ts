// lib/orcid.ts
//
// Normalización y validación del ORCID iD (0000-0000-0000-000X, dígito verificador ISO 7064 MOD 11-2). Es la misma regla
// que aplica el servidor (OrcidValidator): aquí solo sirve para avisar al usuario antes de enviar; el servidor decide.

/** Devuelve el ORCID canónico (acepta la URL https://orcid.org/…, sin guiones y en minúscula) o null si no tiene 16 caracteres válidos. */
export function normalizeOrcid(input: string | null | undefined): string | null {
  if (!input) return null;
  const value = input
    .trim()
    .replace(/^(https?:\/\/)?(www\.)?orcid\.org\//i, "")
    .replace(/[-\s]/g, "")
    .toUpperCase();
  if (!/^\d{15}[\dX]$/.test(value)) return null;
  return `${value.slice(0, 4)}-${value.slice(4, 8)}-${value.slice(8, 12)}-${value.slice(12)}`;
}

/** true si el ORCID canónico tiene el dígito verificador correcto. */
export function isValidOrcidChecksum(canonical: string): boolean {
  if (!/^\d{4}-\d{4}-\d{4}-\d{3}[\dX]$/.test(canonical)) return false;
  const digits = canonical.replace(/-/g, "");
  let total = 0;
  for (let i = 0; i < 15; i++) total = (total + Number(digits[i])) * 2;
  const result = (12 - (total % 11)) % 11;
  const expected = result === 10 ? "X" : String(result);
  return digits[15] === expected;
}

export type OrcidCheck =
  | { ok: true; orcid: string }
  | { ok: false; message: string };

/** Valida lo que escribió el usuario y devuelve el ORCID canónico o el mensaje a mostrar. */
export function checkOrcid(input: string): OrcidCheck {
  if (!input.trim()) return { ok: false, message: "Ingrese su ORCID." };
  const orcid = normalizeOrcid(input);
  if (!orcid) return { ok: false, message: "El ORCID debe tener el formato 0000-0000-0000-000X." };
  if (!isValidOrcidChecksum(orcid)) {
    return { ok: false, message: "El ORCID no es válido: el dígito verificador no coincide. Revise que lo copió completo." };
  }
  return { ok: true, orcid };
}
