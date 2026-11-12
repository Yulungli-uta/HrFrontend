import { describe, expect, it } from "vitest";
import { doiSearchText, doiUrl, normalizeDoi } from "../doi";

describe("normalizeDoi", () => {
  it("quita el prefijo de URL y 'doi:' y pasa a minúsculas", () => {
    expect(normalizeDoi("https://doi.org/10.1016/J.Test.2024.01")).toBe("10.1016/j.test.2024.01");
    expect(normalizeDoi("http://dx.doi.org/10.1000/ABC")).toBe("10.1000/abc");
    expect(normalizeDoi("doi:10.1000/abc")).toBe("10.1000/abc");
    expect(normalizeDoi("  10.1000/abc  ")).toBe("10.1000/abc");
  });

  it("lo que no empieza con 10. no es un DOI", () => {
    expect(normalizeDoi("https://orcid.org/0000-0001-2345-6789")).toBeNull();
    expect(normalizeDoi("")).toBeNull();
    expect(normalizeDoi(undefined)).toBeNull();
  });
});

describe("doiUrl", () => {
  it("arma la URL pública solo para DOI válidos", () => {
    expect(doiUrl("DOI:10.1000/ABC")).toBe("https://doi.org/10.1000/abc");
    expect(doiUrl("https://example.com/paper")).toBeNull();
  });
});

describe("doiSearchText", () => {
  it("incluye las formas con las que se puede buscar el DOI", () => {
    const text = doiSearchText("10.1000/ABC").toLowerCase();
    expect(text).toContain("10.1000/abc");
    expect(text).toContain("https://doi.org/10.1000/abc");
    expect(text).toContain("doi:10.1000/abc");
  });

  it("un valor que no es DOI se busca tal cual", () => {
    expect(doiSearchText("https://orcid.org/0000-0001")).toBe("https://orcid.org/0000-0001");
    expect(doiSearchText(null)).toBe("");
  });
});
