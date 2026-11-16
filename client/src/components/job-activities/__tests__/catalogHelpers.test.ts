import { describe, expect, it } from "vitest";
import { toIsActive } from "@/hooks/useCatalogPaged";
import { mapPagedItems } from "../mapPagedItems";
import { normalizeOccupationalGroup } from "@/types/Job-activities";
import type { ApiResponse, PagedResult } from "@/lib/api";

describe("toIsActive", () => {
  it("traduce el filtro de estado al parámetro del servidor", () => {
    expect(toIsActive("all")).toBeUndefined();
    expect(toIsActive("active")).toBe(true);
    expect(toIsActive("inactive")).toBe(false);
  });
});

describe("mapPagedItems", () => {
  const page = (items: unknown[]): ApiResponse<PagedResult<unknown>> => ({
    status: "success",
    data: { items, page: 2, pageSize: 10, totalCount: 31, totalPages: 4, hasPreviousPage: true, hasNextPage: true },
  });

  it("normaliza cada item y conserva los datos de paginación", () => {
    const res = mapPagedItems(page([{ GroupId: 7, Description: "SERVIDOR PUBLICO 1", Rmu: "817", DegreeId: 3, IsActive: true }]), normalizeOccupationalGroup);
    expect(res.status).toBe("success");
    if (res.status !== "success") return;
    expect(res.data.items[0]).toMatchObject({ groupId: 7, description: "SERVIDOR PUBLICO 1", rmu: 817, degreeId: 3, isActive: true });
    expect(res.data).toMatchObject({ page: 2, pageSize: 10, totalCount: 31, totalPages: 4, hasPreviousPage: true, hasNextPage: true });
  });

  it("deja pasar el error sin tocarlo", () => {
    const error = { status: "error", error: { message: "falló", code: "X" } } as unknown as ApiResponse<PagedResult<unknown>>;
    expect(mapPagedItems(error, normalizeOccupationalGroup)).toBe(error);
  });
});
