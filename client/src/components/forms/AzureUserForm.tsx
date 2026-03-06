import { useEffect, useMemo, useState } from "react";
import { useMutation } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { AzureManagementAPI } from "@/lib/api/auth";
import { parseApiError } from '@/lib/error-handling';

const DEBUG_AUTH =
  String((import.meta as any)?.env?.VITE_DEBUG_AUTH || "").toLowerCase() === "true";

type DebugEvent = { at: string; action: string; detail?: any };

function safeJson(obj: any, maxLen = 12_000) {
  try {
    const s = JSON.stringify(obj, null, 2);
    return s.length > maxLen ? s.slice(0, maxLen) + "\n... (truncado)" : s;
  } catch {
    return String(obj);
  }
}

function pickErrorMessage(err: unknown, fallback: string) {
  return (
    parseApiError(err).message
  );
}

function unwrapApiResponse(res: any) {
  if (res && typeof res === "object" && "status" in res) {
    if (res.status !== "success") {
      const msg = res?.error?.message || res?.message || "Respuesta API con error";
      const e: any = new Error(msg);
      e.api = res;
      throw e;
    }
    return res.data ?? res;
  }
  return res?.data ?? res;
}

export type AzureUserFormMode = "create" | "edit";

// ✅ Más flexible: tu lista trae opcionales. En edit solo necesitamos id.
export type AzureUserFormUser = {
  id: string;
  displayName?: string;
  email?: string;
  userPrincipalName?: string;
  accountEnabled?: boolean;
  department?: string;
  jobTitle?: string;
  userType?: string;
  createdDateTime?: string;
};

type Props = {
  mode: AzureUserFormMode;
  user: AzureUserFormUser | null;
  onSuccess: () => void;
  onCancel: () => void;
};

export default function AzureUserForm({ mode, user, onSuccess, onCancel }: Props) {
  const { toast } = useToast();

  const [debugEvents, setDebugEvents] = useState<DebugEvent[]>([]);
  const pushDebug = (action: string, detail?: any) => {
    if (!DEBUG_AUTH) return;
    const ev = { at: new Date().toISOString(), action, detail };
    setDebugEvents((prev) => [ev, ...prev].slice(0, 50));
    // eslint-disable-next-line no-console
    console.log(`[DEBUG_AUTH][AzureUserForm] ${action}`, detail ?? "");
  };

  const isEdit = mode === "edit";

  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [department, setDepartment] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [accountEnabled, setAccountEnabled] = useState(true);

  // Create-only extras
  const [givenName, setGivenName] = useState("");
  const [surname, setSurname] = useState("");
  const [password, setPassword] = useState("");
  const [forceChangePasswordNextSignIn, setForceChangePasswordNextSignIn] = useState(true);

  // ✅ Inicialización / recarga cuando cambias de user o mode
  useEffect(() => {
    pushDebug("FORM:init", { mode, user });

    if (mode === "edit" && user) {
      setEmail(user.email ?? "");
      setDisplayName(user.displayName ?? "");
      setDepartment(user.department ?? "");
      setJobTitle(user.jobTitle ?? "");
      setAccountEnabled(user.accountEnabled !== false);

      // limpiar campos create
      setGivenName("");
      setSurname("");
      setPassword("");
      setForceChangePasswordNextSignIn(true);
      return;
    }

    // create (o edit sin user)
    setEmail("");
    setDisplayName("");
    setDepartment("");
    setJobTitle("");
    setAccountEnabled(true);

    setGivenName("");
    setSurname("");
    setPassword("");
    setForceChangePasswordNextSignIn(true);
  }, [mode, user]);

  const canSubmit = useMemo(() => {
    if (isEdit) return Boolean(user?.id) && displayName.trim().length > 0;
    return email.trim().length > 0 && displayName.trim().length > 0;
  }, [isEdit, user?.id, email, displayName]);

  const createMutation = useMutation({
    mutationFn: async () => {
      const cleanEmail = email.trim();
      const dto: any = {
        email: cleanEmail,
        displayName: displayName.trim(),
        givenName: givenName.trim() || undefined,
        surname: surname.trim() || undefined,
        department: department.trim() || undefined,
        jobTitle: jobTitle.trim() || undefined,
        password: password.trim() || undefined,
        forceChangePasswordNextSignIn,
        mailNickname: (cleanEmail.split("@")[0] || "user").replace(/[^a-zA-Z0-9._-]/g, ""),
        accountEnabled,
      };

      pushDebug("CREATE_USER:request", dto);

      const started = performance.now();
      const res = await AzureManagementAPI.createUser(dto);
      const elapsedMs = Math.round(performance.now() - started);

      pushDebug("CREATE_USER:response(raw)", { elapsedMs, res });

      return unwrapApiResponse(res);
    },
    onSuccess: () => {
      toast({ title: "Usuario creado", description: "Usuario creado en Azure." });
      onSuccess();
    },
    onError: (err: unknown) => {
      const msg = parseApiError(err).message;
      pushDebug("CREATE_USER:error", { msg, err });
      toast({ title: "Error", description: msg, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async () => {
      const id = user?.id!;
      const dto: any = {
        displayName: displayName.trim() || undefined,
        department: department.trim() || undefined,
        jobTitle: jobTitle.trim() || undefined,
        accountEnabled,
      };

      pushDebug("UPDATE_USER:request", { id, dto });

      const started = performance.now();
      const res = await AzureManagementAPI.updateUser(id, dto);
      const elapsedMs = Math.round(performance.now() - started);

      pushDebug("UPDATE_USER:response(raw)", { elapsedMs, res });

      return unwrapApiResponse(res);
    },
    onSuccess: () => {
      toast({ title: "Usuario actualizado", description: "Usuario actualizado en Azure." });
      onSuccess();
    },
    onError: (err: unknown) => {
      const msg = parseApiError(err).message;
      pushDebug("UPDATE_USER:error", { msg, err });
      toast({ title: "Error", description: msg, variant: "destructive" });
    },
  });

  const isPending = createMutation.isPending || updateMutation.isPending;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    if (isEdit) updateMutation.mutate();
    else createMutation.mutate();
  };

  return (
    <div className="space-y-4">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Card>
          <CardContent className="pt-6 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="text-sm text-gray-700">Email</label>
                <Input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="usuario@uta.edu.ec"
                  disabled={isEdit}
                />
                {isEdit && (
                  <p className="text-xs text-gray-500 mt-1">
                    En edición se mantiene el email/UPN para evitar inconsistencias.
                  </p>
                )}
              </div>

              <div>
                <label className="text-sm text-gray-700">Nombre a mostrar</label>
                <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
              </div>

              {!isEdit && (
                <>
                  <div>
                    <label className="text-sm text-gray-700">Nombres</label>
                    <Input value={givenName} onChange={(e) => setGivenName(e.target.value)} />
                  </div>
                  <div>
                    <label className="text-sm text-gray-700">Apellidos</label>
                    <Input value={surname} onChange={(e) => setSurname(e.target.value)} />
                  </div>
                </>
              )}

              <div>
                <label className="text-sm text-gray-700">Departamento</label>
                <Input value={department} onChange={(e) => setDepartment(e.target.value)} />
              </div>

              <div>
                <label className="text-sm text-gray-700">Cargo</label>
                <Input value={jobTitle} onChange={(e) => setJobTitle(e.target.value)} />
              </div>
            </div>

            {!isEdit && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="text-sm text-gray-700">Contraseña (opcional)</label>
                  <Input
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="si no envías, backend podría generar"
                  />
                </div>

                <div className="flex items-center gap-2 pt-6">
                  <input
                    id="forceChange"
                    type="checkbox"
                    className="h-4 w-4"
                    checked={forceChangePasswordNextSignIn}
                    onChange={(e) => setForceChangePasswordNextSignIn(e.target.checked)}
                  />
                  <label htmlFor="forceChange" className="text-sm text-gray-700">
                    Forzar cambio de contraseña en próximo login
                  </label>
                </div>
              </div>
            )}

            <div className="flex items-center gap-2">
              <input
                id="enabled"
                type="checkbox"
                className="h-4 w-4"
                checked={accountEnabled}
                onChange={(e) => setAccountEnabled(e.target.checked)}
              />
              <label htmlFor="enabled" className="text-sm text-gray-700">
                Cuenta habilitada
              </label>
            </div>
          </CardContent>
        </Card>

        <div className="flex flex-col sm:flex-row justify-end gap-2">
          <Button type="button" variant="outline" onClick={onCancel} disabled={isPending}>
            Cancelar
          </Button>
          <Button type="submit" className="bg-blue-600 hover:bg-blue-700" disabled={!canSubmit || isPending}>
            {isEdit ? "Guardar cambios" : "Crear usuario"}
          </Button>
        </div>
      </form>

      {DEBUG_AUTH && (
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm font-semibold">Debug Auth (Form)</div>
            <div className="mt-2 space-y-2 max-h-[260px] overflow-y-auto">
              {debugEvents.map((e, idx) => (
                <div key={idx} className="border rounded p-2">
                  <div className="text-xs text-gray-500">
                    {e.at} · {e.action}
                  </div>
                  {e.detail !== undefined ? (
                    <pre className="mt-1 text-xs whitespace-pre-wrap break-words bg-gray-50 border rounded p-2">
                      {safeJson(e.detail, 6000)}
                    </pre>
                  ) : null}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
