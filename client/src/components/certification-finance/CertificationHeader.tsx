// src/components/certification-finance/CertificationHeader.tsx
import { FileText, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

export function CertificationHeader(props: {
  onCreate: () => void;
  directoryInfo: string;
}) {
  const { onCreate, directoryInfo } = props;

  return (
    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-6">
      <div>
        <h1 className="text-2xl lg:text-3xl font-bold text-foreground flex items-center gap-2">
          <FileText className="h-6 w-6 lg:h-8 lg:w-8 text-primary" />
          Gestión de Certificaciones Financieras
        </h1>
        <p className="text-muted-foreground mt-1 lg:mt-2 text-sm lg:text-base">
          Administre las certificaciones financieras del sistema
        </p>
        <div className="mt-2 text-xs text-muted-foreground">
          <span className="font-medium">Directorio:</span> {directoryInfo}
        </div>
      </div>

      <Button className="bg-primary hover:bg-primary/90 w-full lg:w-auto" onClick={onCreate}>
        <Plus className="mr-2 h-4 w-4" />
        Agregar Certificación
      </Button>
    </div>
  );
}
