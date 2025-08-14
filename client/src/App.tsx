import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Layout from "@/components/Layout";
import Dashboard from "@/pages/Dashboard";
import Personas from "@/pages/Personas";
import PersonaDetail from "@/pages/PersonaDetail";
import Asistencia from "@/pages/Asistencia";
import Permisos from "@/pages/Permisos";
import Nomina from "@/pages/Nomina";
import Publicaciones from "@/pages/Publicaciones";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Layout>
      <Switch>
        <Route path="/" component={Dashboard} />
        <Route path="/personas" component={Personas} />
        <Route path="/personas/:id" component={PersonaDetail} />
        <Route path="/asistencia" component={Asistencia} />
        <Route path="/permisos" component={Permisos} />
        <Route path="/nomina" component={Nomina} />
        <Route path="/publicaciones" component={Publicaciones} />
        <Route component={NotFound} />
      </Switch>
    </Layout>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
