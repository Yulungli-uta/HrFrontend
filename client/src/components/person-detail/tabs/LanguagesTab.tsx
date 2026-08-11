import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ActionIconButton } from "@/components/ui/action-icon-button";
import { Badge } from "@/components/ui/badge";
import { Languages as LanguagesIcon, Plus, Edit, Trash2, Calendar, FileText, ChevronDown, ChevronUp } from "lucide-react";
import { Language } from "@/types/person";
import { ReusableDocumentManager } from "@/components/ReusableDocumentManager";
import { LANGUAGE_CERTIFICATION_DIRECTORY_CODE, LANGUAGE_CERTIFICATION_ENTITY_TYPE } from "@/features/constants";

interface LanguagesTabProps {
  languages: Language[];
  onEdit: (type: string, item: any) => void;
  onDelete: (id: number) => void;
  /** Mapa id → nombre para resolver languageTypeId/levelTypeId */
  refTypesMap?: Record<number, string>;
  /** Identificación de la persona — agrupa su expediente completo en una sola carpeta. */
  personIdCard?: string;
}

export function LanguagesTab({ languages, onEdit, onDelete, refTypesMap = {}, personIdCard }: LanguagesTabProps) {
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const formatDate = (dateString?: string) => {
    if (!dateString) return "No especificada";
    return new Date(dateString).toLocaleDateString("es-EC", { year: "numeric", month: "long", day: "2-digit" });
  };

  const resolveRefType = (id: number | string | null | undefined): string | null => {
    if (id == null || id === "") return null;
    const n = Number(id);
    if (!isNaN(n) && n > 0) return refTypesMap[n] ?? null;
    return String(id);
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center text-lg">
          <LanguagesIcon className="mr-2 h-5 w-5" />
          Idiomas
          <Badge variant="outline" className="ml-2">
            {languages.length}
          </Badge>
        </CardTitle>
        <Button size="sm" className="bg-primary hover:bg-primary/90" onClick={() => onEdit("language", null)}>
          <Plus className="mr-2 h-4 w-4" />
          Nuevo Idioma
        </Button>
      </CardHeader>

      <CardContent>
        {languages.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <LanguagesIcon className="mx-auto h-12 w-12 mb-3 opacity-50" />
            <p className="text-base mb-1">No hay certificaciones de idioma registradas</p>
            <p className="text-sm">Agrega la primera certificación haciendo clic en el botón "Nuevo Idioma"</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[...languages]
              .sort((a, b) => new Date(b.issueDate).getTime() - new Date(a.issueDate).getTime())
              .map((language) => {
                const languageName = resolveRefType(language.languageTypeId) ?? "Idioma";
                const levelName = resolveRefType(language.levelTypeId) ?? "";
                const isExpanded = expandedId === language.languageId;

                return (
                  <Card key={language.languageId} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex flex-col h-full">
                        <div className="flex items-start justify-between mb-3 gap-2">
                          <div className="flex-1 min-w-0">
                            <h4 className="font-semibold text-foreground text-base leading-tight mb-1">
                              {languageName}
                            </h4>
                            <p className="text-muted-foreground text-sm truncate">
                              {language.certifyingInstitution || "Institución no especificada"}
                            </p>
                          </div>

                          <div className="flex gap-1 shrink-0">
                            <ActionIconButton
                              icon={Edit}
                              label="Editar idioma"
                              tone="primary"
                              onClick={() => onEdit("language", language)}
                              touch
                            />
                            <ActionIconButton
                              icon={Trash2}
                              label="Eliminar idioma"
                              tone="destructive"
                              onClick={() => onDelete(language.languageId)}
                              touch
                            />
                          </div>
                        </div>

                        <div className="space-y-2 text-sm text-muted-foreground flex-1">
                          <div className="flex flex-wrap gap-2">
                            {levelName && (
                              <Badge variant="secondary" className="text-xs">
                                {levelName} · {language.referenceFramework ?? "CEFR"}
                              </Badge>
                            )}
                          </div>

                          <div className="grid grid-cols-2 gap-2 text-xs">
                            <div className="flex items-center gap-1">
                              <Calendar className="h-3.5 w-3.5 text-muted-foreground/70 shrink-0" />
                              <span>
                                <strong>Emisión:</strong> {formatDate(language.issueDate)}
                              </span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Calendar className="h-3.5 w-3.5 text-muted-foreground/70 shrink-0" />
                              <span>
                                <strong>Expira:</strong>{" "}
                                {language.expirationDate ? formatDate(language.expirationDate) : "No expira"}
                              </span>
                            </div>
                          </div>
                        </div>

                        <Button
                          variant="ghost"
                          size="sm"
                          className="mt-3 self-start text-xs"
                          onClick={() => setExpandedId(isExpanded ? null : language.languageId)}
                        >
                          <FileText className="h-3.5 w-3.5 mr-1" />
                          Documento de soporte
                          {isExpanded ? <ChevronUp className="h-3.5 w-3.5 ml-1" /> : <ChevronDown className="h-3.5 w-3.5 ml-1" />}
                        </Button>

                        {isExpanded && (
                          <div className="mt-2">
                            <ReusableDocumentManager
                              directoryCode={LANGUAGE_CERTIFICATION_DIRECTORY_CODE}
                              entityType={LANGUAGE_CERTIFICATION_ENTITY_TYPE}
                              entityId={language.languageId}
                              relativePath={personIdCard ? `${personIdCard}/${LANGUAGE_CERTIFICATION_ENTITY_TYPE.toLowerCase()}` : undefined}
                              accept=".pdf"
                              maxSizeMB={10}
                              label="Certificado de idioma"
                              entityReady={true}
                              allowReplace
                            />
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
