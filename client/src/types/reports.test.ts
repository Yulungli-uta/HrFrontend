import { describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/clock', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/clock')>();
  return { ...actual, todayEcuador: () => '2026-11-09' };
});

import { getReportFileName } from './reports';

describe('getReportFileName', () => {
  it('SIIES con rango de fechas incluye el rango en el nombre', () => {
    expect(
      getReportFileName('siies-funcionarios', 'csv', { startDate: '2025-03-01', endDate: '2026-01-31' }),
    ).toBe('reporte-siies-funcionarios_20250301_20260131-2026-11-09.csv');
  });

  it('SIIES con período académico incluye el código del período', () => {
    expect(getReportFileName('siies-profesores', 'csv', { periodCode: '2025 II/B' })).toBe(
      'reporte-siies-profesores_periodo-2025-II-B-2026-11-09.csv',
    );
  });

  it('SIIES sin rango ni período conserva el nombre de siempre', () => {
    expect(getReportFileName('siies-formacion-profesional', 'csv', {})).toBe(
      'reporte-siies-formacion-profesional-2026-11-09.csv',
    );
  });

  it('los reportes que no son SIIES no cambian de nombre', () => {
    expect(getReportFileName('lateness', 'pdf', { startDate: '2025-03-01', endDate: '2026-01-31' })).toBe(
      'reporte-lateness-2026-11-09.pdf',
    );
  });

  it('sin filtro conserva el nombre de siempre', () => {
    expect(getReportFileName('siies-funcionarios', 'pdf')).toBe('reporte-siies-funcionarios-2026-11-09.pdf');
  });
});
