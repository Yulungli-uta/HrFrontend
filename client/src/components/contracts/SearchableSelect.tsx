import * as React from "react";
import { Check, ChevronsUpDown, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

export type SearchItem = { value: string; label: string };

type Props = {
  value?: string | null;
  items: SearchItem[];
  placeholder?: string;
  searchPlaceholder?: string;
  emptyText?: string;
  disabled?: boolean;
  isLoading?: boolean;
  onSearchChange?: (term: string) => void;
  onChange: (value: string | null) => void;
};

export function SearchableSelect({
  value,
  items,
  placeholder = "Seleccionar…",
  searchPlaceholder = "Escribe para buscar…",
  emptyText = "Sin resultados.",
  disabled,
  isLoading = false,
  onSearchChange,
  onChange,
}: Props) {
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState("");

  const selected = React.useMemo(() => {
    const v = value ?? "";
    return items.find((x) => x.value === v) ?? null;
  }, [items, value]);

  React.useEffect(() => {
    if (!open) {
      setSearch("");
      onSearchChange?.("");
    }
  }, [open, onSearchChange]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className="w-full justify-between"
        >
          <span className="truncate">
            {selected ? selected.label : placeholder}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-60" />
        </Button>
      </PopoverTrigger>

      <PopoverContent
        className="w-[--radix-popover-trigger-width] p-0"
        align="start"
      >
        <Command shouldFilter={!onSearchChange}>
          <CommandInput
            placeholder={searchPlaceholder}
            value={search}
            onValueChange={(term) => {
              setSearch(term);
              onSearchChange?.(term);
            }}
          />

          {isLoading ? (
            <div className="flex items-center gap-2 px-3 py-4 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Buscando...
            </div>
          ) : (
            <CommandEmpty>{emptyText}</CommandEmpty>
          )}

          {!isLoading && (
            <CommandGroup className="max-h-64 overflow-auto">
              {items.map((item) => (
                <CommandItem
                  key={item.value}
                  value={onSearchChange ? item.label : item.label}
                  onSelect={() => {
                    const next =
                      item.value === (value ?? "") ? null : item.value;
                    onChange(next);
                    setOpen(false);
                  }}
                >
                  <Check
                    className={`mr-2 h-4 w-4 ${
                      item.value === (value ?? "")
                        ? "opacity-100"
                        : "opacity-0"
                    }`}
                  />
                  <span className="truncate">{item.label}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          )}
        </Command>
      </PopoverContent>
    </Popover>
  );
}