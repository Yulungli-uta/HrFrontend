# Sistema de Reportes - Frontend

## 📋 Descripción

Sistema completo y genérico de reportes para la Universidad Técnica de Ambato. Implementado con React 18 + TypeScript siguiendo principios SOLID y buenas prácticas.

---

## 🎯 Características

- ✅ **100% Genérico y Reutilizable** - Agregar un nuevo reporte toma 5 minutos
- ✅ **Preview de PDF** - Ver reportes antes de descargar
- ✅ **Descarga Directa** - PDF y Excel con un click
- ✅ **Filtros Dinámicos** - Configurables por tipo de reporte
- ✅ **Auditoría Completa** - Historial de reportes generados
- ✅ **Loading States** - Indicadores de carga en todos los botones
- ✅ **Manejo de Errores** - Toasts informativos
- ✅ **Responsive** - Mobile-friendly
- ✅ **TypeScript** - Tipado estricto 100%

---

## 📁 Estructura de Archivos

```
src/
├── types/
│   └── reports.ts                      # Tipos TypeScript y configuraciones
├── lib/api/
│   └── reports.ts                      # Servicio API genérico
├── hooks/
│   └── useReport.ts                    # Hook personalizado
├── components/reports/
│   ├── ReportFilters.tsx               # Filtros reutilizables
│   ├── ReportActions.tsx               # Botones de acción
│   └── PdfPreviewModal.tsx             # Modal de preview
└── pages/reports/
    ├── ReportPage.tsx                  # Componente base genérico
    ├── EmployeesReport.tsx             # Reporte de empleados
    ├── AttendanceReport.tsx            # Reporte de asistencia
    ├── DepartmentsReport.tsx           # Reporte de departamentos
    └── ReportAudit.tsx                 # Auditoría de reportes
```

---

## 🚀 Uso Básico

### **1. Hook useReport**

```typescript
import { useReport } from '@/hooks/useReport';

function MiComponente() {
  const { download, preview, isDownloading, isPreviewing, previewData } = useReport();
  
  // Preview
  await preview({ type: 'employees', format: 'pdf', filter: {...} });
  
  // Descargar PDF
  await download({ type: 'employees', format: 'pdf', filter: {...} });
  
  // Descargar Excel
  await download({ type: 'employees', format: 'excel', filter: {...} });
}
```

### **2. Servicio API Genérico**

```typescript
import reportService from '@/lib/api/reports';

// Preview
const response = await reportService.preview('employees', filter);

// Descarga
const blob = await reportService.download('employees', 'pdf', filter);

// Auditoría
const audits = await reportService.getAudits();
```

### **3. Componentes Reutilizables**

```typescript
import { ReportFilters } from '@/components/reports/ReportFilters';
import { ReportActions } from '@/components/reports/ReportActions';
import { PdfPreviewModal } from '@/components/reports/PdfPreviewModal';

function MiReporte() {
  const [filter, setFilter] = useState({});
  const { previewData, closePreview } = useReport();
  
  return (
    <>
      <ReportFilters reportType="employees" onFilterChange={setFilter} />
      <ReportActions reportType="employees" filter={filter} />
      <PdfPreviewModal 
        isOpen={!!previewData}
        onClose={closePreview}
        base64Data={previewData}
        reportName="Mi Reporte"
      />
    </>
  );
}
```

---

## ➕ Cómo Agregar un Nuevo Reporte

### **Paso 1: Agregar Tipo** (30 segundos)

En `types/reports.ts`:

```typescript
export type ReportType = 'employees' | 'attendance' | 'departments' | 'nuevoreporte';
```

### **Paso 2: Agregar Configuración** (2 minutos)

En `types/reports.ts`:

```typescript
export const REPORT_CONFIGS: Record<ReportType, ReportConfig> = {
  // ... reportes existentes
  nuevoreporte: {
    type: 'nuevoreporte',
    title: 'Reporte de Nuevo',
    description: 'Descripción del nuevo reporte',
    icon: 'FileText',
    availableFormats: ['pdf', 'excel'],
    availableFilters: ['startDate', 'endDate', 'departmentId']
  }
};
```

### **Paso 3: Crear Página** (1 minuto)

Crear `pages/reports/NuevoReport.tsx`:

```typescript
import { ReportPage } from './ReportPage';

export function NuevoReport() {
  return <ReportPage reportType="nuevoreporte" />;
}

export default NuevoReport;
```

### **Paso 4: Agregar Ruta** (30 segundos)

En `App.tsx`:

```typescript
import NuevoReportPage from "@/pages/reports/NuevoReport";

// En las rutas:
<Route path="/reports/nuevo" component={NuevoReportPage} />
```

### **¡Listo!** ✅

El nuevo reporte funciona automáticamente con:
- Preview de PDF
- Descarga de PDF y Excel
- Filtros configurados
- Auditoría
- Loading states
- Manejo de errores

**Total: ~4 minutos**

---

## 🎨 Personalización

### **Cambiar Colores**

Los componentes usan las clases de Tailwind CSS. Puedes personalizar en `tailwind.config.js`.

### **Agregar Filtros Personalizados**

1. Agregar el filtro en `ReportFilter` interface
2. Agregarlo en `availableFilters` de la configuración
3. El componente `ReportFilters` lo mostrará automáticamente

### **Personalizar Modal de Preview**

Editar `PdfPreviewModal.tsx` para agregar funcionalidades como:
- Imprimir
- Compartir
- Anotaciones

---

## 🔧 Configuración

### **URL del Backend**

El servicio API usa `apiClient` de `lib/api/client.ts`. Asegúrate de que la URL base esté configurada correctamente.

### **Formatos de Fecha**

Los componentes usan `date-fns` para formatear fechas. Puedes cambiar el formato en:

```typescript
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

format(date, 'dd/MM/yyyy', { locale: es });
```

---

## 📊 Tipos de Reportes Disponibles

| Reporte | Descripción | Filtros | Formatos |
|---------|-------------|---------|----------|
| **Empleados** | Información completa de empleados | Fecha, Departamento, Facultad, Tipo, Estado | PDF, Excel |
| **Asistencia** | Registros de entrada/salida | Fecha, Empleado, Departamento, Facultad | PDF, Excel |
| **Departamentos** | Estadísticas por departamento | Facultad, Incluir Inactivos | PDF, Excel |

---

## 🧪 Testing

### **Probar Preview**

```typescript
const { preview } = useReport();
await preview({ type: 'employees', format: 'pdf' });
```

### **Probar Descarga**

```typescript
const { download } = useReport();
await download({ type: 'employees', format: 'pdf' });
```

### **Probar con Filtros**

```typescript
const filter = {
  startDate: '2024-01-01',
  endDate: '2024-12-31',
  departmentId: 1
};

await download({ type: 'employees', format: 'pdf', filter });
```

---

## 🐛 Troubleshooting

### **Preview no se muestra**

- Verificar que el backend retorne Base64 válido
- Verificar que `previewData` no sea null
- Abrir DevTools y revisar errores en consola

### **Descarga no funciona**

- Verificar que el backend retorne un Blob
- Verificar que `responseType: 'blob'` esté configurado
- Revisar permisos de descarga en el navegador

### **Filtros no aparecen**

- Verificar que el filtro esté en `availableFilters` de la configuración
- Verificar que el filtro esté en la interfaz `ReportFilter`

---

## 📚 Recursos

- [QuestPDF Documentation](https://www.questpdf.com/)
- [ClosedXML Documentation](https://closedxml.readthedocs.io/)
- [React Query](https://tanstack.com/query/latest)
- [Tailwind CSS](https://tailwindcss.com/)

---

## 👥 Soporte

Para preguntas o problemas, contactar al equipo de desarrollo de la Universidad Técnica de Ambato.

---

## 📝 Licencia

© 2024 Universidad Técnica de Ambato. Todos los derechos reservados.
