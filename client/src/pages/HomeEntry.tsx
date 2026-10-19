// pages/HomeEntry.tsx
// Entrada de "/": el autoservicio de siempre, precedido por la redirección opcional a la página de
// inicio elegida en "Mis preferencias". Vive en una página aparte (carga diferida) para poder
// importar routes.config sin crear una dependencia circular con él.
import HomeRedirect from "@/components/auth/HomeRedirect";
import EmployeeSelfServicePage from "@/pages/EmployeeSelfServicePage";
import { routes } from "@/routes/routes.config";

export default function HomeEntry() {
  return (
    <HomeRedirect routes={routes}>
      <EmployeeSelfServicePage />
    </HomeRedirect>
  );
}
