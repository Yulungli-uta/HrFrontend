// src/components/templateEditor/TemplateFieldsPanel.tsx
import { useMemo, useState, type DragEvent } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Tag, CheckCircle2, Circle, Pencil, Loader2, GripVertical } from 'lucide-react';
import { FIELD_TOKEN_MIME } from './HtmlCodeEditor';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { parseApiError } from '@/lib/error-handling';
import {
  DocumentTemplatesAPI,
  type DocumentTemplateFieldDto,
  type FieldSourceType,
} from '@/lib/api/services/documentTemplates';

const SOURCE_TYPES: FieldSourceType[] = ['Employee', 'Contract', 'Movement', 'System', 'Manual'];
const DATA_TYPES = ['string', 'date', 'number', 'currency', 'boolean'];

/**
 * Tokens institucionales reservados: el backend sabe resolverlos automáticamente (logo, nombre
 * de la institución, etc.) cuando se define el campo con SourceType=System — el archivo/valor
 * real vive en el backend (wwwroot/images/institutional/), nunca en el frontend. Esta lista solo
 * sirve para mostrar una pista útil y prellenar el formulario; el campo sigue requiriendo que el
 * usuario lo defina, igual que AUTHORITY_NAME o cualquier otro campo System.
 */
const INSTITUTIONAL_TOKENS: Record<string, string> = {
  LOGO_URL: 'Resuelto por el backend con el logo institucional (wwwroot/images/institutional). Defínelo con Origen = System.',
};

interface Props {
  templateId: number;
  htmlContent: string;
  fields: DocumentTemplateFieldDto[];
  readOnly?: boolean;
  onFieldsChanged: () => void;
}

interface FieldFormState {
  label: string;
  sourceType: FieldSourceType;
  sourceProperty: string;
  dataType: string;
  defaultValue: string;
  isRequired: boolean;
}

function emptyForm(token: string): FieldFormState {
  return {
    label: token.replace(/_/g, ' '),
    // Los tokens institucionales (ej. LOGO_URL) se resuelven en backend vía SourceType=System;
    // los demás tokens nuevos se asumen Manual por defecto.
    sourceType: INSTITUTIONAL_TOKENS[token] ? 'System' : 'Manual',
    sourceProperty: '',
    dataType: 'string',
    defaultValue: '',
    isRequired: false,
  };
}

function formFromField(field: DocumentTemplateFieldDto): FieldFormState {
  return {
    label: field.label,
    sourceType: field.sourceType,
    sourceProperty: field.sourceProperty ?? '',
    dataType: field.dataType,
    defaultValue: field.defaultValue ?? '',
    isRequired: field.isRequired,
  };
}

export function TemplateFieldsPanel({ templateId, htmlContent, fields, readOnly, onFieldsChanged }: Props) {
  const { toast } = useToast();
  const [editingToken, setEditingToken] = useState<string | null>(null);
  const [form, setForm] = useState<FieldFormState>(emptyForm(''));

  const detectedTokens = useMemo(() => {
    const matches = Array.from(htmlContent.matchAll(/\{\{([A-Z0-9_]+)\}\}/g));
    return Array.from(new Set(matches.map(m => m[1]))).sort();
  }, [htmlContent]);

  const fieldByName = useMemo(
    () => new Map(fields.map(f => [f.fieldName, f])),
    [fields]
  );

  const tokenStatus = useMemo(() =>
    detectedTokens.map(token => ({ token, field: fieldByName.get(token) })),
    [detectedTokens, fieldByName]
  );

  const undefinedCount = tokenStatus.filter(t => !t.field).length;

  // Campos ya definidos en la plantilla pero que no aparecen en el HTML actual
  // (disponibles para arrastrar e insertar).
  const detectedTokenSet = useMemo(() => new Set(detectedTokens), [detectedTokens]);
  const availableFields = useMemo(
    () => fields.filter(f => !detectedTokenSet.has(f.fieldName)),
    [fields, detectedTokenSet]
  );

  const handleDragStart = (e: DragEvent, token: string) => {
    const text = `{{${token}}}`;
    e.dataTransfer.setData(FIELD_TOKEN_MIME, text);
    e.dataTransfer.setData('text/plain', text);
    e.dataTransfer.effectAllowed = 'copy';
  };

  const saveMutation = useMutation({
    mutationFn: async ({ token, field }: { token: string; field?: DocumentTemplateFieldDto }) => {
      if (field) {
        return DocumentTemplatesAPI.updateField(templateId, field.fieldId, {
          label: form.label,
          sourceType: form.sourceType,
          sourceProperty: form.sourceProperty || null,
          dataType: form.dataType,
          formatPattern: field.formatPattern ?? null,
          defaultValue: form.defaultValue || null,
          isRequired: form.isRequired,
          isEditable: field.isEditable,
          sortOrder: field.sortOrder,
          helpText: field.helpText ?? null,
        });
      }
      return DocumentTemplatesAPI.createField(templateId, {
        fieldName: token,
        label: form.label,
        sourceType: form.sourceType,
        sourceProperty: form.sourceProperty || null,
        dataType: form.dataType,
        formatPattern: null,
        defaultValue: form.defaultValue || null,
        isRequired: form.isRequired,
        isEditable: true,
        sortOrder: fields.length + 1,
        helpText: null,
      });
    },
    onSuccess: () => {
      toast({ title: 'Campo guardado' });
      setEditingToken(null);
      onFieldsChanged();
    },
    onError: (err) => {
      toast({ title: 'Error al guardar el campo', description: parseApiError(err).message, variant: 'destructive' });
    },
  });

  const startEdit = (token: string, field?: DocumentTemplateFieldDto) => {
    setForm(field ? formFromField(field) : emptyForm(token));
    setEditingToken(token);
  };

  return (
    <div className="flex flex-col h-full overflow-auto">
      <div className="px-3 py-2 border-b bg-muted/40 flex items-center gap-2">
        <Tag className="h-4 w-4" />
        <span className="text-sm font-medium">Tokens en plantilla</span>
        {detectedTokens.length > 0 && (
          <Badge variant="outline" className="ml-auto text-xs">
            {detectedTokens.length - undefinedCount}/{detectedTokens.length}
          </Badge>
        )}
      </div>

      {availableFields.length > 0 && (
        <div className="border-b">
          <div className="px-3 py-1.5 bg-muted/20 text-xs font-medium text-muted-foreground">
            Campos disponibles (arrastra al editor)
          </div>
          <div className="p-2 space-y-1">
            {availableFields.map(f => (
              <div
                key={f.fieldId}
                draggable
                onDragStart={e => handleDragStart(e, f.fieldName)}
                className="flex items-center gap-2 p-2 rounded-md border bg-blue-50 border-blue-200 dark:bg-blue-950/40 dark:border-blue-800 text-sm cursor-grab active:cursor-grabbing"
                title="Arrastra este campo hacia el editor HTML"
              >
                <GripVertical className="h-4 w-4 text-blue-500 dark:text-blue-400 shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="font-mono font-medium text-xs">{`{{${f.fieldName}}}`}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {f.label} · {f.sourceType}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {detectedTokens.length === 0 ? (
        <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm p-4 text-center">
          No se detectaron tokens {'{{CAMPO}}'} en el HTML actual.
        </div>
      ) : (
        <div className="p-2 space-y-1">
          {tokenStatus.map(({ token, field }) => {
            const institutionalHint = INSTITUTIONAL_TOKENS[token];

            return (
            <div
              key={token}
              draggable
              onDragStart={e => handleDragStart(e, token)}
              className={`rounded-md border text-sm cursor-grab active:cursor-grabbing ${
                field
                  ? 'bg-green-50 border-green-200 dark:bg-green-950/40 dark:border-green-800'
                  : 'bg-amber-50 border-amber-200 dark:bg-amber-950/40 dark:border-amber-800'
              }`}
            >
              <div className="flex items-start gap-2 p-2">
                <GripVertical className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                {field
                  ? <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0 text-green-600 dark:text-green-400" />
                  : <Circle className="h-4 w-4 text-amber-500 dark:text-amber-400 mt-0.5 shrink-0" />
                }
                <div className="min-w-0 flex-1">
                  <p className="font-mono font-medium text-xs">{`{{${token}}}`}</p>
                  {field ? (
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {field.label} · {field.sourceType}
                      {field.sourceProperty && ` · ${field.sourceProperty}`}
                    </p>
                  ) : (
                    <p className="text-xs text-amber-600 dark:text-amber-400 mt-0.5">Sin campo definido</p>
                  )}
                  {institutionalHint && (
                    <p className="text-xs text-blue-600 dark:text-blue-400 mt-0.5">{institutionalHint}</p>
                  )}
                </div>
                {!readOnly && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-6 px-2 text-xs"
                    onClick={() => startEdit(token, field)}
                  >
                    <Pencil className="h-3 w-3 mr-1" />
                    {field ? 'Editar' : 'Definir'}
                  </Button>
                )}
              </div>

              {editingToken === token && (
                <div className="px-2 pb-2 space-y-2 border-t pt-2">
                  <div>
                    <Label className="text-xs">Etiqueta</Label>
                    <Input
                      className="h-8 text-sm"
                      value={form.label}
                      onChange={e => setForm(f => ({ ...f, label: e.target.value }))}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label className="text-xs">Origen</Label>
                      <Select
                        value={form.sourceType}
                        onValueChange={v => setForm(f => ({ ...f, sourceType: v as FieldSourceType }))}
                      >
                        <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {SOURCE_TYPES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-xs">Tipo de dato</Label>
                      <Select
                        value={form.dataType}
                        onValueChange={v => setForm(f => ({ ...f, dataType: v }))}
                      >
                        <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {DATA_TYPES.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs">Propiedad de origen (opcional)</Label>
                    <Input
                      className="h-8 text-sm"
                      value={form.sourceProperty}
                      onChange={e => setForm(f => ({ ...f, sourceProperty: e.target.value }))}
                      placeholder="Ej: FullName"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Valor por defecto (opcional)</Label>
                    <Input
                      className="h-8 text-sm"
                      value={form.defaultValue}
                      onChange={e => setForm(f => ({ ...f, defaultValue: e.target.value }))}
                      placeholder="Usado si no se puede resolver el valor"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={form.isRequired}
                      onCheckedChange={v => setForm(f => ({ ...f, isRequired: v }))}
                    />
                    <Label className="text-xs">Campo requerido</Label>
                  </div>
                  <div className="flex justify-end gap-2 pt-1">
                    <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setEditingToken(null)}>
                      Cancelar
                    </Button>
                    <Button
                      size="sm"
                      className="h-7 text-xs"
                      disabled={saveMutation.isPending || !form.label.trim()}
                      onClick={() => saveMutation.mutate({ token, field })}
                    >
                      {saveMutation.isPending && <Loader2 className="h-3 w-3 mr-1 animate-spin" />}
                      Guardar
                    </Button>
                  </div>
                </div>
              )}
            </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
