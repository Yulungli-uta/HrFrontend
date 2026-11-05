import { useState } from "react";
import { useResearcherProfileMutations } from "@/hooks/usePublicationSync";
import type { SetOrcidResult } from "@/lib/api";
import { checkOrcid } from "@/lib/orcid";

interface UseOrcidEntryOptions {
  personId: number;
  initialValue?: string;
  /** Se llama cuando el ORCID quedó guardado (con el aviso del servidor, si lo hubo). */
  onSaved?: (result: SetOrcidResult) => void;
}

/**
 * Lógica compartida para registrar o corregir el ORCID: valida el formato en pantalla (solo ayuda al usuario) y delega la
 * validación real al servidor, que además comprueba en orcid.org que exista y que su nombre corresponda a la persona. Si el
 * nombre no coincide, el servidor no guarda y devuelve el nombre de ORCID para que la persona lo confirme y se reenvíe.
 */
export function useOrcidEntry({ personId, initialValue = "", onSaved }: UseOrcidEntryOptions) {
  const { setOrcid } = useResearcherProfileMutations(personId);
  const [value, setValue] = useState(initialValue);
  const [error, setError] = useState<string | null>(null);
  const [confirmName, setConfirmName] = useState<string | null>(null);

  /** Cualquier cambio del texto invalida la confirmación pedida para el valor anterior. */
  const onChange = (next: string) => {
    setValue(next);
    setError(null);
    setConfirmName(null);
  };

  const reset = (next = "") => {
    setValue(next);
    setError(null);
    setConfirmName(null);
  };

  /** Devuelve true si el ORCID quedó guardado. */
  const submit = async (): Promise<boolean> => {
    const check = checkOrcid(value);
    if (!check.ok) {
      setError(check.message);
      return false;
    }
    setError(null);
    try {
      const result = await setOrcid.mutateAsync({ orcid: check.orcid, acknowledgeNameMismatch: confirmName !== null });
      if (result.requiresConfirmation) {
        setConfirmName(result.orcidName?.trim() || "(sin nombre)");
        return false;
      }
      setConfirmName(null);
      onSaved?.(result);
      return true;
    } catch (e) {
      setConfirmName(null);
      setError(e instanceof Error ? e.message : "No se pudo guardar el ORCID.");
      return false;
    }
  };

  return {
    value,
    onChange,
    reset,
    submit,
    error,
    confirmName,
    isPending: setOrcid.isPending,
    submitLabel: confirmName !== null ? "Confirmar y guardar" : "Guardar",
  };
}
