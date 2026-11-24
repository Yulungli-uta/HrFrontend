// src/components/admin/UserCard.tsx
import { Clock, Cloud, Edit, KeyRound, LockOpen, Power, Server, Trash2 } from "lucide-react";

import { ActionIconButton } from "@/components/ui/action-icon-button";
import { StatusBadge, type StatusTone } from "@/components/ui/status-badge";
import { RecordAvatar, RecordCard, titleCase } from "@/components/ui/RecordCard";
import { cn } from "@/lib/utils";
import { ecuadorDateOf, formatDateTime, formatTime, parseServerDateTime, todayEcuador } from "@/lib/clock";
import type { User } from "@/features/auth";

// ─── Acciones (compartidas por la tabla y la tarjeta) ────────────────────────

export interface UserActionsProps {
  user: User;
  onEdit: (user: User) => void;
  onToggleActive: (user: User) => void;
  onUnlock: (user: User) => void;
  onResetPassword: (user: User) => void;
  onDelete: (user: User) => void;
  togglePending?: boolean;
  /** Botones de 44 px para pantallas táctiles. */
  touch?: boolean;
  className?: string;
}

/** Acciones por usuario. Desbloquear y restablecer contraseña solo aplican a usuarios Local. */
export function UserActions({
  user,
  onEdit,
  onToggleActive,
  onUnlock,
  onResetPassword,
  onDelete,
  togglePending,
  touch,
  className,
}: UserActionsProps) {
  const isLocal = user.userType === "Local";
  return (
    <div className={cn("flex flex-wrap items-center gap-1", className)}>
      <ActionIconButton icon={Edit} label="Editar usuario" tone="primary" touch={touch} onClick={() => onEdit(user)} />
      <ActionIconButton
        icon={Power}
        label={user.isActive ? "Inactivar usuario" : "Activar usuario"}
        tone={user.isActive ? "warning" : "success"}
        touch={touch}
        disabled={togglePending}
        onClick={() => onToggleActive(user)}
      />
      {isLocal && (
        <ActionIconButton icon={LockOpen} label="Desbloquear cuenta" tone="muted" touch={touch} onClick={() => onUnlock(user)} />
      )}
      {isLocal && (
        <ActionIconButton
          icon={KeyRound}
          label="Restablecer contraseña"
          tone="muted"
          touch={touch}
          onClick={() => onResetPassword(user)}
        />
      )}
      <ActionIconButton
        icon={Trash2}
        label="Eliminar usuario"
        tone="destructive"
        touch={touch}
        className={touch ? "ml-auto" : undefined}
        onClick={() => onDelete(user)}
      />
    </div>
  );
}

// ─── Utilidades de presentación ──────────────────────────────────────────────

function daysSince(date: Date): number {
  const diff = Date.parse(todayEcuador()) - Date.parse(ecuadorDateOf(date));
  return Math.round(diff / 86_400_000);
}

/** Texto legible del último acceso: "Hoy, 07:58", "Ayer, 07:58", "Hace 12 días" o la fecha completa. */
function describeLastLogin(lastLogin: User["lastLogin"]): { text: string; full: string; never: boolean } {
  const date = lastLogin ? parseServerDateTime(String(lastLogin)) : null;
  if (!date) return { text: "Nunca ha ingresado", full: "Sin accesos registrados", never: true };

  const full = formatDateTime(date, "es-EC", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
  const days = daysSince(date);
  if (days <= 0) return { text: `Hoy, ${formatTime(date, "es-EC", { hour: "2-digit", minute: "2-digit" })}`, full, never: false };
  if (days === 1) return { text: `Ayer, ${formatTime(date, "es-EC", { hour: "2-digit", minute: "2-digit" })}`, full, never: false };
  if (days < 30) return { text: `Hace ${days} días`, full, never: false };
  return { text: full, full, never: false };
}

function typeBadge(userType: string): { label: string; tone: StatusTone; Icon: typeof Cloud } {
  if (userType === "AzureAD") return { label: "Azure AD", tone: "primary", Icon: Cloud };
  if (userType === "Local") return { label: "Local", tone: "neutral", Icon: KeyRound };
  return { label: userType, tone: "neutral", Icon: Server };
}

// ─── Tarjeta ─────────────────────────────────────────────────────────────────

export interface UserCardProps extends Omit<UserActionsProps, "touch" | "className"> {}

/** Tarjeta de usuario para móvil, construida sobre el `RecordCard` estándar. */
export function UserCard(props: UserCardProps) {
  const { user } = props;
  const { text, full, never } = describeLastLogin(user.lastLogin);
  const { label, tone, Icon } = typeBadge(String(user.userType));

  return (
    <RecordCard
      tone={user.isActive ? "success" : "muted"}
      dimmed={!user.isActive}
      leading={<RecordAvatar name={user.displayName} seed={user.email} />}
      title={user.displayName ? titleCase(user.displayName) : "Sin nombre"}
      subtitle={<span className="break-all">{user.email}</span>}
      badges={
        <>
          <StatusBadge tone={tone}>
            <Icon className="h-3 w-3" aria-hidden="true" />
            {label}
          </StatusBadge>
          <StatusBadge tone={user.isActive ? "success" : "neutral"}>
            <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-current" />
            {user.isActive ? "Activo" : "Inactivo"}
          </StatusBadge>
        </>
      }
      meta={[
        {
          icon: Clock,
          value: never ? text : `Último acceso: ${text}`,
          tone: never ? "warning" : "default",
          title: full,
        },
      ]}
      actions={<UserActions {...props} touch className="w-full" />}
    />
  );
}
