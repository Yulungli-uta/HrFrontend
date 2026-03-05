import * as React from "react";
import { Check, ChevronsUpDown } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

export type SearchItem = { value: string; label: string };

type Props = {
  value?: string | null;
  items: SearchItem[];
  placeholder?: string;
  searchPlaceholder?: string;
  emptyText?: string;
  disabled?: boolean;
  onChange: (value: string | null) => void;
};

export function SearchableSelect({
  value,
  items,
  placeholder = "Seleccionar…",
  searchPlaceholder = "Escribe para buscar…",
  emptyText = "Sin resultados.",
  disabled,
  onChange,
}: Props) {
  const [open, setOpen] = React.useState(false);

  const selected = React.useMemo(() => {
    const v = value ?? "";
    return items.find((x) => x.value === v) ?? null;
  }, [items, value]);

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
          <span className="truncate">{selected ? selected.label : placeholder}</span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-60" />
        </Button>
      </PopoverTrigger>

      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
        <Command>
          <CommandInput placeholder={searchPlaceholder} />
          <CommandEmpty>{emptyText}</CommandEmpty>

          <CommandGroup className="max-h-64 overflow-auto">
            {items.map((item) => (
              <CommandItem
                key={item.value}
                value={item.label}
                onSelect={() => {
                  const next = item.value === (value ?? "") ? null : item.value;
                  onChange(next);
                  setOpen(false);
                }}
              >
                <Check className={`mr-2 h-4 w-4 ${item.value === (value ?? "") ? "opacity-100" : "opacity-0"}`} />
                <span className="truncate">{item.label}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        </Command>
      </PopoverContent>
    </Popover>
  );
}