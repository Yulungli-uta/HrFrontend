// src/components/ui/PagedCatalogCombobox.tsx
import { useCallback, useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandInput, CommandList, CommandItem, CommandEmpty } from "@/components/ui/command";
import { Button } from "@/components/ui/button";
import { Check, ChevronLeft, ChevronRight, ChevronsUpDown, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { MarqueeText } from "@/components/ui/marquee-text";
import type { ApiResponse, PagedResult } from "@/lib/api";
import { usePagedCombobox } from "@/hooks/usePagedCombobox";
import type { ComboboxOption } from "@/hooks/usePagedCombobox";

export interface CatalogOption {
  value: number;
  label: string;
  detail?: string;
}

interface Props<T> {
  /** Id seleccionado, o null si no hay. */
  value: number | null;
  onChange: (id: number | null, item: T | null) => void;
  /** Clave única de caché de React Query para este catálogo. */
  queryKey: string;
  /** Página del catálogo en el servidor (el texto escrito llega como `search`). */
  fetchPage: (params: { page: number; pageSize: number; search?: string }) => Promise<ApiResponse<PagedResult<T>>>;
  /** Registro por id: sirve para mostrar el nombre del valor ya guardado sin cargar todo el catálogo. */
  fetchById: (id: number) => Promise<ApiResponse<T>>;
  toOption: (item: T) => CatalogOption;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyText?: string;
  /** Nombre en plural para el pie ("grados", "grupos"…). */
  pluralNoun?: string;
  /** Si se indica, se ofrece una primera opción para quitar la selección (p. ej. "(sin grupo)"). */
  clearLabel?: string;
  disabled?: boolean;
}

/**
 * Selector de catálogo con búsqueda y paginación en el servidor, sobre el hook estándar `usePagedCombobox`:
 * lo que se escribe filtra en el servidor (con espera al teclear) y las opciones llegan por páginas.
 */
export function PagedCatalogCombobox<T>({
  value,
  onChange,
  queryKey,
  fetchPage,
  fetchById,
  toOption,
  placeholder = "Seleccione...",
  searchPlaceholder = "Escriba para buscar…",
  emptyText = "No se encontraron resultados.",
  pluralNoun = "registros",
  clearLabel,
  disabled,
}: Props<T>) {
  const [open, setOpen] = useState(false);
  const [selectedLabel, setSelectedLabel] = useState<string | null>(null);

  const mapFn = useCallback(
    (item: T): ComboboxOption<T> | null => {
      const option = toOption(item);
      return { value: option.value, label: option.label, detail: option.detail, raw: item };
    },
    [toOption],
  );

  const combobox = usePagedCombobox<T>({
    queryKey,
    queryFn: fetchPage,
    mapFn,
    enabled: open,
    initialPageSize: 10,
    debounceMs: 300,
  });

  // Al abrir un registro existente el valor llega ya fijado: se resuelve su nombre una sola vez por id.
  const { data: resolved } = useQuery({
    queryKey: [`${queryKey}-resolve`, value],
    queryFn: () => fetchById(value as number),
    enabled: value != null && value > 0 && !selectedLabel,
    staleTime: 5 * 60 * 1000,
  });
  useEffect(() => {
    if (resolved?.status === "success" && resolved.data) setSelectedLabel(toOption(resolved.data).label);
  }, [resolved, toOption]);
  useEffect(() => {
    if (value == null || value <= 0) setSelectedLabel(null);
  }, [value]);

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (!next) combobox.reset();
  };

  const hasValue = value != null && value > 0;

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className="group w-full min-w-0 max-w-full justify-between font-normal"
        >
          <MarqueeText title={hasValue ? (selectedLabel ?? undefined) : undefined} className={cn("text-left flex-1", !hasValue && "text-muted-foreground")}>
            {hasValue ? (selectedLabel ?? `#${value}`) : placeholder}
          </MarqueeText>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-60" />
        </Button>
      </PopoverTrigger>

      <PopoverContent className="w-max min-w-[max(300px,var(--radix-popover-trigger-width))] max-w-[min(32rem,90vw)] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput placeholder={searchPlaceholder} value={combobox.searchTerm} onValueChange={combobox.setSearchTerm} />
          <CommandList>
            {combobox.isFetching && combobox.options.length === 0 ? (
              <div className="flex items-center gap-2 px-3 py-4 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Buscando...
              </div>
            ) : (
              <CommandEmpty>{emptyText}</CommandEmpty>
            )}
            {clearLabel && (
              <CommandItem
                value="__clear__"
                onSelect={() => {
                  setSelectedLabel(null);
                  onChange(null, null);
                  handleOpenChange(false);
                }}
              >
                <Check className={cn("mr-2 h-4 w-4", hasValue ? "opacity-0" : "opacity-100")} />
                <span className="text-muted-foreground">{clearLabel}</span>
              </CommandItem>
            )}
            {combobox.options.map((option) => (
              <CommandItem
                key={option.value}
                value={String(option.value)}
                onSelect={() => {
                  setSelectedLabel(option.label);
                  onChange(Number(option.value), option.raw ?? null);
                  handleOpenChange(false);
                }}
              >
                <Check className={cn("mr-2 h-4 w-4", Number(option.value) === value ? "opacity-100" : "opacity-0")} />
                <div className="min-w-0">
                  <MarqueeText title={option.label} className="font-medium">{option.label}</MarqueeText>
                  {option.detail && <MarqueeText title={option.detail} className="text-xs text-muted-foreground">{option.detail}</MarqueeText>}
                </div>
              </CommandItem>
            ))}
          </CommandList>

          <div className="flex items-center justify-between border-t px-2 py-1.5 text-xs text-muted-foreground">
            <span>
              {combobox.totalCount} {pluralNoun}
            </span>
            <div className="flex items-center gap-1">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                disabled={!combobox.hasPreviousPage || combobox.isFetching}
                onClick={combobox.goPrev}
                aria-label="Página anterior"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span>
                {combobox.page} / {Math.max(combobox.totalPages, 1)}
              </span>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                disabled={!combobox.hasNextPage || combobox.isFetching}
                onClick={combobox.goNext}
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
