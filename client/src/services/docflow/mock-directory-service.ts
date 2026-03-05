import type {
  DirectoryParameter,
  DirectoryType,
  DirectoryFilter,
  IDirectoryParametersService,
} from "@/types/docflow/directory.types";

const DIRECTORY_DATA: Record<DirectoryType, DirectoryParameter[]> = {
  document_type: [
    { id: 1, code: "DNI", label: "Documento de Identidad", isActive: true, sortOrder: 1, description: "Cedula o documento oficial de identidad" },
    { id: 2, code: "CONTRATO", label: "Contrato", isActive: true, sortOrder: 2, description: "Documento contractual firmado" },
    { id: 3, code: "FACTURA", label: "Factura", isActive: true, sortOrder: 3, description: "Factura comercial o de servicio" },
    { id: 4, code: "COTIZACION", label: "Cotizacion", isActive: true, sortOrder: 4, description: "Propuesta economica o cotizacion" },
    { id: 5, code: "ACTA", label: "Acta", isActive: true, sortOrder: 5, description: "Acta de reunion o acuerdo" },
    { id: 6, code: "INFORME", label: "Informe Tecnico", isActive: true, sortOrder: 6, description: "Documento de analisis tecnico" },
    { id: 7, code: "MEMO", label: "Memorando", isActive: true, sortOrder: 7, description: "Comunicacion interna" },
    { id: 8, code: "RESOLUCION", label: "Resolucion", isActive: true, sortOrder: 8, description: "Resolucion administrativa" },
    { id: 9, code: "CERTIFICADO", label: "Certificado", isActive: true, sortOrder: 9, description: "Certificacion o constancia" },
    { id: 10, code: "OTRO", label: "Otro", isActive: true, sortOrder: 99, description: "Documento no clasificado" },
    { id: 11, code: "PLANILLA", label: "Planilla de Pago", isActive: false, sortOrder: 10, description: "Planilla de pagos (descontinuado)" },
  ],
  instance_statuses: [
    { id: 1, code: "Borrador", label: "Borrador", isActive: true, sortOrder: 1, description: "Expediente en preparacion", metadata: { color: "muted" } },
    { id: 2, code: "Pendiente", label: "Pendiente", isActive: true, sortOrder: 2, description: "Esperando revision", metadata: { color: "yellow" } },
    { id: 3, code: "En Revision", label: "En Revision", isActive: true, sortOrder: 3, description: "En proceso de revision", metadata: { color: "blue" } },
    { id: 4, code: "Aprobado", label: "Aprobado", isActive: true, sortOrder: 4, description: "Aprobado y validado", metadata: { color: "green" } },
    { id: 5, code: "Retornado", label: "Retornado", isActive: true, sortOrder: 5, description: "Devuelto para correccion", metadata: { color: "red" } },
    { id: 6, code: "Finalizado", label: "Finalizado", isActive: true, sortOrder: 6, description: "Proceso completado", metadata: { color: "purple" } },
  ],
  movement_types: [
    { id: 1, code: "FORWARD", label: "Avance", isActive: true, sortOrder: 1, description: "Avanzar al siguiente estado" },
    { id: 2, code: "RETURN", label: "Retorno", isActive: true, sortOrder: 2, description: "Devolver al estado anterior" },
  ],
  areas: [
    { id: 1, code: "CONT", label: "Contabilidad", isActive: true, sortOrder: 1, description: "Departamento de contabilidad y finanzas" },
    { id: 2, code: "RRHH", label: "Recursos Humanos", isActive: true, sortOrder: 2, description: "Gestion de personal y talento" },
    { id: 3, code: "COMP", label: "Compras", isActive: true, sortOrder: 3, description: "Adquisiciones y logistica" },
    { id: 4, code: "LEGAL", label: "Legal", isActive: true, sortOrder: 4, description: "Asesoria juridica" },
    { id: 5, code: "TI", label: "Tecnologia", isActive: true, sortOrder: 5, description: "Sistemas y tecnologia de informacion" },
    { id: 6, code: "GER", label: "Gerencia General", isActive: true, sortOrder: 6, description: "Direccion ejecutiva" },
  ],
  priorities: [
    { id: 1, code: "BAJA", label: "Baja", isActive: true, sortOrder: 1, metadata: { color: "muted" } },
    { id: 2, code: "NORMAL", label: "Normal", isActive: true, sortOrder: 2, metadata: { color: "blue" } },
    { id: 3, code: "ALTA", label: "Alta", isActive: true, sortOrder: 3, metadata: { color: "yellow" } },
    { id: 4, code: "URGENTE", label: "Urgente", isActive: true, sortOrder: 4, metadata: { color: "red" } },
  ],
  users: [
    { id: 1, code: "jgarcia", label: "Juan Garcia Lopez", isActive: true, sortOrder: 1, metadata: { email: "juan.garcia@empresa.com", area: "CONT" } },
    { id: 2, code: "mrodriguez", label: "Maria Rodriguez Perez", isActive: true, sortOrder: 2, metadata: { email: "maria.rodriguez@empresa.com", area: "RRHH" } },
    { id: 3, code: "clopez", label: "Carlos Lopez Martinez", isActive: true, sortOrder: 3, metadata: { email: "carlos.lopez@empresa.com", area: "COMP" } },
    { id: 4, code: "amorales", label: "Ana Morales Ruiz", isActive: true, sortOrder: 4, metadata: { email: "ana.morales@empresa.com", area: "LEGAL" } },
    { id: 5, code: "pfernandez", label: "Pedro Fernandez Diaz", isActive: true, sortOrder: 5, metadata: { email: "pedro.fernandez@empresa.com", area: "TI" } },
    { id: 6, code: "linactivo", label: "Luis Inactivo", isActive: false, sortOrder: 6, metadata: { email: "luis@empresa.com", area: "CONT" } },
  ],
  // processes: [
  //   { id: 1, code: "CONT", label: "Contabilidad", isActive: true, sortOrder: 1 },
  //   { id: 2, code: "CONT-FAC", label: "Facturacion", isActive: true, sortOrder: 2, parentId: 1 },
  //   { id: 3, code: "CONT-PAG", label: "Cuentas por Pagar", isActive: true, sortOrder: 3, parentId: 1 },
  //   { id: 4, code: "RRHH", label: "Recursos Humanos", isActive: true, sortOrder: 4 },
  //   { id: 5, code: "RRHH-CONT", label: "Contratacion", isActive: true, sortOrder: 5, parentId: 4 },
  //   { id: 6, code: "RRHH-NOM", label: "Nomina", isActive: true, sortOrder: 6, parentId: 4 },
  //   { id: 7, code: "COMP", label: "Compras", isActive: true, sortOrder: 7 },
  //   { id: 8, code: "COMP-ORD", label: "Ordenes de Compra", isActive: true, sortOrder: 8, parentId: 7 },
  //   { id: 9, code: "COMP-LIC", label: "Licitaciones", isActive: true, sortOrder: 9, parentId: 7 },
  // ],
};

export class MockDirectoryParametersService implements IDirectoryParametersService {
  getParameters(type: DirectoryType, filter?: DirectoryFilter): DirectoryParameter[] {
    const params = DIRECTORY_DATA[type] || [];
    let result = [...params];

    if (filter?.isActive !== undefined) {
      result = result.filter((p) => p.isActive === filter.isActive);
    }

    if (filter?.parentId !== undefined) {
      result = result.filter((p) => p.parentId === filter.parentId);
    }

    if (filter?.search) {
      const q = filter.search.toLowerCase();
      result = result.filter(
        (p) =>
          p.label.toLowerCase().includes(q) ||
          p.code.toLowerCase().includes(q) ||
          p.description?.toLowerCase().includes(q)
      );
    }

    return result.sort((a, b) => a.sortOrder - b.sortOrder);
  }

  getParameterById(type: DirectoryType, id: number | string): DirectoryParameter | undefined {
    const params = DIRECTORY_DATA[type] || [];
    return params.find((p) => p.id === id);
  }

  getParameterByCode(type: DirectoryType, code: string): DirectoryParameter | undefined {
    const params = DIRECTORY_DATA[type] || [];
    return params.find((p) => p.code === code);
  }
}
