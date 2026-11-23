// Guía visual del sistema: muestra tokens, componentes y patrones con el tema vigente (styles/brand.css).
// Sirve para revisar de una sola vez colores, tipografías y comportamiento móvil, en claro y oscuro.
import { Plus, Download, Save, Users, CheckCircle2, Clock, AlertTriangle, Briefcase, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { PageHeader, ActionBar } from "@/components/ui/page-header";
import { FilterBar } from "@/components/ui/filter-bar";
import { FormGrid } from "@/components/ui/form-grid";
import { StatusBadge, type StatusTone } from "@/components/ui/status-badge";
import { StatCard } from "@/components/ui/stat-card";
import { RowAction, ROW_ACTIONS, type RowActionKey } from "@/components/ui/row-action";

const TOKENS = ["background", "card", "primary", "secondary", "muted", "accent", "destructive", "success", "warning", "info"] as const;
const CATEGORIES = [1, 2, 3, 4, 5, 6, 7, 8] as const;
const TONES: StatusTone[] = ["success", "warning", "danger", "info", "primary", "neutral", "cat-1", "cat-2", "cat-3", "cat-4", "cat-5", "cat-6"];

export default function StyleGuide() {
  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <PageHeader
        title="Guía de estilos UTA"
        description="Tokens, componentes y patrones del sistema. Para cambiar la identidad se edita src/styles/brand.css."
        actions={<><Button variant="outline"><Download className="h-4 w-4" />Exportar</Button><Button><Plus className="h-4 w-4" />Nuevo</Button></>}
      />

      <Card>
        <CardHeader><CardTitle>Colores</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
            {TOKENS.map((t) => (
              <div key={t} className="space-y-1">
                <div className="h-12 rounded-md border border-border" style={{ backgroundColor: `var(--${t})` }} />
                <p className="text-xs font-medium">{t}</p>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-4 gap-3 sm:grid-cols-8">
            {CATEGORIES.map((n) => (
              <div key={n} className="space-y-1">
                <div className="h-8 rounded-md" style={{ backgroundColor: `var(--cat-${n})` }} />
                <p className="text-xs text-muted-foreground">cat-{n}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Botones de acción (solo icono con tooltip)</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Acciones de fila y de herramienta: solo icono, con tooltip, en todas las pantallas (catálogo ROW_ACTIONS).
            Se quedan con texto: Cancelar, Guardar, Reintentar, Aprobar, Rechazar y la acción principal de la página.
          </p>
          <div className="flex flex-wrap items-center gap-4">
            {(Object.keys(ROW_ACTIONS) as RowActionKey[]).map((k) => (
              <div key={k} className="flex items-center gap-2 text-sm">
                <RowAction action={k} onClick={() => undefined} />
                <span className="text-muted-foreground">{ROW_ACTIONS[k].label}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Tarjetas</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Contenedora (esta misma: cabecera tenue con marcador azul), indicador (StatCard, con tono) y alerta.
          </p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <StatCard tone="primary" icon={Users} label="Empleados activos" value="1590" hint="Total institucional" />
            <StatCard tone="success" icon={CheckCircle2} label="Aprobados" value="42" />
            <StatCard tone="warning" icon={Clock} label="Pendientes" value="7" hint="Requieren revisión" />
            <StatCard tone="danger" icon={AlertTriangle} label="Vencidos" value="3" />
            <StatCard tone="info" icon={Briefcase} label="Contratos vigentes" value="312" />
            <StatCard tone="cat-3" icon={BookOpen} label="Capacitaciones" value="58" onClick={() => undefined} />
          </div>
          <div className="alert-warning">Tarjeta de alerta: use un tono de estado, nunca decorativo.</div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Tipografía</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          <p className="font-display text-3xl font-bold">Título principal (Gotham / Montserrat)</p>
          <p className="font-display text-xl font-semibold">Subtítulo de sección</p>
          <p>Texto de cuerpo en Helvetica Neue o Arial. La jerarquía se mantiene con el tamaño de letra de Preferencias.</p>
          <p className="text-sm text-muted-foreground">Texto secundario y de ayuda.</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Botones y estados</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <ActionBar stackOnMobile={false}>
            <Button>Primario</Button><Button variant="secondary">Secundario</Button><Button variant="outline">Contorno</Button>
            <Button variant="ghost">Fantasma</Button><Button variant="destructive">Eliminar</Button>
            <Button variant="success">Aprobar</Button><Button variant="warning">Advertencia</Button><Button variant="info">Información</Button>
          </ActionBar>
          <div className="flex flex-wrap gap-2">
            {TONES.map((t) => <StatusBadge key={t} tone={t}>{t}</StatusBadge>)}
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge>Por defecto</Badge><Badge variant="secondary">Secundaria</Badge><Badge variant="success">Éxito</Badge>
            <Badge variant="warning">Alerta</Badge><Badge variant="info">Info</Badge><Badge variant="destructive">Error</Badge><Badge variant="outline">Contorno</Badge>
          </div>
          <div className="space-y-2">
            <div className="alert-info">Mensaje informativo</div>
            <div className="alert-success">Operación realizada correctamente</div>
            <div className="alert-warning">Revise los datos antes de continuar</div>
            <div className="alert-error">No se pudo completar la acción</div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Formulario y filtros</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <FilterBar>
            <div className="sm:w-64"><Label>Buscar</Label><Input placeholder="Nombre o cédula" /></div>
            <div className="sm:w-48"><Label>Estado</Label><Input placeholder="Todos" /></div>
            <Button variant="outline">Limpiar</Button>
          </FilterBar>
          <FormGrid columns={3}>
            <div><Label>Nombres</Label><Input /></div>
            <div><Label>Apellidos</Label><Input /></div>
            <div><Label>Correo</Label><Input type="email" /></div>
          </FormGrid>
          <Dialog>
            <DialogTrigger asChild><Button variant="outline">Abrir diálogo</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Diálogo de ejemplo</DialogTitle><DialogDescription>Alto limitado con scroll interno en pantallas pequeñas.</DialogDescription></DialogHeader>
              <FormGrid columns={2}><div><Label>Campo A</Label><Input /></div><div><Label>Campo B</Label><Input /></div></FormGrid>
              <DialogFooter><Button variant="outline">Cancelar</Button><Button><Save className="h-4 w-4" />Guardar</Button></DialogFooter>
            </DialogContent>
          </Dialog>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Pestañas y tabla</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <Tabs defaultValue="a">
            <TabsList><TabsTrigger value="a">Personal</TabsTrigger><TabsTrigger value="b">Formación</TabsTrigger><TabsTrigger value="c">Publicaciones</TabsTrigger><TabsTrigger value="d">Familia</TabsTrigger><TabsTrigger value="e">Experiencia</TabsTrigger></TabsList>
            <TabsContent value="a" className="pt-3 text-sm text-muted-foreground">En pantallas pequeñas las pestañas se desplazan horizontalmente.</TabsContent>
          </Tabs>
          <Table>
            <TableHeader><TableRow><TableHead>Nombre</TableHead><TableHead>Cargo</TableHead><TableHead>Estado</TableHead><TableHead className="text-right">Acciones</TableHead></TableRow></TableHeader>
            <TableBody>
              <TableRow><TableCell>Ana Pérez</TableCell><TableCell>Analista</TableCell><TableCell><StatusBadge tone="success">Activo</StatusBadge></TableCell><TableCell className="text-right"><RowAction action="view" /></TableCell></TableRow>
              <TableRow><TableCell>Luis Mora</TableCell><TableCell>Docente</TableCell><TableCell><StatusBadge tone="warning">Pendiente</StatusBadge></TableCell><TableCell className="text-right"><RowAction action="view" /></TableCell></TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
