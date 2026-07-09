// src/components/templateEditor/HtmlCodeEditor.tsx
import { useRef } from 'react';
import Editor from '@monaco-editor/react';
import type { editor } from 'monaco-editor';
import { useTheme } from '@/components/ThemeProvider';

interface Props {
  value: string;
  onChange: (value: string) => void;
  height?: string | number;
  readOnly?: boolean;
}

/** Token DnD MIME type usado por TemplateFieldsPanel para arrastrar campos al editor. */
export const FIELD_TOKEN_MIME = 'application/x-template-field-token';

export function HtmlCodeEditor({ value, onChange, height = '100%', readOnly = false }: Props) {
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);
  const { theme } = useTheme();
  const isDark = theme === 'dark'
    || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);

  const handleChange = (val: string | undefined) => {
    if (!readOnly) onChange(val ?? '');
  };

  const handleMount = (ed: editor.IStandaloneCodeEditor) => {
    editorRef.current = ed;
    ed.updateOptions({
      wordWrap: 'on',
      minimap: { enabled: false },
      fontSize: 13,
      lineNumbers: 'on',
      folding: true,
      readOnly,
    });

    const domNode = ed.getDomNode();
    if (!domNode) return;

    domNode.addEventListener('dragover', (e) => {
      e.preventDefault();
    });

    domNode.addEventListener('drop', (e) => {
      e.preventDefault();
      if (readOnly) return;
      const token = e.dataTransfer?.getData(FIELD_TOKEN_MIME) || e.dataTransfer?.getData('text/plain');
      if (!token) return;

      const target = ed.getTargetAtClientPoint(e.clientX, e.clientY);
      const position = target?.position ?? ed.getPosition();
      if (!position) return;

      ed.executeEdits('drop-field-token', [{
        range: {
          startLineNumber: position.lineNumber,
          startColumn: position.column,
          endLineNumber: position.lineNumber,
          endColumn: position.column,
        },
        text: token,
      }]);
      ed.focus();
    });
  };

  return (
    <Editor
      height={height}
      defaultLanguage="html"
      value={value}
      onChange={handleChange}
      onMount={handleMount}
      theme={isDark ? 'vs-dark' : 'vs'}
      options={{
        automaticLayout: true,
        tabSize: 2,
        insertSpaces: true,
        formatOnPaste: true,
        readOnly,
      }}
    />
  );
}
