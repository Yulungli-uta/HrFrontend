// Guardia de estándares de estilo y responsividad. Uso: node scripts/check-styles.mjs [--strict]
// Falla (código 1) si aparece alguno de estos patrones, que rompen el tema UTA o la vista móvil:
//  1. Clases de paleta Tailwind sueltas (bg-green-100, text-blue-600…): usar tokens (bg-success/10, text-primary…).
//  2. Colores hexadecimales o rgb() en archivos .tsx (los datos elegidos por el usuario se declaran en ALLOW).
//  3. TabsList con grid-cols-N sin variante móvil, y TableCell con `flex` directo.
//  4. Botón de solo icono (size icon/iconSm/iconTouch) sin descripción: debe llevar aria-label, title o tooltip (o usar <RowAction>/<ActionIconButton>).
// Ver src/styles/brand.css (identidad) y src/styles/semantic.css (tokens).
import fs from 'node:fs'; import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '../src');
const HUES = 'blue|red|indigo|slate|sky|cyan|gray|green|emerald|amber|yellow|orange|purple|violet|rose|pink|teal|zinc|neutral|stone|lime|fuchsia';
const RULES = [
  { id: 'paleta', re: new RegExp(String.raw`(?<![\w-])(?:bg|text|border|ring|from|to|via|fill|stroke|divide|outline)-(?:${HUES})-\d{2,3}(?![\w-])`, 'g'), msg: 'Clase de paleta suelta: usar tokens semánticos (success, warning, destructive, primary, info, muted, cat-N).' },
  { id: 'hex', re: /#[0-9a-fA-F]{6}\b/g, msg: 'Color hexadecimal: usar var(--token) o una clase semántica.' },
  { id: 'tabs-grid', re: /<TabsList[^>]*className="(?![^"]*max-sm:flex)[^"]*grid-cols-\d/g, msg: 'TabsList con rejilla fija: agregar max-sm:flex max-sm:justify-start.' },
  { id: 'icono-sin-etiqueta', re: /$^/g, msg: 'Botón de solo icono sin descripción: agregar aria-label o usar <RowAction>.' },
  { id: 'cell-flex', re: /<TableCell className="[^"]*\bflex\b/g, msg: 'TableCell con flex: envolver el contenido en un <div>.' },
];
// Excepciones justificadas: archivo -> reglas permitidas.
const ALLOW = {
  'components/templateEditor/TemplatePreviewPanel.tsx': ['hex'], // vista previa de papel: siempre blanco
  'pages/guards/GuardShiftPlanning.tsx': ['hex'],                // colores de grupo elegidos por el usuario
  'pages/guards/GuardRotationGroups.tsx': ['hex'],               // selector de color de grupo
};
function walk(p, acc) {
  for (const f of fs.readdirSync(p)) {
    const q = path.join(p, f);
    if (fs.statSync(q).isDirectory()) { if (f !== 'node_modules' && f !== 'styles') walk(q, acc); }
    else if (q.endsWith('.tsx')) acc.push(q);
  }
  return acc;
}
const BUTTON = /<Button((?:[^>"'{}]|"[^"]*"|'[^']*'|\{(?:[^{}]|\{[^{}]*\})*\})*)>/g;
const found = {};
for (const file of walk(ROOT, [])) {
  const rel = path.relative(ROOT, file).split(path.sep).join('/');
  const src = fs.readFileSync(file, 'utf8');
  for (const r of RULES) {
    if ((ALLOW[rel] || []).includes(r.id)) continue;
    const n = (src.match(r.re) || []).length;
    if (n) (found[r.id] ||= []).push(`${rel} (${n})`);
  }
  if (!rel.includes('components/ui/')) {
    let n = 0;
    for (const m of src.matchAll(BUTTON)) if (/size="(icon|iconSm|iconTouch)"/.test(m[1]) && !/aria-label|title=|tooltip=/.test(m[1])) n++;
    if (n) (found['icono-sin-etiqueta'] ||= []).push(`${rel} (${n})`);
  }
}
let bad = 0;
for (const r of RULES) {
  const list = found[r.id] || [];
  bad += list.length;
  console.log(`${list.length ? '✗' : '✓'} ${r.id}: ${list.length} archivo(s)`);
  if (list.length) { console.log(`  ${r.msg}`); list.slice(0, 15).forEach(x => console.log('   - ' + x)); }
}
process.exit(bad ? 1 : 0);
