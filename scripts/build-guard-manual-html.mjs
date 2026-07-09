import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const inputPath = path.resolve(process.argv[2] || 'docs/manual-modulo-guardias-turnos-rotativos.md');
const outputPath = path.resolve(process.argv[3] || inputPath.replace(/\.md$/i, '.html'));
const docsDir = path.dirname(inputPath);

function escapeHtml(value) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function inlineCode(value) {
  return value.replace(/`([^`]+)`/g, '<code>$1</code>');
}

function strong(value) {
  return value.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
}

function formatInline(value) {
  return strong(inlineCode(escapeHtml(value)));
}

async function imageToDataUri(relativePath) {
  const absolutePath = path.resolve(docsDir, relativePath);
  const buffer = await readFile(absolutePath);
  return `data:image/png;base64,${buffer.toString('base64')}`;
}

async function markdownToHtml(markdown) {
  const lines = markdown.split(/\r?\n/);
  const html = [];
  let inList = false;

  const closeList = () => {
    if (inList) {
      html.push('</ul>');
      inList = false;
    }
  };

  for (const line of lines) {
    if (!line.trim()) {
      closeList();
      continue;
    }

    const image = line.match(/^!\[([^\]]*)\]\(([^)]+)\)$/);
    if (image) {
      closeList();
      const [, alt, src] = image;
      const dataUri = await imageToDataUri(src);
      html.push(`<figure><img src="${dataUri}" alt="${escapeHtml(alt)}"><figcaption>${escapeHtml(alt)}</figcaption></figure>`);
      continue;
    }

    if (line.startsWith('# ')) {
      closeList();
      html.push(`<h1>${formatInline(line.slice(2))}</h1>`);
      continue;
    }

    if (line.startsWith('## ')) {
      closeList();
      html.push(`<h2>${formatInline(line.slice(3))}</h2>`);
      continue;
    }

    if (line.startsWith('### ')) {
      closeList();
      html.push(`<h3>${formatInline(line.slice(4))}</h3>`);
      continue;
    }

    if (line.startsWith('- ')) {
      if (!inList) {
        html.push('<ul>');
        inList = true;
      }
      html.push(`<li>${formatInline(line.slice(2))}</li>`);
      continue;
    }

    const numbered = line.match(/^\d+\.\s+(.*)$/);
    if (numbered) {
      closeList();
      html.push(`<p class="step">${formatInline(line)}</p>`);
      continue;
    }

    closeList();
    html.push(`<p>${formatInline(line)}</p>`);
  }

  closeList();
  return html.join('\n');
}

const markdown = await readFile(inputPath, 'utf8');
const body = await markdownToHtml(markdown);

const html = `<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Manual de Usuario - Guardias y Turnos Rotativos</title>
  <style>
    :root {
      color: #1f2937;
      background: #f8fafc;
      font-family: Arial, Helvetica, sans-serif;
      line-height: 1.55;
    }
    body {
      margin: 0;
      padding: 32px 18px;
    }
    main {
      max-width: 1040px;
      margin: 0 auto;
      background: #fff;
      border: 1px solid #e5e7eb;
      box-shadow: 0 10px 30px rgba(15, 23, 42, 0.08);
      padding: 42px;
    }
    h1 {
      margin: 0 0 28px;
      font-size: 30px;
      color: #0f172a;
      border-bottom: 3px solid #2563eb;
      padding-bottom: 16px;
    }
    h2 {
      margin: 36px 0 12px;
      font-size: 22px;
      color: #1d4ed8;
      page-break-after: avoid;
    }
    h3 {
      margin: 24px 0 8px;
      font-size: 18px;
      color: #334155;
    }
    p, li {
      font-size: 15px;
    }
    ul {
      margin: 8px 0 18px;
      padding-left: 24px;
    }
    code {
      background: #eef2ff;
      color: #3730a3;
      padding: 2px 5px;
      border-radius: 4px;
      font-size: 13px;
    }
    .step {
      margin: 4px 0;
      padding-left: 12px;
      border-left: 3px solid #dbeafe;
    }
    figure {
      margin: 18px 0 30px;
      page-break-inside: avoid;
    }
    img {
      display: block;
      width: 100%;
      max-width: 100%;
      border: 1px solid #cbd5e1;
      border-radius: 8px;
      box-shadow: 0 6px 16px rgba(15, 23, 42, 0.12);
    }
    figcaption {
      margin-top: 8px;
      font-size: 13px;
      color: #64748b;
      text-align: center;
    }
    @media print {
      body {
        background: #fff;
        padding: 0;
      }
      main {
        border: 0;
        box-shadow: none;
        padding: 0;
      }
      h2 {
        page-break-before: auto;
      }
    }
  </style>
</head>
<body>
  <main>
${body}
  </main>
</body>
</html>
`;

await writeFile(outputPath, html, 'utf8');
console.log(`Manual HTML generado: ${outputPath}`);
