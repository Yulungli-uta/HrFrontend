// components/auth/RedirectToLogin.tsx
// Redirige a /login a quien aún no tiene sesión, recordando la página que pidió (enlace directo) para volver a ella
// al terminar de iniciar sesión. Solo se recuerda en la carga inicial de la pestaña: tras un cierre de sesión no
// se guarda la página anterior (otro usuario podría iniciar sesión en el mismo equipo).
import { Redirect, useLocation } from "wouter";
import { wasSessionAuthenticated, writeReturnTo } from "@/features/preferences";

export default function RedirectToLogin() {
  const [location] = useLocation();

  if (!wasSessionAuthenticated()) {
    // La búsqueda (?a=b) no está en `location` de wouter; se toma de la URL actual.
    writeReturnTo(location + window.location.search);
  }

  return <Redirect to="/login" />;
}
