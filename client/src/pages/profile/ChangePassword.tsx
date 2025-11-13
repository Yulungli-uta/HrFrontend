import { useForm } from "react-hook-form";
import { useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { KeyRound, Eye, EyeOff } from "lucide-react";
import { useState } from "react";
import { PasswordAPI } from "@/lib/api/auth";
import type { ChangePasswordDto } from "@/types/auth";
import { useToast } from "@/hooks/use-toast";

interface FormData {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export default function ChangePasswordPage() {
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const { toast } = useToast();

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    reset,
  } = useForm<FormData>({
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  const newPassword = watch("newPassword");

  // Mutación para cambiar contraseña
  const changePasswordMutation = useMutation({
    mutationFn: (data: ChangePasswordDto) => PasswordAPI.change(data),
    onSuccess: () => {
      toast({
        title: "Contraseña cambiada",
        description: "Su contraseña ha sido actualizada exitosamente",
      });
      reset();
    },
    onError: (error: any) => {
      toast({
        title: "Error al cambiar contraseña",
        description:
          error.message ||
          "No se pudo cambiar la contraseña. Verifique que la contraseña actual sea correcta.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: FormData) => {
    const changeData: ChangePasswordDto = {
      currentPassword: data.currentPassword,
      newPassword: data.newPassword,
    };
    changePasswordMutation.mutate(changeData);
  };

  // Validar fortaleza de contraseña
  const validatePasswordStrength = (password: string): string | true => {
    if (password.length < 8) {
      return "La contraseña debe tener al menos 8 caracteres";
    }
    if (!/[A-Z]/.test(password)) {
      return "Debe contener al menos una letra mayúscula";
    }
    if (!/[a-z]/.test(password)) {
      return "Debe contener al menos una letra minúscula";
    }
    if (!/[0-9]/.test(password)) {
      return "Debe contener al menos un número";
    }
    return true;
  };

  const isLoading = changePasswordMutation.isPending;

  return (
    <div className="container mx-auto p-6 max-w-2xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
          <KeyRound className="h-8 w-8" />
          Cambiar Contraseña
        </h1>
        <p className="text-gray-600 mt-2">
          Actualice su contraseña para mantener su cuenta segura
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Información de Seguridad</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Contraseña actual */}
            <div className="space-y-2">
              <Label htmlFor="currentPassword">
                Contraseña Actual <span className="text-red-500">*</span>
              </Label>
              <div className="relative">
                <Input
                  id="currentPassword"
                  type={showCurrentPassword ? "text" : "password"}
                  {...register("currentPassword", {
                    required: "La contraseña actual es requerida",
                  })}
                  placeholder="Ingrese su contraseña actual"
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                >
                  {showCurrentPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
              {errors.currentPassword && (
                <p className="text-sm text-red-600">
                  {errors.currentPassword.message}
                </p>
              )}
            </div>

            {/* Nueva contraseña */}
            <div className="space-y-2">
              <Label htmlFor="newPassword">
                Nueva Contraseña <span className="text-red-500">*</span>
              </Label>
              <div className="relative">
                <Input
                  id="newPassword"
                  type={showNewPassword ? "text" : "password"}
                  {...register("newPassword", {
                    required: "La nueva contraseña es requerida",
                    validate: validatePasswordStrength,
                  })}
                  placeholder="Ingrese su nueva contraseña"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                >
                  {showNewPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
              {errors.newPassword && (
                <p className="text-sm text-red-600">
                  {errors.newPassword.message}
                </p>
              )}
            </div>

            {/* Confirmar contraseña */}
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">
                Confirmar Nueva Contraseña <span className="text-red-500">*</span>
              </Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  {...register("confirmPassword", {
                    required: "Debe confirmar la nueva contraseña",
                    validate: (value) =>
                      value === newPassword || "Las contraseñas no coinciden",
                  })}
                  placeholder="Confirme su nueva contraseña"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
              {errors.confirmPassword && (
                <p className="text-sm text-red-600">
                  {errors.confirmPassword.message}
                </p>
              )}
            </div>

            {/* Requisitos de contraseña */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm font-semibold text-blue-900 mb-2">
                Requisitos de contraseña:
              </p>
              <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
                <li>Mínimo 8 caracteres</li>
                <li>Al menos una letra mayúscula</li>
                <li>Al menos una letra minúscula</li>
                <li>Al menos un número</li>
                <li>Diferente a la contraseña actual</li>
              </ul>
            </div>

            {/* Botones */}
            <div className="flex justify-end gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => reset()}
                disabled={isLoading}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={isLoading}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {isLoading ? "Cambiando..." : "Cambiar Contraseña"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Información de seguridad adicional */}
      <Card className="mt-6">
        <CardContent className="pt-6">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <p className="text-sm text-yellow-800">
              <strong>Importante:</strong> Después de cambiar su contraseña, todas
              las sesiones activas en otros dispositivos serán cerradas por
              seguridad. Deberá iniciar sesión nuevamente con su nueva contraseña.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
