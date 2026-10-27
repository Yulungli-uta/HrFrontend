// src/components/research-projects/PersonPicker.tsx
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader2, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ResearchProjectsAPI } from "@/lib/api";
import type { ResearchPersonLookup } from "@/lib/api";

interface PersonPickerProps {
  /** Persona ya elegida (se muestra en lugar del buscador). */
  value: ResearchPersonLookup | null;
  onChange: (person: ResearchPersonLookup | null) => void;
  disabled?: boolean;
}

const MIN_CHARS = 3;

/**
 * Busca personas del sistema (empleados, estudiantes u otras) por cédula o nombre, en el servidor y con
 * un máximo de resultados: la tabla de personas tiene más de 100 mil filas, nunca se carga completa.
 */
export function PersonPicker({ value, onChange, disabled }: PersonPickerProps) {
  const [term, setTerm] = useState("");
  const [debounced, setDebounced] = useState("");

  useEffect(() => {
    const handle = setTimeout(() => setDebounced(term.trim()), 350);
    return () => clearTimeout(handle);
  }, [term]);

  const enabled = debounced.length >= MIN_CHARS && !value;
  const { data, isFetching } = useQuery({
    queryKey: ["research-people-search", debounced],
    queryFn: () => ResearchProjectsAPI.searchPeople(debounced),
    enabled,
    placeholderData: (prev) => prev,
  });

  const results: ResearchPersonLookup[] = data?.status === "success" ? data.data : [];

  if (value) {
    return (
      <div className="flex min-h-9 items-start justify-between gap-1 rounded-md border border-input bg-background px-3 py-1.5 text-sm">
        <div className="min-w-0">
          <p className="break-words font-medium uppercase leading-tight">{value.fullName}</p>
          <p className="text-xs text-muted-foreground">{value.idCard}</p>
        </div>
        {!disabled && (
          <Button type="button" variant="ghost" size="icon" className="-mr-2 h-6 w-6 shrink-0" onClick={() => onChange(null)} aria-label="Quitar persona">
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-1">
      <Input
        value={term}
        onChange={(e) => setTerm(e.target.value)}
        placeholder="Buscar por cédula o nombre (mín. 3 caracteres)"
        disabled={disabled}
        autoComplete="off"
        className="h-9"
      />
      {enabled && (
        <div className="max-h-48 overflow-y-auto rounded-md border">
          {isFetching && results.length === 0 ? (
            <p className="flex items-center gap-2 p-3 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Buscando…
            </p>
          ) : results.length === 0 ? (
            <p className="p-3 text-sm text-muted-foreground">Sin resultados.</p>
          ) : (
            results.map((p) => (
              <button
                key={p.personId}
                type="button"
                className="flex w-full flex-col px-3 py-2 text-left text-sm hover:bg-muted"
                onClick={() => {
                  onChange(p);
                  setTerm("");
                  setDebounced("");
                }}
              >
                <span className="break-words font-medium uppercase leading-tight">{p.fullName}</span>
                <span className="text-xs text-muted-foreground">{p.idCard}</span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
