import { useMemo } from "react";
import { Navigation } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useAuth } from "@/features/auth";
import { getHomeOptions, type HomeRouteInfo } from "@/features/preferences";
import type { MenuStartMode, UserPreferences } from "@/types/userPreferences";
import HomePageCombobox from "./HomePageCombobox";

const MENU_MODES: { value: MenuStartMode; label: string }[] = [
  { value: "remember", label: "Recordar" },
  { value: "expanded", label: "Expandido" },
  { value: "collapsed", label: "Colapsado" },
];

interface Props {
  value: UserPreferences;
  routes: HomeRouteInfo[];
  onChange: (patch: Partial<UserPreferences>) => void;
}

export default function NavigationSection({ value, routes, onChange }: Props) {
  const { user } = useAuth();
  const options = useMemo(() => getHomeOptions(user ?? null, routes), [user, routes]);
  const current = value.homePath && options.some((o) => o.path === value.homePath) ? value.homePath : undefined;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center text-base">
          <Navigation className="mr-2 h-4 w-4 text-primary" aria-hidden="true" /> Navegación
        </CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-1 gap-5 md:grid-cols-2">
        <div className="grid min-w-0 gap-2">
          <Label htmlFor="pref-home">Página de inicio</Label>
          <HomePageCombobox id="pref-home" value={current} options={options} onChange={(path) => onChange({ homePath: path })} />
        </div>

        <fieldset className="grid min-w-0 gap-2">
          <legend className="mb-2 text-sm font-medium">Menú lateral</legend>
          <RadioGroup
            value={value.menuStartMode ?? "remember"}
            onValueChange={(v) => onChange({ menuStartMode: v as MenuStartMode })}
            className="grid-flow-col auto-cols-max gap-5"
            aria-label="Estado inicial del menú lateral"
          >
            {MENU_MODES.map((m) => (
              <div key={m.value} className="flex items-center gap-2">
                <RadioGroupItem value={m.value} id={`pref-menu-${m.value}`} />
                <Label htmlFor={`pref-menu-${m.value}`} className="font-normal">
                  {m.label}
                </Label>
              </div>
            ))}
          </RadioGroup>
        </fieldset>
      </CardContent>
    </Card>
  );
}
