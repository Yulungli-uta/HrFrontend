import { useState } from "react";
import { SlidersHorizontal, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { CvFilterField } from "@/hooks/personDetails/useCvListState";

const ALL_VALUE = "__all__";

interface CvFilterBarProps<T> {
  fields: CvFilterField<T>[];
  values: Record<string, string>;
  onChange: (key: string, value: string) => void;
  onClear: () => void;
}

/**
 * Botón "Filtros" (drawer lateral) + chips de filtros activos, reutilizable
 * en las listas de la Hoja de Vida. Los filtros se combinan entre sí (AND) y
 * con el buscador de texto de `CvListToolbar`. Sin filtros configurados para
 * la pestaña, no renderiza nada.
 */
export function CvFilterBar<T>({ fields, values, onChange, onClear }: CvFilterBarProps<T>) {
  const [open, setOpen] = useState(false);

  if (fields.length === 0) return null;

  const activeEntries = Object.entries(values).filter(([, v]) => v);

  return (
    <div className="flex flex-wrap items-center gap-2 mb-3">
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <Button variant="outline" size="sm" className="h-9">
            <SlidersHorizontal className="h-4 w-4 mr-2" />
            Filtros
            {activeEntries.length > 0 && (
              <Badge variant="secondary" className="ml-2 h-5 px-1.5">
                {activeEntries.length}
              </Badge>
            )}
          </Button>
        </SheetTrigger>
        <SheetContent side="right" className="w-full sm:max-w-sm overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Filtros</SheetTitle>
            <SheetDescription>Combina filtros para acotar la lista. Se aplican junto con la búsqueda.</SheetDescription>
          </SheetHeader>
          <div className="mt-4 space-y-4">
            {fields.map((field) => (
              <div key={field.key} className="space-y-1.5">
                <label className="text-sm font-medium">{field.label}</label>
                <Select
                  value={values[field.key] || ALL_VALUE}
                  onValueChange={(v) => onChange(field.key, v === ALL_VALUE ? "" : v)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ALL_VALUE}>Todos</SelectItem>
                    {field.options.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ))}
          </div>
          <SheetFooter className="mt-6">
            <Button variant="ghost" onClick={onClear} disabled={activeEntries.length === 0}>
              Limpiar filtros
            </Button>
            <Button onClick={() => setOpen(false)}>Aplicar</Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {activeEntries.map(([key, val]) => {
        const field = fields.find((f) => f.key === key);
        const option = field?.options.find((o) => o.value === val);
        return (
          <Badge key={key} variant="secondary" className="text-xs gap-1 pr-1">
            {field?.label}: {option?.label ?? val}
            <button
              type="button"
              onClick={() => onChange(key, "")}
              className="ml-0.5 rounded-sm hover:text-destructive"
              aria-label={`Quitar filtro ${field?.label}`}
            >
              <X className="h-3 w-3" />
            </button>
          </Badge>
        );
      })}
    </div>
  );
}
