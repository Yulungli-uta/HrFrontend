// Abre la vista previa (PDF) de un archivo firmado que el backend lee del servidor de archivos.
import { useCallback, useState } from 'react';
import type { ApiResponse } from '@/lib/api/core/fetch';
import { useToast } from '@/hooks/use-toast';

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error ?? new Error('No se pudo leer el archivo.'));
    reader.readAsDataURL(blob);
  });
}

export function useSignedFilePreview(fetchFile: (id: number) => Promise<ApiResponse<Blob>>) {
  const { toast } = useToast();
  const [loadingId, setLoadingId] = useState<number | null>(null);
  const [preview, setPreview] = useState<{ base64: string; title: string } | null>(null);

  const open = useCallback(
    async (id: number, title: string) => {
      setLoadingId(id);
      try {
        const res = await fetchFile(id);
        if (res.status === 'error') {
          toast({ title: 'No se pudo abrir el archivo', description: res.error.message, variant: 'destructive' });
          return;
        }
        setPreview({ base64: await blobToBase64(res.data), title });
      } catch (e) {
        toast({
          title: 'No se pudo abrir el archivo',
          description: e instanceof Error ? e.message : 'Error inesperado.',
          variant: 'destructive',
        });
      } finally {
        setLoadingId(null);
      }
    },
    [fetchFile, toast]
  );

  const close = useCallback(() => setPreview(null), []);

  return { open, close, loadingId, preview };
}
