import { useMemo } from "react";
import { ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Card, CardContent, CardHeader, CardTitle, CardDescription,
} from "@/components/ui/card";
import type { AcademicLadderDto } from "@/lib/api";

interface LadderProgressionChainProps {
  ladders: AcademicLadderDto[];
}

/**
 * Arma la cadena siguiendo `nextLadderId` a partir de los escalones activos sin dedicación
 * (los escalones base). Los escalones por dedicación (TC/MT/TP) no forman parte de la
 * progresión, por eso no se repiten aquí.
 */
function buildChain(ladders: AcademicLadderDto[]): AcademicLadderDto[][] {
  const base = ladders.filter((l) => l.isActive && !l.dedicationTypeId);
  const byId = new Map(base.map((l) => [l.ladderId, l]));
  const hasPredecessor = new Set(
    base.map((l) => l.nextLadderId).filter((id): id is number => id != null && byId.has(id)),
  );

  const starts = base
    .filter((l) => !hasPredecessor.has(l.ladderId))
    .sort((a, b) => a.sequence - b.sequence);

  const visited = new Set<number>();
  const chains: AcademicLadderDto[][] = [];
  for (const start of starts) {
    const chain: AcademicLadderDto[] = [];
    let current: AcademicLadderDto | undefined = start;
    while (current && !visited.has(current.ladderId)) {
      visited.add(current.ladderId);
      chain.push(current);
      current = current.nextLadderId != null ? byId.get(current.nextLadderId) : undefined;
    }
    if (chain.length > 0) chains.push(chain);
  }
  return chains;
}

export function LadderProgressionChain({ ladders }: LadderProgressionChainProps) {
  const chains = useMemo(() => buildChain(ladders), [ladders]);

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="text-base">Cadena de Progresión</CardTitle>
        <CardDescription>Cada escalafón solo puede postular al siguiente indicado</CardDescription>
      </CardHeader>
      <CardContent>
        {chains.length === 0 ? (
          <p className="text-sm text-muted-foreground">No hay escalones base activos para mostrar.</p>
        ) : (
          <div className="space-y-3">
            {chains.map((chain) => (
              <div key={chain[0].ladderId} className="flex flex-wrap items-center gap-2">
                {chain.map((ladder, idx) => (
                  <div key={ladder.ladderId} className="flex items-center gap-2">
                    <div className="flex flex-col items-center">
                      <Badge
                        variant="outline"
                        className="px-3 py-1.5 text-xs font-medium bg-primary/5 border-primary/30 text-primary whitespace-nowrap"
                      >
                        {ladder.name}
                      </Badge>
                      {ladder.minYearsService != null && (
                        <span className="text-[0.625rem] text-muted-foreground mt-0.5">
                          {ladder.minYearsService} años mín.
                        </span>
                      )}
                    </div>
                    {idx < chain.length - 1 && (
                      <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                    )}
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default LadderProgressionChain;
