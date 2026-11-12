/**
 * Normaliza un DOI igual que el backend (DoiNormalizer.cs y la columna HR.tbl_Publications.DoiNormalized): minúsculas,
 * sin prefijo de URL ni "doi:"; si el resultado no empieza con "10." (p. ej. una URL de ORCID o de una revista)
 * no es un DOI y devuelve null.
 */
const DOI_PREFIXES = ["https://doi.org/", "http://doi.org/", "https://dx.doi.org/", "http://dx.doi.org/", "doi.org/", "doi:"];

export function normalizeDoi(doi?: string | null): string | null {
  if (!doi || !doi.trim()) return null;
  let value = doi.trim().toLowerCase();
  for (const prefix of DOI_PREFIXES) value = value.split(prefix).join("");
  value = value.trim();
  return value.startsWith("10.") ? value : null;
}

/** URL pública del DOI (https://doi.org/…) o null si no es un DOI válido. */
export function doiUrl(doi?: string | null): string | null {
  const normalized = normalizeDoi(doi);
  return normalized ? `https://doi.org/${normalized}` : null;
}

/**
 * Texto buscable de un DOI: el valor guardado, el DOI normalizado y sus formas con URL / "doi:", para que la búsqueda
 * encuentre la publicación aunque se pegue el enlace completo, con o sin prefijo, en mayúsculas o minúsculas.
 */
export function doiSearchText(doi?: string | null): string {
  const normalized = normalizeDoi(doi);
  if (!normalized) return doi ?? "";
  return `${doi ?? ""} ${normalized} doi:${normalized} https://doi.org/${normalized}`;
}
