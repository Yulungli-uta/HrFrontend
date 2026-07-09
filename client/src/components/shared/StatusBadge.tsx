// src/components/shared/StatusBadge.tsx
import { Badge } from '@/components/ui/badge';

/**
 * Tono semántico reutilizado en toda la app (success/warning/destructive/primary/muted).
 * IMPORTANTE: usar SIEMPRE estos tokens (definidos en index.css con valores distintos para
 * modo claro/oscuro) en vez de colores literales de Tailwind (bg-green-50, text-amber-700, ...),
 * que no se adaptan a modo oscuro.
 */
export type StatusTone = 'success' | 'warning' | 'destructive' | 'primary' | 'muted';

const TONE_CLASSES: Record<StatusTone, string> = {
  success: 'bg-success-subtle text-success border-success/30',
  warning: 'bg-warning-subtle text-warning border-warning/30',
  destructive: 'bg-destructive/15 text-destructive border-destructive/30',
  primary: 'bg-primary-subtle text-primary border-primary/30',
  muted: 'bg-muted text-muted-foreground border-border',
};

type Props = {
  label: string;
  tone: StatusTone;
  className?: string;
};

export function StatusBadge({ label, tone, className }: Props) {
  return (
    <Badge variant="outline" className={`${TONE_CLASSES[tone]} ${className ?? ''}`}>
      {label}
    </Badge>
  );
}
