// src/components/person-detail/tabs/ResearchProjectsTab.tsx
// Pestaña de la hoja de vida: proyectos de investigación donde participó la persona (solo lectura).
import { useQuery } from "@tanstack/react-query";
import { FlaskConical } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ResearchProjectsAPI } from "@/lib/api";
import { formatDateOnly } from "@/lib/dateOnly";
import { ResearchDocumentLink } from "@/components/research-projects/ResearchDocumentLink";

interface ResearchProjectsTabProps {
  personId?: number;
}

export function ResearchProjectsTab({ personId }: ResearchProjectsTabProps) {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["research-participations", personId],
    queryFn: () => ResearchProjectsAPI.getByPerson(personId as number),
    enabled: personId != null,
  });

  const projects = data?.status === "success" ? data.data : [];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center text-lg">
          <FlaskConical className="mr-2 h-5 w-5" />
          Proyectos de investigación
          <Badge variant="outline" className="ml-2">
            {projects.length}
          </Badge>
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        {isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        ) : isError || data?.status === "error" ? (
          <p className="py-6 text-center text-sm text-muted-foreground">No se pudo cargar la participación en proyectos.</p>
        ) : projects.length === 0 ? (
          <div className="py-8 text-center text-muted-foreground">
            <FlaskConical className="mx-auto mb-3 h-12 w-12 opacity-50" />
            <p className="text-base">No hay participación registrada en proyectos de investigación</p>
          </div>
        ) : (
          projects.map((project) => (
            <div key={project.id} className="space-y-3 rounded-lg border p-4">
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline" className="font-mono">{project.code}</Badge>
                  {project.hasExtension && <Badge>Con prórroga</Badge>}
                </div>
                <p className="break-words font-medium">{project.name}</p>
                <p className="text-sm text-muted-foreground">
                  {formatDateOnly(project.startDate)} – {formatDateOnly(project.endDate)} · Ejecución: {project.executionTime.text}
                  {project.extension && (
                    <> · Prórroga hasta {formatDateOnly(project.extension.endDate)} ({project.extension.duration.text})</>
                  )}
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <ResearchDocumentLink label={`Aprobación ${project.approvalResolution.number}`} url={project.approvalResolution.documentUrl} fileName={project.approvalResolution.fileName} />
                {project.extension && (
                  <ResearchDocumentLink label={`Prórroga ${project.extension.resolutionNumber}`} url={project.extension.documentUrl} fileName={project.extension.fileName} />
                )}
                <ResearchDocumentLink label={`Finalización ${project.completionResolution.number}`} url={project.completionResolution.documentUrl} fileName={project.completionResolution.fileName} />
              </div>

              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Rol desempeñado</TableHead>
                      <TableHead>Inicio</TableHead>
                      <TableHead>Fin</TableHead>
                      <TableHead>Tiempo en el rol</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {project.participations.map((p) => (
                      <TableRow key={p.id}>
                        <TableCell>{p.roleName}</TableCell>
                        <TableCell className="whitespace-nowrap">{formatDateOnly(p.startDate)}</TableCell>
                        <TableCell className="whitespace-nowrap">{formatDateOnly(p.endDate)}</TableCell>
                        <TableCell>{p.duration.text}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
