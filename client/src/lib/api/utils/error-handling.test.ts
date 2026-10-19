import { describe, expect, it } from "vitest";
import { getServerErrorMessage } from "./error-handling";

describe("getServerErrorMessage", () => {
  it("devuelve el mensaje exacto del servidor para un ApiError de core/fetch", () => {
    const err = {
      code: 403,
      message: "Solo puedes registrar tu picada dentro del campus.",
      details: { title: "Picada no permitida", status: 403, code: "PUNCH_OUTSIDE_CAMPUS" },
    };
    expect(getServerErrorMessage(err)).toBe("Solo puedes registrar tu picada dentro del campus.");
  });

  it("no agrega los detalles al mensaje", () => {
    expect(getServerErrorMessage({ code: 409, message: "Ya existe", details: { a: 1 } })).toBe("Ya existe");
  });

  it("devuelve null si el error no tiene el formato { code:number, message:string }", () => {
    expect(getServerErrorMessage(null)).toBeNull();
    expect(getServerErrorMessage("texto")).toBeNull();
    expect(getServerErrorMessage(new Error("x"))).toBeNull();
    expect(getServerErrorMessage({ status: 403, message: "x" })).toBeNull();
    expect(getServerErrorMessage({ code: 403, message: "   " })).toBeNull();
  });
});
