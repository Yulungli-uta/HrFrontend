import { Accessibility } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import type { UserPreferences } from "@/types/userPreferences";

interface Props {
  value: UserPreferences;
  onChange: (patch: Partial<UserPreferences>) => void;
}

export default function AccessibilitySection({ value, onChange }: Props) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center text-base">
          <Accessibility className="mr-2 h-4 w-4 text-primary" aria-hidden="true" /> Accesibilidad
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between gap-4">
          <Label htmlFor="pref-motion">Reducir animaciones</Label>
          <Switch id="pref-motion" checked={value.reduceMotion ?? false} onCheckedChange={(v) => onChange({ reduceMotion: v })} />
        </div>
      </CardContent>
    </Card>
  );
}
