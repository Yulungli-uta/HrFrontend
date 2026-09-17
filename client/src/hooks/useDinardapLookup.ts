// client/src/hooks/useDinardapLookup.ts
import { useCallback, useState } from "react";
import { PersonasAPI } from "@/lib/api";
import type { DinardapRegistroCivilDto } from "@/lib/api";

/**
 * [2026-09-17] Extraído de PersonCreateDialog.tsx / FamilyMemberForm.tsx, que tenían la misma
 * lógica de consulta a DINARDAP (Registro Civil) duplicada palabra por palabra. Ahora también
 * lo usa PersonForm.tsx. Un solo lugar para los 5 estados y su segregación.
 *
 * Estados:
 * - "idle": sin cédula válida todavía (o campo vacío/muy corto).
 * - "checking": consulta en curso — el llamador debe bloquear el resto del formulario mientras
 *   esto es true, para no dejar editar campos que la respuesta puede sobreescribir.
 * - "found": DINARDAP respondió 200 con al menos un dato real (nombres/apellidos/fecha de
 *   nacimiento) — se llama `onFound` con el DTO completo para que cada formulario mapee los
 *   campos que le interesan (no todos los formularios quieren los mismos).
 * - "not-found": DINARDAP respondió 200 pero la cédula no tiene registro (todos los campos
 *   relevantes vinieron null) — distinto de "unavailable", el usuario debe poder distinguirlos.
 * - "unavailable": el backend respondió 503 (ver PeopleController.DinardapLookup) — DINARDAP
 *   caído o en mantenimiento.
 * - "error": cualquier otro fallo (permiso, timeout, red) — no necesariamente mantenimiento.
 */
export type DinardapLookupStatus =
  | "idle"
  | "checking"
  | "found"
  | "not-found"
  | "unavailable"
  | "error";

interface UseDinardapLookupOptions {
  /** Se llama solo cuando el estado pasa a "found", con el DTO completo. */
  onFound?: (data: DinardapRegistroCivilDto) => void;
  /** true = nunca consulta (ej. al editar un registro existente, donde la cédula ya no cambia). */
  skip?: boolean;
}

export function useDinardapLookup({ onFound, skip = false }: UseDinardapLookupOptions = {}) {
  const [status, setStatus] = useState<DinardapLookupStatus>("idle");
  const [data, setData] = useState<DinardapRegistroCivilDto | null>(null);

  const check = useCallback(
    async (cedula: string) => {
      if (skip) return;
      const value = cedula.trim();
      if (!value || value.length < 3) {
        setStatus("idle");
        setData(null);
        return;
      }
      setStatus("checking");
      try {
        const resp = await PersonasAPI.dinardapLookup(value);
        if (resp.status === "success") {
          const d = resp.data;
          setData(d);
          const hasAnyData = !!(d.nombres?.trim() || d.apellido1?.trim() || d.apellido2?.trim() || d.fechaNacimiento);
          if (!hasAnyData) {
            // 200 real, pero DINARDAP no tiene esta cédula en Registro Civil.
            setStatus("not-found");
            return;
          }
          setStatus("found");
          onFound?.(d);
        } else {
          // 503 = DINARDAP no disponible; cualquier otro código (401/403/500/timeout) es un
          // error distinto, no necesariamente mantenimiento.
          setData(null);
          setStatus(resp.error?.code === 503 ? "unavailable" : "error");
        }
      } catch {
        setData(null);
        setStatus("error");
      }
    },
    [skip, onFound]
  );

  const reset = useCallback(() => {
    setStatus("idle");
    setData(null);
  }, []);

  return {
    status,
    data,
    check,
    reset,
    /** El resto del formulario debe deshabilitarse mientras esto es true. */
    isChecking: status === "checking",
  };
}
