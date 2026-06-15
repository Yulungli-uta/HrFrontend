import { useRef, useCallback } from 'react';
import { Upload, Download, Trash2, AlertCircle, CheckCircle2, Loader2, FileSpreadsheet } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

import { useBulkPersonUpload, downloadBulkTemplate } from '@/hooks/contractRequest/useBulkPersonUpload';
import type { BulkValidatedRow } from '@/types/contractRequestPerson';

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (validRows: BulkValidatedRow[]) => void;
};

export function BulkPersonUploadDialog({ open, onOpenChange, onConfirm }: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { step, rows, validRows, invalidRows, parseError, canUpload, parseFile, removeRow, reset } =
    useBulkPersonUpload();

  const handleFile = useCallback(
    async (file: File | null) => {
      if (!file) return;
      await parseFile(file);
    },
    [parseFile]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const handleClose = () => {
    reset();
    onOpenChange(false);
  };

  const handleConfirm = () => {
    onConfirm(validRows);
    reset();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleClose(); }}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5 text-primary" />
            Carga masiva de personas
          </DialogTitle>
          <DialogDescription>
            Sube un archivo Excel con las personas sugeridas. Se validará que cada identificación
            exista en el sistema antes de permitir la carga.
          </DialogDescription>
        </DialogHeader>

        {/* ── Paso 1: área de carga (idle o error) ── */}
        {(step === 'idle' || step === 'error') && (
          <div className="space-y-4">
            <Button variant="outline" size="sm" onClick={downloadBulkTemplate} className="gap-2">
              <Download className="h-4 w-4" />
              Descargar plantilla Excel
            </Button>

            {parseError && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{parseError}</AlertDescription>
              </Alert>
            )}

            <div
              className="border-2 border-dashed border-muted-foreground/30 rounded-lg p-10 text-center
                         hover:border-primary/50 transition-colors cursor-pointer"
              onDrop={handleDrop}
              onDragOver={(e) => e.preventDefault()}
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="h-8 w-8 mx-auto mb-3 text-muted-foreground" />
              <p className="text-sm font-medium">Arrastra aquí tu archivo o haz clic para seleccionarlo</p>
              <p className="text-xs text-muted-foreground mt-1">Solo archivos .xlsx</p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx"
                className="hidden"
                onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
              />
            </div>

            <div className="text-xs text-muted-foreground space-y-1">
              <p className="font-medium">Columnas requeridas en el Excel:</p>
              <ul className="list-disc list-inside space-y-0.5">
                <li><code>identificacion</code> — cédula o pasaporte</li>
                <li><code>tipo</code> — ADMINISTRATIVO o DOCENTE</li>
                <li><code>job_id</code> — ID numérico del cargo</li>
              </ul>
              <p className="font-medium mt-2">Columnas opcionales:</p>
              <ul className="list-disc list-inside space-y-0.5">
                <li><code>fecha_inicio</code>, <code>fecha_fin</code> — formato YYYY-MM-DD</li>
                <li><code>horas_semanales</code>, <code>valor_hora</code> — solo para DOCENTE</li>
                <li><code>observacion</code></li>
              </ul>
            </div>
          </div>
        )}

        {/* ── Paso 2: validando ── */}
        {(step === 'parsing' || step === 'validating') && (
          <div className="flex flex-col items-center justify-center py-12 gap-3 text-muted-foreground">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm">
              {step === 'parsing' ? 'Leyendo archivo…' : 'Verificando personas en el sistema…'}
            </p>
          </div>
        )}

        {/* ── Paso 3: resultado de validación ── */}
        {step === 'ready' && rows.length > 0 && (
          <div className="space-y-4">
            {/* Resumen */}
            <div className="flex items-center gap-3 flex-wrap">
              <Badge variant="secondary">{rows.length} filas leídas</Badge>
              {validRows.length > 0 && (
                <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
                  <CheckCircle2 className="h-3 w-3 mr-1" />
                  {validRows.length} válidas
                </Badge>
              )}
              {invalidRows.length > 0 && (
                <Badge variant="destructive">
                  <AlertCircle className="h-3 w-3 mr-1" />
                  {invalidRows.length} no encontradas
                </Badge>
              )}
            </div>

            {invalidRows.length > 0 && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Las filas marcadas en rojo corresponden a identificaciones que <strong>no existen</strong> en
                  el sistema. Elimínalas antes de confirmar la carga.
                </AlertDescription>
              </Alert>
            )}

            {/* Tabla de resultados */}
            <div className="overflow-x-auto rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Estado</TableHead>
                    <TableHead>Identificación</TableHead>
                    <TableHead>Persona</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>ID Cargo</TableHead>
                    <TableHead>Inicio</TableHead>
                    <TableHead>Fin</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((row) => {
                    const isInvalid = row.status !== 'valid';
                    return (
                      <TableRow
                        key={row._rowIndex}
                        className={isInvalid ? 'bg-destructive/5' : undefined}
                      >
                        <TableCell>
                          {isInvalid ? (
                            <Badge variant="destructive" className="text-xs gap-1">
                              <AlertCircle className="h-3 w-3" /> No encontrada
                            </Badge>
                          ) : (
                            <Badge className="text-xs gap-1 bg-green-100 text-green-800 hover:bg-green-100">
                              <CheckCircle2 className="h-3 w-3" /> Válida
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="font-mono text-sm">{row.identification}</TableCell>
                        <TableCell className="text-sm">
                          {row.personFullName ?? (
                            <span className="text-destructive text-xs">Sin registro</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs">{row.tipo}</Badge>
                        </TableCell>
                        <TableCell className="text-sm">{row.jobId}</TableCell>
                        <TableCell className="text-xs">{row.startDate ?? '—'}</TableCell>
                        <TableCell className="text-xs">{row.endDate ?? '—'}</TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-destructive hover:text-destructive"
                            onClick={() => removeRow(row._rowIndex)}
                            title="Eliminar fila"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>

            {rows.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">
                No quedan filas. Sube un nuevo archivo.
              </p>
            )}
          </div>
        )}

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={handleClose}>
            Cancelar
          </Button>
          {step === 'ready' && rows.length > 0 && (
            <Button variant="outline" size="sm" onClick={reset} className="gap-1">
              <Upload className="h-3 w-3" /> Cargar otro archivo
            </Button>
          )}
          {canUpload && (
            <Button onClick={handleConfirm} className="gap-2">
              <CheckCircle2 className="h-4 w-4" />
              Agregar {validRows.length} {validRows.length === 1 ? 'persona' : 'personas'}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
