/**
 * Componente Genérico de Filtros de Reportes
 * Universidad Técnica de Ambato
 * 
 * Componente completamente reutilizable que muestra solo los filtros
 * configurados para cada tipo de reporte en REPORT_CONFIGS.
 */

import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Filter } from 'lucide-react';
import type { ReportFilter, ReportType } from '@/types/reports';
import { REPORT_CONFIGS } from '@/types/reports';

// ============================================
// Props
// ============================================

interface ReportFiltersProps {
  reportType: ReportType;
  onFilterChange: (filter: ReportFilter) => void;
  initialFilter?: ReportFilter;
}

// ============================================
// Componente Principal
// ============================================

export function ReportFilters({ reportType, onFilterChange, initialFilter = {} }: ReportFiltersProps) {
  const [filter, setFilter] = useState<ReportFilter>(initialFilter);
  const reportConfig = REPORT_CONFIGS[reportType];
  const availableFilters = reportConfig.availableFilters;

  // Notificar cambios al padre
  useEffect(() => {
    onFilterChange(filter);
  }, [filter, onFilterChange]);

  const handleChange = (key: keyof ReportFilter, value: any) => {
    setFilter(prev => ({
      ...prev,
      [key]: value === '' ? undefined : value
    }));
  };

  const shouldShowFilter = (filterKey: keyof ReportFilter): boolean => {
    return availableFilters.includes(filterKey);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Filter className="h-5 w-5" />
          Filtros de Búsqueda
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          
          {/* Fecha Inicio */}
          {shouldShowFilter('startDate') && (
            <div className="space-y-2">
              <Label htmlFor="startDate">Fecha Inicio</Label>
              <Input
                id="startDate"
                type="date"
                value={filter.startDate || ''}
                onChange={(e) => handleChange('startDate', e.target.value)}
              />
            </div>
          )}

          {/* Fecha Fin */}
          {shouldShowFilter('endDate') && (
            <div className="space-y-2">
              <Label htmlFor="endDate">Fecha Fin</Label>
              <Input
                id="endDate"
                type="date"
                value={filter.endDate || ''}
                onChange={(e) => handleChange('endDate', e.target.value)}
              />
            </div>
          )}

          {/* Departamento */}
          {shouldShowFilter('departmentId') && (
            <div className="space-y-2">
              <Label htmlFor="departmentId">Departamento</Label>
              <Select
                value={filter.departmentId?.toString() || ''}
                onValueChange={(value) => handleChange('departmentId', value ? Number(value) : undefined)}
              >
                <SelectTrigger id="departmentId">
                  <SelectValue placeholder="Todos los departamentos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Todos</SelectItem>
                  {/* TODO: Cargar departamentos dinámicamente */}
                  <SelectItem value="1">Recursos Humanos</SelectItem>
                  <SelectItem value="2">Tecnología</SelectItem>
                  <SelectItem value="3">Administración</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Facultad */}
          {shouldShowFilter('facultyId') && (
            <div className="space-y-2">
              <Label htmlFor="facultyId">Facultad</Label>
              <Select
                value={filter.facultyId?.toString() || ''}
                onValueChange={(value) => handleChange('facultyId', value ? Number(value) : undefined)}
              >
                <SelectTrigger id="facultyId">
                  <SelectValue placeholder="Todas las facultades" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Todas</SelectItem>
                  {/* TODO: Cargar facultades dinámicamente */}
                  <SelectItem value="1">Ingeniería</SelectItem>
                  <SelectItem value="2">Ciencias Administrativas</SelectItem>
                  <SelectItem value="3">Ciencias de la Salud</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Empleado */}
          {shouldShowFilter('employeeId') && (
            <div className="space-y-2">
              <Label htmlFor="employeeId">ID Empleado</Label>
              <Input
                id="employeeId"
                type="number"
                placeholder="ID del empleado"
                value={filter.employeeId || ''}
                onChange={(e) => handleChange('employeeId', e.target.value ? Number(e.target.value) : undefined)}
              />
            </div>
          )}

          {/* Tipo de Empleado */}
          {shouldShowFilter('employeeType') && (
            <div className="space-y-2">
              <Label htmlFor="employeeType">Tipo de Empleado</Label>
              <Select
                value={filter.employeeType || ''}
                onValueChange={(value) => handleChange('employeeType', value || undefined)}
              >
                <SelectTrigger id="employeeType">
                  <SelectValue placeholder="Todos los tipos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Todos</SelectItem>
                  <SelectItem value="Docente">Docente</SelectItem>
                  <SelectItem value="Administrativo">Administrativo</SelectItem>
                  <SelectItem value="Servicio">Servicio</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Estado Activo */}
          {shouldShowFilter('isActive') && (
            <div className="space-y-2">
              <Label htmlFor="isActive">Estado</Label>
              <Select
                value={filter.isActive === undefined ? '' : filter.isActive.toString()}
                onValueChange={(value) => handleChange('isActive', value === '' ? undefined : value === 'true')}
              >
                <SelectTrigger id="isActive">
                  <SelectValue placeholder="Todos los estados" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Todos</SelectItem>
                  <SelectItem value="true">Activos</SelectItem>
                  <SelectItem value="false">Inactivos</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Incluir Inactivos */}
          {shouldShowFilter('includeInactive') && (
            <div className="space-y-2">
              <Label htmlFor="includeInactive">Incluir Inactivos</Label>
              <Select
                value={filter.includeInactive === undefined ? '' : filter.includeInactive.toString()}
                onValueChange={(value) => handleChange('includeInactive', value === '' ? undefined : value === 'true')}
              >
                <SelectTrigger id="includeInactive">
                  <SelectValue placeholder="Solo activos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="false">Solo Activos</SelectItem>
                  <SelectItem value="true">Incluir Inactivos</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

        </div>
      </CardContent>
    </Card>
  );
}

export default ReportFilters;
