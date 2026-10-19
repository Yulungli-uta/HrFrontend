// Estado único de las preferencias de interfaz del usuario.
// - Fuente de verdad: HrBackend (GET/PUT/DELETE /me/preferences). Gana siempre el servidor.
// - Caché local por usuario: permite aplicar tema/tamaño de letra sin parpadeo y funcionar si la API falla.
// - No toca autenticación ni permisos: solo lee la sesión (useAuth) para saber quién es el usuario.
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useLocation } from "wouter";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/features/auth";
import { useTheme, type Theme } from "@/components/ThemeProvider";
import { UserPreferencesAPI } from "@/lib/api/services/userPreferences";
import { logger } from "@/lib/logger";
import type { UserPreferences, UserPreferencesResponse } from "@/types/userPreferences";
import { DEFAULT_PREFERENCES } from "@/types/userPreferences";
import {
  clearReturnTo,
  clearVisualCache,
  markSessionAuthenticated,
  readCachedPreferences,
  readHomeFlag,
  writeCachedPreferences,
  writeHomeFlag,
} from "../services/preferencesStorage";
import { applyVisualPreferences } from "../services/applyPreferences";
import { UserPreferencesContext, type UserPreferencesContextValue } from "./UserPreferencesContext";

const MENU_SAVE_DEBOUNCE_MS = 800;


async function fetchPreferences(): Promise<UserPreferencesResponse> {
  const res = await UserPreferencesAPI.get();
  if (res.status === "error") throw new Error(res.error.message);
  return res.data;
}

export function UserPreferencesProvider({ children }: { children: ReactNode }) {
  const { user, isAuthenticated, isLoading } = useAuth();
  const [location] = useLocation();
  const queryClient = useQueryClient();
  const { theme, setTheme: setLocalTheme, previewTheme } = useTheme();

  const userId = isAuthenticated && user?.id ? String(user.id) : null;
  const queryKey = useMemo(() => ["userPreferences", userId] as const, [userId]);

  // Bandera de "primer aterrizaje de la sesión" para la página de inicio configurable:
  // 'pending' si la sesión empieza en "/" o "/login"; 'done' si arranca en un enlace directo.
  // Se escribe durante el render (idempotente) para que exista antes de que HomeRedirect decida.
  if (!isLoading) {
    if (isAuthenticated) {
      markSessionAuthenticated();
      if (readHomeFlag() === null) {
        writeHomeFlag(location === "/" || location === "/login" ? "pending" : "done");
      }
    } else {
      writeHomeFlag(null);
    }
  }

  const cached = useMemo(() => (userId ? readCachedPreferences(userId) : null), [userId]);

  const query = useQuery<UserPreferencesResponse>({
    queryKey,
    queryFn: fetchPreferences,
    enabled: !!userId,
    // Con caché local se usa como dato inicial pero se revalida siempre contra el servidor.
    initialData: cached ? { schemaVersion: 1, preferences: cached } : undefined,
    initialDataUpdatedAt: 0,
    staleTime: 5 * 60_000,
    retry: 1,
  });

  const saved: UserPreferences = query.data?.preferences ?? cached ?? {};
  const savedRef = useRef(saved);
  savedRef.current = saved;

  const [draft, setDraft] = useState<UserPreferences | null>(null);
  const setLocalThemeRef = useRef(setLocalTheme);
  setLocalThemeRef.current = setLocalTheme;
  const themeRef = useRef(theme);
  themeRef.current = theme;

  const isReady = !!userId && (query.isFetched || query.isError || !!query.data);
  const isSynced = !!userId && query.isSuccess && query.isFetchedAfterMount;
  const loadFailed = !!userId && query.isError;
  // El PUT reemplaza todo el documento: mientras no se confirme lo del servidor, no se envían cambios automáticos
  // (menú / tema rápido), porque pisarían preferencias guardadas desde otro equipo con una copia local vacía.
  const syncedRef = useRef(false);
  syncedRef.current = isSynced;

  // Caché local + atributos visuales (lo guardado, o la vista previa si hay una).
  useEffect(() => {
    if (!userId || !query.data) return;
    writeCachedPreferences(userId, query.data.preferences);
  }, [userId, query.data]);

  useEffect(() => {
    if (!userId) return;
    applyVisualPreferences(draft ?? saved);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `saved` cambia de identidad en cada render
  }, [userId, draft, JSON.stringify(saved)]);

  // Tema guardado → ThemeProvider (solo si el usuario definió uno y difiere del local).
  const savedTheme = saved.theme;
  useEffect(() => {
    if (savedTheme && savedTheme !== themeRef.current) setLocalThemeRef.current(savedTheme);
  }, [savedTheme]);

  // Vista previa del tema sin persistirlo.
  useEffect(() => {
    previewTheme(draft?.theme ?? null);
  }, [draft?.theme, previewTheme]);

  // Al cerrar sesión: valores visuales por defecto y sin copia visual global (la caché por usuario se conserva).
  const wasAuthenticatedRef = useRef(false);
  useEffect(() => {
    if (isAuthenticated) wasAuthenticatedRef.current = true;
    // Cierre de sesión (true → false): no se conserva la página anterior para el próximo inicio de sesión.
    if (!isLoading && !isAuthenticated && wasAuthenticatedRef.current) {
      wasAuthenticatedRef.current = false;
      clearReturnTo();
    }
  }, [isLoading, isAuthenticated]);

  useEffect(() => {
    if (isLoading || isAuthenticated) return;
    clearVisualCache();
    applyVisualPreferences({});
    setDraft(null);
  }, [isLoading, isAuthenticated]);

  const saveMutation = useMutation({
    mutationFn: async (next: UserPreferences) => {
      const res = await UserPreferencesAPI.save(next);
      if (res.status === "error") throw new Error(res.error.message);
      return res.data;
    },
    onSuccess: (data) => queryClient.setQueryData(queryKey, data),
  });

  const resetMutation = useMutation({
    mutationFn: async () => {
      const res = await UserPreferencesAPI.reset();
      if (res.status === "error") throw new Error(res.error.message);
    },
    onSuccess: () => {
      queryClient.setQueryData<UserPreferencesResponse>(queryKey, { schemaVersion: 1, preferences: {} });
    },
  });

  const save = useCallback(
    async (next: UserPreferences) => {
      try {
        await saveMutation.mutateAsync(next);
        setDraft(null);
        return true;
      } catch (e) {
        logger.error("Preferences", "No se pudieron guardar las preferencias", e);
        return false;
      }
    },
    [saveMutation]
  );

  const reset = useCallback(async () => {
    try {
      await resetMutation.mutateAsync();
      setDraft(null);
      setLocalThemeRef.current(DEFAULT_PREFERENCES.theme);
      return true;
    } catch (e) {
      logger.error("Preferences", "No se pudieron restablecer las preferencias", e);
      return false;
    }
  }, [resetMutation]);

  // Guardado diferido para cambios frecuentes (menú, tema rápido): actualiza la caché al instante
  // y envía al servidor una sola vez tras una pausa. Un fallo no interrumpe al usuario.
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scheduleSave = useCallback(
    (next: UserPreferences) => {
      if (!userId || !syncedRef.current) return;
      queryClient.setQueryData<UserPreferencesResponse>(queryKey, (old) => ({
        schemaVersion: old?.schemaVersion ?? 1,
        preferences: next,
        updatedAt: old?.updatedAt,
      }));
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        saveMutation.mutate(next, {
          onError: (e) => logger.error("Preferences", "No se pudo sincronizar la preferencia", e),
        });
      }, MENU_SAVE_DEBOUNCE_MS);
    },
    [userId, queryClient, queryKey, saveMutation]
  );
  useEffect(
    () => () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    },
    []
  );

  const setMenuCollapsed = useCallback(
    (collapsed: boolean) => {
      const current = savedRef.current;
      if ((current.menuStartMode ?? DEFAULT_PREFERENCES.menuStartMode) !== "remember") return;
      if (current.menuCollapsed === collapsed) return;
      scheduleSave({ ...current, menuCollapsed: collapsed });
    },
    [scheduleSave]
  );

  const setTheme = useCallback(
    (next: Theme) => {
      setLocalThemeRef.current(next);
      if (!userId) return;
      scheduleSave({ ...savedRef.current, theme: next });
    },
    [userId, scheduleSave]
  );

  const value = useMemo<UserPreferencesContextValue>(
    () => ({
      preferences: saved,
      isReady,
      isSynced,
      loadFailed,
      isSaving: saveMutation.isPending || resetMutation.isPending,
      save,
      reset,
      preview: setDraft,
      setMenuCollapsed,
      setTheme,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `saved` se compara por contenido abajo
    [JSON.stringify(saved), isReady, isSynced, loadFailed, saveMutation.isPending, resetMutation.isPending, save, reset, setMenuCollapsed, setTheme]
  );

  return <UserPreferencesContext.Provider value={value}>{children}</UserPreferencesContext.Provider>;
}
