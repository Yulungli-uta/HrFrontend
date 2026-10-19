import { Palette } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Switch } from "@/components/ui/switch";
import type { Density, ThemePreference, UserPreferences } from "@/types/userPreferences";

const THEMES: { value: ThemePreference; label: string }[] = [
  { value: "light", label: "Claro" },
  { value: "dark", label: "Oscuro" },
  { value: "system", label: "Automático" },
];

const DENSITIES: { value: Density; label: string }[] = [
  { value: "standard", label: "Estándar" },
  { value: "compact", label: "Compacta" },
];

interface Props {
  value: UserPreferences;
  onChange: (patch: Partial<UserPreferences>) => void;
}

export default function AppearanceSection({ value, onChange }: Props) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center text-base">
          <Palette className="mr-2 h-4 w-4 text-primary" aria-hidden="true" /> Apariencia
        </CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4">
        <fieldset className="grid gap-2">
          <legend className="mb-2 text-sm font-medium">Tema</legend>
          <RadioGroup
            value={value.theme ?? "system"}
            onValueChange={(v) => onChange({ theme: v as ThemePreference })}
            className="grid-flow-col auto-cols-max gap-5"
            aria-label="Tema"
          >
            {THEMES.map((t) => (
              <div key={t.value} className="flex items-center gap-2">
                <RadioGroupItem value={t.value} id={`pref-theme-${t.value}`} />
                <Label htmlFor={`pref-theme-${t.value}`} className="font-normal">
                  {t.label}
                </Label>
              </div>
            ))}
          </RadioGroup>
        </fieldset>

        <fieldset className="grid gap-2">
          <legend className="mb-2 text-sm font-medium">Densidad</legend>
          <RadioGroup
            value={value.density ?? "standard"}
            onValueChange={(v) => onChange({ density: v as Density })}
            className="grid-flow-col auto-cols-max gap-5"
            aria-label="Densidad"
          >
            {DENSITIES.map((d) => (
              <div key={d.value} className="flex items-center gap-2">
                <RadioGroupItem value={d.value} id={`pref-density-${d.value}`} />
                <Label htmlFor={`pref-density-${d.value}`} className="font-normal">
                  {d.label}
                </Label>
              </div>
            ))}
          </RadioGroup>
        </fieldset>

        <div className="flex items-center justify-between gap-4">
          <Label htmlFor="pref-contrast">Contraste alto</Label>
          <Switch id="pref-contrast" checked={value.highContrast ?? false} onCheckedChange={(v) => onChange({ highContrast: v })} />
        </div>
      </CardContent>
    </Card>
  );
}
