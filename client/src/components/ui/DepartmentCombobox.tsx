// client/src/components/ui/DepartmentCombobox.tsx
import { useState } from "react";
import { Check, ChevronsUpDown } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandInput,
  CommandList,
  CommandItem,
  CommandEmpty,
} from "@/components/ui/command";

interface DepartmentOption {
  departmentID: number;
  departmentName: string;
  departmentTypeName?: string | null;
  departmentScopeName?: string | null;
  [key: string]: unknown;
}

interface DepartmentComboboxProps {
  /** Lista completa ya cargada (ej. VwDepartmentWithTypeAPI.getActive()) - filtra en el cliente. */
  departments: DepartmentOption[];
  value: number | null;
  onChange: (departmentId: number | null) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

/**
 * Combobox de búsqueda de departamentos con tipo + ámbito visibles por opción — extraído de
 * DashboardTH.tsx 2026-09-19 (tarjeta "Distribución de personal activo") para reusar en
 * cualquier filtro de departamento/facultad que necesite ese mismo detalle (ej. "Docentes
 * activos por grado y nivel"). Filtra en el cliente sobre la lista ya recibida — no hace
 * llamadas propias al servidor.
 */
export function DepartmentCombobox({
  departments,
  value,
  onChange,
  placeholder = "Todos los departamentos",
  disabled,
  className = "h-8 w-full sm:w-64",
}: DepartmentComboboxProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const term = search.toLowerCase().trim();
  const filtered = !term
    ? departments
    : departments.filter(
        (d) =>
          d.departmentName.toLowerCase().includes(term) ||
          (d.departmentTypeName?.toLowerCase().includes(term) ?? false) ||
          (d.departmentScopeName?.toLowerCase().includes(term) ?? false)
      );

  const selected = value != null ? departments.find((d) => d.departmentID === value) : undefined;

  return (
    <Popover open={open} onOpenChange={(v) => { setOpen(v); if (!v) setSearch(""); }}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          disabled={disabled}
          className={`justify-between font-normal text-xs ${className}`}
        >
          <span className={`truncate text-left flex-1 ${value == null ? "text-muted-foreground" : ""}`}>
            {value == null ? placeholder : selected?.departmentName ?? "Departamento"}
          </span>
          <ChevronsUpDown className="ml-2 h-3.5 w-3.5 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start" side="bottom">
        <Command shouldFilter={false}>
          <CommandInput placeholder="Buscar departamento…" value={search} onValueChange={setSearch} />
          <CommandList>
            <CommandItem
              value="__none__"
              onSelect={() => { onChange(null); setOpen(false); }}
              className="cursor-pointer italic text-muted-foreground"
            >
              <Check className={`mr-2 h-4 w-4 shrink-0 ${value == null ? "opacity-100" : "opacity-0"}`} />
              {placeholder}
            </CommandItem>
            {filtered.length === 0 ? (
              <CommandEmpty>Sin resultados para "{search}".</CommandEmpty>
            ) : (
              filtered.map((d) => (
                <CommandItem
                  key={d.departmentID}
                  value={String(d.departmentID)}
                  className="cursor-pointer"
                  onSelect={() => { onChange(d.departmentID); setOpen(false); setSearch(""); }}
                >
                  <Check className={`mr-2 h-4 w-4 shrink-0 ${value === d.departmentID ? "opacity-100" : "opacity-0"}`} />
                  <div className="min-w-0 flex-1">
                    <p className="font-medium truncate">{d.departmentName}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {d.departmentTypeName ?? "Sin tipo"} · {d.departmentScopeName ?? "Sin ámbito"}
                    </p>
                  </div>
                </CommandItem>
              ))
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
