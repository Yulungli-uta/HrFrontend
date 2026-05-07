// src/pages/profile/ChangePassword.tsx
import { useState } from "react";
import { useForm } from "react-hook-form";
import { useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { KeyRound, Eye, EyeOff, ShieldCheck, Mail, Loader2, CheckCircle2 } from "lucide-react";
import { PasswordAPI } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { parseApiError } from "@/lib/error-handling";

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface SimpleFormData {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

interface TwoFaFormData {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
  otpCode: string;
}

// ─── Validación de fortaleza ──────────────────────────────────────────────────

function validateStrength(password: string): string | true {
  if (password.length < 8) return "La contraseña debe tener al menos 8 caracteres";
  if (!/[A-Z]/.test(password)) return "Debe contener al menos una letra mayúscula";
  if (!/[a-z]/.test(password)) return "Debe contener al menos una letra minúscula";
  if (!/[0-9]/.test(password)) return "Debe contener al menos un número";
  return true;
}

// ─── Campo contraseña reutilizable ────────────────────────────────────────────

function PasswordInput({
  id,
  label,
  registration,
  error,
}: {
  id: string;
  label: string;
  registration: any;
  error?: string;
}) {
  const [show, setShow] = useState(false);
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label} <span className="text-destructive">*</span></Label>
      <div className="relative">
        <Input
          id={id}
          type={show ? "text" : "password"}
          {...registration}
          placeholder="••••••••"
        />
        <button
          type="button"
          onClick={() => setShow((v) => !v)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
        >
          {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}

// ─── Requisitos ────────────────────────────────────────────────────────────────

function PasswordRequirements() {
  return (
    <div className="bg-primary/10 border border-primary/30 rounded-lg p-4">
      <p className="text-sm font-semibold text-primary mb-2">Requisitos de contraseña:</p>
      <ul className="text-sm text-primary space-y-1 list-disc list-inside">
        <li>Mínimo 8 caracteres</li>
        <li>Al menos una letra mayúscula</li>
        <li>Al menos una letra minúscula</li>
        <li>Al menos un número</li>
        <li>Diferente a la contraseña actual</li>
      </ul>
    </div>
  );
}

// ─── Tab Simple ───────────────────────────────────────────────────────────────

function SimpleTab() {
  const { toast } = useToast();
  const { register, handleSubmit, formState: { errors }, watch, reset } = useForm<SimpleFormData>({
    defaultValues: { currentPassword: "", newPassword: "", confirmPassword: "" },
  });
  const newPassword = watch("newPassword");

  const mutation = useMutation({
    mutationFn: (data: SimpleFormData) =>
      PasswordAPI.change({ currentPassword: data.currentPassword, newPassword: data.newPassword }),
    onSuccess: () => {
      toast({ title: "Contraseña cambiada", description: "Su contraseña fue actualizada exitosamente." });
      reset();
    },
    onError: (err: unknown) => {
      toast({ title: "Error al cambiar contraseña", description: parseApiError(err).message, variant: "destructive" });
    },
  });

  return (
    <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="space-y-5">
      <PasswordInput
        id="s-current"
        label="Contraseña actual"
        registration={register("currentPassword", { required: "La contraseña actual es requerida" })}
        error={errors.currentPassword?.message}
      />
      <PasswordInput
        id="s-new"
        label="Nueva contraseña"
        registration={register("newPassword", { required: "La nueva contraseña es requerida", validate: validateStrength })}
        error={errors.newPassword?.message}
      />
      <PasswordInput
        id="s-confirm"
        label="Confirmar nueva contraseña"
        registration={register("confirmPassword", {
          required: "Confirme la nueva contraseña",
          validate: (v) => v === newPassword || "Las contraseñas no coinciden",
        })}
        error={errors.confirmPassword?.message}
      />

      <PasswordRequirements />

      <div className="flex justify-end gap-3">
        <Button type="button" variant="outline" onClick={() => reset()} disabled={mutation.isPending}>
          Limpiar
        </Button>
        <Button type="submit" disabled={mutation.isPending} className="bg-primary hover:bg-primary/90">
          {mutation.isPending
            ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Cambiando...</>
            : "Cambiar contraseña"}
        </Button>
      </div>
    </form>
  );
}

// ─── Tab 2FA ──────────────────────────────────────────────────────────────────

function TwoFaTab() {
  const { toast } = useToast();
  const [step, setStep] = useState<"request" | "verify">("request");
  const [otpDevCode, setOtpDevCode] = useState<string | null>(null);

  const { register, handleSubmit, formState: { errors }, watch, reset } = useForm<TwoFaFormData>({
    defaultValues: { currentPassword: "", newPassword: "", confirmPassword: "", otpCode: "" },
  });
  const newPassword = watch("newPassword");

  // Paso 1: solicitar OTP
  const requestMutation = useMutation({
    mutationFn: () => PasswordAPI.requestChange2fa(),
    onSuccess: (res) => {
      const devCode = (res as any)?.data?.otpCodeDev ?? null;
      setOtpDevCode(devCode);
      setStep("verify");
      toast({ title: "Código enviado", description: "Revise su correo electrónico para obtener el código OTP." });
    },
    onError: (err: unknown) => {
      toast({ title: "Error al solicitar código", description: parseApiError(err).message, variant: "destructive" });
    },
  });

  // Paso 2: cambio con OTP
  const verifyMutation = useMutation({
    mutationFn: (data: TwoFaFormData) =>
      PasswordAPI.changePassword2fa({
        currentPassword: data.currentPassword,
        newPassword: data.newPassword,
        otpCode: data.otpCode,
      }),
    onSuccess: () => {
      toast({ title: "Contraseña cambiada", description: "Su contraseña fue actualizada exitosamente con verificación 2FA." });
      reset();
      setStep("request");
      setOtpDevCode(null);
    },
    onError: (err: unknown) => {
      toast({ title: "Error al verificar", description: parseApiError(err).message, variant: "destructive" });
    },
  });

  const handleReset = () => {
    reset();
    setStep("request");
    setOtpDevCode(null);
  };

  return (
    <div className="space-y-5">
      {/* Indicador de pasos */}
      <div className="flex items-center gap-3">
        <div className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold border-2 ${step === "request" ? "bg-primary text-primary-foreground border-primary" : "bg-success/20 text-success border-success"}`}>
          {step === "verify" ? <CheckCircle2 className="h-4 w-4" /> : "1"}
        </div>
        <div className="h-0.5 flex-1 bg-border" />
        <div className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold border-2 ${step === "verify" ? "bg-primary text-primary-foreground border-primary" : "bg-muted text-muted-foreground border-border"}`}>
          2
        </div>
      </div>

      {step === "request" ? (
        <div className="space-y-4">
          <div className="bg-muted/50 rounded-lg p-4 flex items-start gap-3">
            <Mail className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
            <p className="text-sm text-muted-foreground">
              Se enviará un código de verificación de 6 dígitos a su correo electrónico registrado.
              El código tiene una validez de <strong>10 minutos</strong>.
            </p>
          </div>
          <Button
            onClick={() => requestMutation.mutate()}
            disabled={requestMutation.isPending}
            className="w-full bg-primary hover:bg-primary/90"
          >
            {requestMutation.isPending
              ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Enviando código...</>
              : <><Mail className="h-4 w-4 mr-2" />Solicitar código de verificación</>}
          </Button>
        </div>
      ) : (
        <form onSubmit={handleSubmit((d) => verifyMutation.mutate(d))} className="space-y-5">
          {/* Badge de confirmación de envío */}
          <div className="flex items-center gap-2 p-3 rounded-lg bg-success/10 border border-success/30">
            <CheckCircle2 className="h-4 w-4 text-success shrink-0" />
            <p className="text-sm text-success font-medium">Código enviado a su correo electrónico</p>
          </div>

          {/* Código OTP (dev) */}
          {otpDevCode && (
            <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800">
              <p className="text-xs text-amber-700 dark:text-amber-400 font-medium mb-1">Código de desarrollo (solo visible en entorno DEV):</p>
              <Badge variant="outline" className="font-mono text-lg tracking-widest px-4 py-1">
                {otpDevCode}
              </Badge>
            </div>
          )}

          {/* Código OTP */}
          <div className="space-y-2">
            <Label htmlFor="otp">Código de verificación (6 dígitos) <span className="text-destructive">*</span></Label>
            <Input
              id="otp"
              {...register("otpCode", {
                required: "El código es requerido",
                pattern: { value: /^\d{6}$/, message: "El código debe ser de 6 dígitos" },
              })}
              placeholder="000000"
              maxLength={6}
              className="text-center tracking-widest text-lg font-mono"
            />
            {errors.otpCode && <p className="text-sm text-destructive">{errors.otpCode.message}</p>}
          </div>

          <PasswordInput
            id="2fa-current"
            label="Contraseña actual"
            registration={register("currentPassword", { required: "La contraseña actual es requerida" })}
            error={errors.currentPassword?.message}
          />
          <PasswordInput
            id="2fa-new"
            label="Nueva contraseña"
            registration={register("newPassword", { required: "La nueva contraseña es requerida", validate: validateStrength })}
            error={errors.newPassword?.message}
          />
          <PasswordInput
            id="2fa-confirm"
            label="Confirmar nueva contraseña"
            registration={register("confirmPassword", {
              required: "Confirme la nueva contraseña",
              validate: (v) => v === newPassword || "Las contraseñas no coinciden",
            })}
            error={errors.confirmPassword?.message}
          />

          <PasswordRequirements />

          <div className="flex justify-between gap-3">
            <Button type="button" variant="outline" onClick={handleReset} disabled={verifyMutation.isPending}>
              Reiniciar
            </Button>
            <Button type="submit" disabled={verifyMutation.isPending} className="bg-primary hover:bg-primary/90">
              {verifyMutation.isPending
                ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Verificando...</>
                : <><ShieldCheck className="h-4 w-4 mr-2" />Cambiar con código</>}
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}

// ─── Página principal ─────────────────────────────────────────────────────────

export default function ChangePasswordPage() {
  return (
    <div className="container mx-auto p-6 max-w-2xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
          <KeyRound className="h-8 w-8" />
          Cambiar Contraseña
        </h1>
        <p className="text-muted-foreground mt-2">
          Actualice su contraseña para mantener su cuenta segura
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Seguridad de la cuenta</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="simple">
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="simple" className="flex items-center gap-2">
                <KeyRound className="h-4 w-4" />
                Cambio directo
              </TabsTrigger>
              <TabsTrigger value="2fa" className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4" />
                Con verificación 2FA
              </TabsTrigger>
            </TabsList>

            <TabsContent value="simple">
              <SimpleTab />
            </TabsContent>

            <TabsContent value="2fa">
              <TwoFaTab />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardContent className="pt-6">
          <div className="bg-warning/10 border border-warning/30 rounded-lg p-4">
            <p className="text-sm text-warning-foreground">
              <strong>Importante:</strong> Después de cambiar su contraseña, todas las sesiones
              activas en otros dispositivos serán cerradas por seguridad.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
