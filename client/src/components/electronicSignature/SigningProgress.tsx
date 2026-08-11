// src/components/electronicSignature/SigningProgress.tsx
import { CalendarCheck2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { getParticipantStatusMeta, getProcessStatusMeta } from "@/features/electronicSignature/signatureStatus";
import type { SigningProgress as Model } from "@/types/electronic-signature";

const initials = (name: string) =>
  name.trim().split(/\s+/).slice(0, 2).map((p) => p[0]?.toUpperCase() ?? "").join("") || "?";

const formatDate = (iso?: string | null) => {
  if (!iso) return null;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d.toLocaleString("es-EC", { dateStyle: "medium", timeStyle: "short" });
};

export function SigningProgress({ value }: { value: Model }) {
  const processMeta = getProcessStatusMeta(value.status);
  const ProcessIcon = processMeta.icon;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <CardTitle className="text-lg">{value.processNumber}</CardTitle>
            <p className="text-sm text-muted-foreground">
              {value.signedRequiredSigners} de {value.totalRequiredSigners} firmas requeridas completadas
            </p>
          </div>
          <Badge variant={processMeta.badgeVariant} className="flex items-center gap-1">
            <ProcessIcon className="h-3.5 w-3.5" />
            {processMeta.label}
          </Badge>
        </div>

        <div className="mt-3 flex items-center gap-3">
          <Progress value={value.progressPercentage} className="h-2.5 flex-1" />
          <span className="w-12 shrink-0 text-right text-sm font-semibold">{value.progressPercentage}%</span>
        </div>
      </CardHeader>

      <Separator />

      <CardContent className="pt-4">
        <h3 className="mb-3 text-sm font-semibold text-muted-foreground">Firmantes</h3>
        <ul className="space-y-2">
          {value.signers.map((signer) => {
            const meta = getParticipantStatusMeta(signer.status);
            const Icon = meta.icon;
            const signedAt = formatDate(signer.signedAt);
            return (
              <li
                key={signer.participantId}
                className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <Avatar className="h-9 w-9">
                    <AvatarFallback className="text-xs">{initials(signer.fullName)}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <p className="truncate font-medium">{signer.fullName}</p>
                    <p className="text-xs text-muted-foreground">{signer.identification}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  {signedAt && (
                    <span className="hidden items-center gap-1 text-xs text-muted-foreground sm:flex">
                      <CalendarCheck2 className="h-3.5 w-3.5" />
                      {signedAt}
                    </span>
                  )}
                  <Badge variant={meta.badgeVariant} className="flex items-center gap-1 whitespace-nowrap">
                    <Icon className={`h-3.5 w-3.5 ${meta.badgeVariant === "outline" ? meta.iconClassName : ""}`} />
                    {meta.label}
                  </Badge>
                </div>
              </li>
            );
          })}
        </ul>
      </CardContent>
    </Card>
  );
}
