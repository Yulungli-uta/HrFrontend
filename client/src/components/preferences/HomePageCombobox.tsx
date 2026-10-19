import { useMemo, useState } from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { cn } from "@/lib/utils";
import type { HomeOption } from "@/features/preferences";

const DEFAULT_LABEL = "Inicio (predeterminada)";

/** Minúsculas y sin acentos, para que "vacaciones" encuentre "Vacaciónes" y "PICADAS" encuentre "Picadas". */
const normalize = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

interface Props {
  id?: string;
  /** Ruta elegida; undefined = página de inicio predeterminada. */
  value: string | undefined;
  options: HomeOption[];
  onChange: (path: string | undefined) => void;
}

/** Selector de página de inicio con buscador: se escribe para filtrar por nombre de opción o de módulo. */
export default function HomePageCombobox({ id, value, options, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const selected = options.find((o) => o.path === value);
  const label = selected ? (selected.group ? `${selected.group} › ${selected.label}` : selected.label) : DEFAULT_LABEL;

  // Filtro propio (coincidencia de texto): la difusa de cmdk devolvía resultados sin relación con lo escrito.
  const groups = useMemo(() => {
    const q = normalize(query.trim());
    const map = new Map<string, HomeOption[]>();
    for (const o of options) {
      if (q && !normalize(`${o.group} ${o.label}`).includes(q)) continue;
      const key = o.group || "Otras";
      map.set(key, [...(map.get(key) ?? []), o]);
    }
    return Array.from(map.entries());
  }, [options, query]);
  const showDefault = !query.trim() || normalize(DEFAULT_LABEL).includes(normalize(query.trim()));

  const pick = (path: string | undefined) => {
    onChange(path);
    setOpen(false);
    setQuery("");
  };

  return (
    <Popover
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) setQuery("");
      }}
    >
      <PopoverTrigger asChild>
        <Button
          id={id}
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full max-w-md justify-between font-normal"
        >
          <span className="truncate text-left">{label}</span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" aria-hidden="true" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] min-w-[18rem] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput value={query} onValueChange={setQuery} placeholder="Buscar página…" />
          <CommandList>
            {!showDefault && groups.length === 0 && <CommandEmpty>Sin resultados</CommandEmpty>}
            {showDefault && (
              <CommandGroup>
                <CommandItem value="inicio predeterminada" onSelect={() => pick(undefined)}>
                  <Check className={cn("mr-2 h-4 w-4", !selected ? "opacity-100" : "opacity-0")} aria-hidden="true" />
                  {DEFAULT_LABEL}
                </CommandItem>
              </CommandGroup>
            )}
            {groups.map(([group, items]) => (
              <CommandGroup key={group} heading={group}>
                {items.map((o) => (
                  <CommandItem key={o.path} value={`${group} ${o.label} ${o.path}`} onSelect={() => pick(o.path)}>
                    <Check className={cn("mr-2 h-4 w-4", value === o.path ? "opacity-100" : "opacity-0")} aria-hidden="true" />
                    <span className="break-words">{o.label}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            ))}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
