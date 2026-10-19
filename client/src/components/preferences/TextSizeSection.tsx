import { Type } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import type { FontScale, UserPreferences } from "@/types/userPreferences";
import { FONT_SCALE_LABELS } from "@/types/userPreferences";

const SCALES: FontScale[] = ["small", "normal", "large", "xlarge"];

interface Props {
  value: UserPreferences;
  onChange: (patch: Partial<UserPreferences>) => void;
}

export default function TextSizeSection({ value, onChange }: Props) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center text-base">
          <Type className="mr-2 h-4 w-4 text-primary" aria-hidden="true" /> Tamaño del texto
        </CardTitle>
      </CardHeader>
      <CardContent>
        <RadioGroup
          value={value.fontScale ?? "normal"}
          onValueChange={(v) => onChange({ fontScale: v as FontScale })}
          className="grid-cols-2 gap-3"
          aria-label="Tamaño del texto"
        >
          {SCALES.map((s) => (
            <div key={s} className="flex items-center gap-2">
              <RadioGroupItem value={s} id={`pref-font-${s}`} />
              <Label htmlFor={`pref-font-${s}`} className="font-normal">
                {FONT_SCALE_LABELS[s]}
              </Label>
            </div>
          ))}
        </RadioGroup>
      </CardContent>
    </Card>
  );
}
