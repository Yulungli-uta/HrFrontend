import { useMemo, useState } from "react";
import { Check, ChevronsUpDown, Search, X } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

export type PickerOption<TMeta = unknown> = {
  value: string;
  label: string;
  description?: string;
  keywords?: string[];
  disabled?: boolean;
  meta?: TMeta;
};

interface SearchableEntityPickerProps<TMeta = unknown> {
  value?: string;
  values?: string[];
  multiple?: boolean;
  options: PickerOption<TMeta>[];
  onChange?: (value: string) => void;
  onMultiChange?: (values: string[]) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyMessage?: string;
  loading?: boolean;
  disabled?: boolean;
  className?: string;
}

export function SearchableEntityPicker<TMeta = unknown>({
  value,
  values = [],
  multiple = false,
  options,
  onChange,
  onMultiChange,
  placeholder = "Seleccione una opción",
  searchPlaceholder = "Buscar...",
  emptyMessage = "No se encontraron resultados.",
  loading = false,
  disabled = false,
  className,
}: SearchableEntityPickerProps<TMeta>) {
  const [open, setOpen] = useState(false);
  const [term, setTerm] = useState("");

  const selectedSingle = useMemo(
    () => options.find((option) => option.value === value),
    [options, value]
  );

  const selectedMulti = useMemo(
    () => options.filter((option) => values.includes(option.value)),
    [options, values]
  );

  const filteredOptions = useMemo(() => {
    const normalized = term.trim().toLowerCase();
    if (!normalized) return options;

    return options.filter((option) => {
      const haystack = [
        option.label,
        option.description ?? "",
        ...(option.keywords ?? []),
      ]
        .join(" ")
        .toLowerCase();

      return haystack.includes(normalized);
    });
  }, [options, term]);

  const handleSingleSelect = (selectedValue: string) => {
    onChange?.(selectedValue);
    setOpen(false);
    setTerm("");
  };

  const handleMultiToggle = (selectedValue: string) => {
    const exists = values.includes(selectedValue);
    const next = exists
      ? values.filter((item) => item !== selectedValue)
      : [...values, selectedValue];

    onMultiChange?.(next);
  };

  const triggerLabel = multiple
    ? selectedMulti.length > 0
      ? `${selectedMulti.length} seleccionado(s)`
      : placeholder
    : selectedSingle?.label ?? placeholder;

  return (
    <div className={cn("space-y-2", className)}>
      {multiple && selectedMulti.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {selectedMulti.map((item) => (
            <Badge key={item.value} variant="secondary" className="gap-1">
              <span className="max-w-[220px] truncate">{item.label}</span>
              <button
                type="button"
                onClick={() =>
                  onMultiChange?.(values.filter((v) => v !== item.value))
                }
                className="inline-flex"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      ) : null}

      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            role="combobox"
            disabled={disabled}
            className="w-full justify-between font-normal"
          >
            <span className="truncate">{loading ? "Cargando..." : triggerLabel}</span>
            <ChevronsUpDown className="ml-2 h-4 w-4 opacity-50" />
          </Button>
        </PopoverTrigger>

        <PopoverContent className="w-[420px] p-0" align="start">
          <div className="flex items-center border-b px-3">
            <Search className="mr-2 h-4 w-4 opacity-50" />
            <Input
              value={term}
              onChange={(e) => setTerm(e.target.value)}
              placeholder={searchPlaceholder}
              className="border-0 shadow-none focus-visible:ring-0"
            />
          </div>

          <div className="max-h-72 overflow-y-auto">
            {filteredOptions.length === 0 ? (
              <div className="p-4 text-sm text-muted-foreground">{emptyMessage}</div>
            ) : (
              filteredOptions.map((option) => {
                const isSelected = multiple
                  ? values.includes(option.value)
                  : value === option.value;

                return (
                  <button
                    key={option.value}
                    type="button"
                    disabled={option.disabled}
                    onClick={() =>
                      multiple
                        ? handleMultiToggle(option.value)
                        : handleSingleSelect(option.value)
                    }
                    className={cn(
                      "flex w-full items-start gap-3 px-4 py-3 text-left hover:bg-muted/50",
                      option.disabled && "cursor-not-allowed opacity-50"
                    )}
                  >
                    <Check
                      className={cn(
                        "mt-0.5 h-4 w-4 shrink-0",
                        isSelected ? "opacity-100" : "opacity-0"
                      )}
                    />
                    <div className="min-w-0">
                      <p className="truncate font-medium">{option.label}</p>
                      {option.description ? (
                        <p className="text-xs text-muted-foreground">
                          {option.description}
                        </p>
                      ) : null}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}