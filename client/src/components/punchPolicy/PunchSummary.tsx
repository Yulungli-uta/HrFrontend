import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, ShieldCheck, UserCheck, Wifi } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { PunchPolicyAPI } from "@/lib/api/services/punchPolicy";
import { unwrapApiResponse } from "@/lib/api/utils/error-handling";
import type { PunchNetworkMode } from "@/types/punchPolicy";
import { PUNCH_SETTINGS_KEY, useEffectivePolicyCount, usePunchSettings } from "./punchQueries";

const MODES: { value: PunchNetworkMode; label: string; hint: string }[] = [
  { value: "OFF", label: "Sin control", hint: "Se puede picar desde cualquier lugar." },
  { value: "AUDIT", label: "Solo registrar", hint: "No bloquea; anota quién quedaría fuera del campus." },
  { value: "ENFORCE", label: "Bloquear", hint: "Solo campus o con autorización." },
];

/** Resumen superior: modo de control (editable por quien administra redes), redes activas y autorizados vigentes. */
export default function PunchSummary({ canManage }: { canManage: boolean }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const settings = usePunchSettings();
  const authorized = useEffectivePolicyCount();
  const [selected, setSelected] = useState<PunchNetworkMode>("AUDIT");
  const [confirm, setConfirm] = useState(false);

  useEffect(() => {
    if (settings.data) setSelected(settings.data.mode);
  }, [settings.data]);

  const save = useMutation({
    mutationFn: async (mode: PunchNetworkMode) => unwrapApiResponse(await PunchPolicyAPI.setMode(mode)),
    onSuccess: (data) => {
      queryClient.setQueryData(PUNCH_SETTINGS_KEY, data);
      toast({ title: "Modo actualizado" });
    },
    onError: (e: Error) => toast({ title: "No se pudo cambiar el modo", description: e.message, variant: "destructive" }),
  });

  const dirty = !!settings.data && selected !== settings.data.mode;
  const hint = MODES.find((m) => m.value === selected)?.hint;

  return (
    <div className="grid gap-4 md:grid-cols-[2fr_1fr_1fr]">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center text-base">
            <ShieldCheck className="mr-2 h-4 w-4 text-primary" aria-hidden="true" /> Modo de control
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {settings.isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" aria-label="Cargando" />
          ) : settings.isError ? (
            <p className="text-sm text-destructive" role="alert">
              {(settings.error as Error).message}
            </p>
          ) : (
            <>
              <div className="flex flex-wrap items-center gap-2">
                <ToggleGroup
                  type="single"
                  variant="outline"
                  value={selected}
                  onValueChange={(v) => v && setSelected(v as PunchNetworkMode)}
                  disabled={!canManage || save.isPending}
                  aria-label="Modo de control de picadas"
                >
                  {MODES.map((m) => (
                    <ToggleGroupItem key={m.value} value={m.value} className="px-3 text-sm">
                      {m.label}
                    </ToggleGroupItem>
                  ))}
                </ToggleGroup>
                {canManage && dirty && (
                  <Button
                    size="sm"
                    onClick={() => (selected === "ENFORCE" ? setConfirm(true) : save.mutate(selected))}
                    disabled={save.isPending}
                  >
                    {save.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />}
                    Aplicar
                  </Button>
                )}
              </div>
              <p className="text-sm text-muted-foreground">{hint}</p>
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center text-base">
            <Wifi className="mr-2 h-4 w-4 text-primary" aria-hidden="true" /> Redes activas
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold">{settings.data?.activeNetworks ?? "—"}</div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center text-base">
            <UserCheck className="mr-2 h-4 w-4 text-success" aria-hidden="true" /> Autorizados hoy
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold">{authorized.data ?? "—"}</div>
        </CardContent>
      </Card>

      <AlertDialog open={confirm} onOpenChange={setConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Bloquear fuera del campus?</AlertDialogTitle>
            <AlertDialogDescription>
              Quien no esté en una red del campus ni tenga autorización no podrá picar.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setConfirm(false);
                save.mutate("ENFORCE");
              }}
            >
              Bloquear
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
