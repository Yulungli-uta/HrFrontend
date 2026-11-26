// src/components/ui/SearchableSelect.tsx
import { useMemo, useState } from "react";
import { Check, ChevronLeft, ChevronRight, ChevronsUpDown, Loader2 } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface SearchableOption {
  value: string;
  label: string;
  /** Texto secundario (p. ej. el RMU o un código). También se busca sobre él. */
  detail?: string;
}

interface SearchableSelectProps {
  /** Valor seleccionado, o null/"" si no hay. */
  value: string | null;
  onChange: (value: string | null) => void;
  /** Solo las opciones que se pueden elegir: quien lo usa excluye los registros inactivos. */
  options: SearchableOption[];
  placeholder?: string;
  searchPlaceholder?: string;
  emptyText?: string;
  /** Si se indica, se ofrece una primera opción para quitar la selección (p. ej. "(sin clasificar)"). */
  clearLabel?: string;
  disabled?: boolean;
  isLoading?: boolean;
  /** Etiqueta del valor seleccionado cuando ya no está entre las opciones (p. ej. un registro inactivo ya asignado). */
  fallbackLabel?: string;
  ariaLabel?: string;
  /** data-testid del botón del selector (para pruebas de interfaz). */
  testId?: string;
  className?: string;
  /** Opciones por página (las demás se recorren con las flechas o se filtran escribiendo). */
  pageSize?: number;
}

/** Minúsculas y sin tildes, para comparar lo escrito con las opciones. */
const normalize = (text: string) =>
  text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

/**
 * Selector con búsqueda y paginación para catálogos cortos que ya están en memoria. Muestra una página de opciones con
 * "Mostrando X de Y" y flechas; al escribir filtra por todas las palabras (sin importar tildes ni mayúsculas) y vuelve a la primera página.
 * Para catálogos grandes usar PagedCatalogCombobox, que busca y pagina en el servidor.
 */
export function SearchableSelect({
  value,
  onChange,
  options,
  placeholder = "Seleccione...",
  searchPlaceholder = "Escriba para buscar…",
  emptyText = "No se encontraron resultados.",
  clearLabel,
  disabled,
  isLoading,
  fallbackLabel,
  ariaLabel,
  testId,
  className,
  pageSize = 8,
}: SearchableSelectProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const selected = options.find((o) => o.value === value);
  const triggerText = value ? (selected?.label ?? fallbackLabel ?? placeholder) : placeholder;

  const matches = useMemo(() => {
    const words = normalize(search).split(/\s+/).filter(Boolean);
    if (words.length === 0) return options;
    return options.filter((o) => {
      const haystack = normalize(`${o.label} ${o.detail ?? ""}`);
      return words.every((w) => haystack.includes(w));
    });
  }, [options, search]);

  const totalPages = Math.max(Math.ceil(matches.length / pageSize), 1);
  const currentPage = Math.min(page, totalPages);
  const visible = matches.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const from = matches.length === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const to = Math.min(currentPage * pageSize, matches.length);

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    setPage(1);
    if (!next) setSearch("");
  };

  const choose = (next: string | null) => {
    onChange(next);
    handleOpenChange(false);
  };

  return (
    <Popover open={open && !disabled} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          aria-label={ariaLabel}
          data-testid={testId}
          disabled={disabled}
          className={cn("w-full justify-between font-normal", !value && "text-muted-foreground", className)}
        >
          <span className="truncate">{isLoading ? "Cargando..." : triggerText}</span>
          {isLoading ? <Loader2 className="ml-2 h-4 w-4 shrink-0 animate-spin" /> : <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-60" />}
        </Button>
      </PopoverTrigger>

      <PopoverContent className="w-[--radix-popover-trigger-width] min-w-[260px] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder={searchPlaceholder}
            value={search}
            onValueChange={(text) => {
              setSearch(text);
              setPage(1);
            }}
          />
          <CommandList>
            {visible.length === 0 && !(clearLabel && !search.trim()) && <CommandEmpty>{emptyText}</CommandEmpty>}

            {clearLabel && !search.trim() && (
              <CommandItem value="__none__" onSelect={() => choose(null)} className="cursor-pointer italic text-muted-foreground">
                <Check className={cn("mr-2 h-4 w-4 shrink-0", !value ? "opacity-100" : "opacity-0")} />
                {clearLabel}
              </CommandItem>
            )}

            {visible.map((option) => (
              <CommandItem key={option.value} value={option.value} onSelect={() => choose(option.value)} className="cursor-pointer">
                <Check className={cn("mr-2 h-4 w-4 shrink-0", option.value === value ? "opacity-100" : "opacity-0")} />
                <div className="min-w-0">
                  <p className="truncate">{option.label}</p>
                  {option.detail && <p className="truncate text-xs text-muted-foreground">{option.detail}</p>}
                </div>
              </CommandItem>
            ))}
          </CommandList>

          <div className="flex items-center justify-between border-t px-2 py-1.5 text-xs text-muted-foreground">
            <span>{matches.length === 0 ? "Sin resultados" : `Mostrando ${from}–${to} de ${matches.length}`}</span>
            <div className="flex items-center gap-1">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                disabled={currentPage <= 1}
                onClick={() => setPage(currentPage - 1)}
                aria-label="Página anterior"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span>
                {currentPage} / {totalPages}
              </span>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                disabled={currentPage >= totalPages}
                onClick={() => setPage(currentPage + 1)}
                aria-label="Página siguiente"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
