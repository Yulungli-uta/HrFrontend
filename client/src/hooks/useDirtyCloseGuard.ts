import { useCallback, useEffect, useMemo, useState, type MouseEvent } from 'react';

/**
 * Evita perder datos al cerrar un formulario en diálogo (X, Esc o clic fuera): si el usuario
 * ya modificó algún campo, pide confirmación antes de cerrar. Llamar `touch()` desde el setter
 * de campos; la edición inicial del formulario (al abrir) no cuenta como cambio.
 * Alternativa sin tocar cada campo: `{...guard.dirtyProps}` sobre el DialogContent detecta escritura, cambios de
 * select y clics en interruptores/casillas. Úsese junto con `UnsavedChangesDialog`.
 */
export function useDirtyCloseGuard(open: boolean, onClose: () => void) {
  const [dirty, setDirty] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  useEffect(() => {
    if (open) {
      setDirty(false);
      setConfirmOpen(false);
    }
  }, [open]);

  const touch = useCallback(() => setDirty(true), []);
  const requestClose = useCallback(() => {
    if (dirty) setConfirmOpen(true);
    else onClose();
  }, [dirty, onClose]);
  const confirmExit = useCallback(() => {
    setConfirmOpen(false);
    setDirty(false);
    onClose();
  }, [onClose]);
  const closeConfirm = useCallback(() => setConfirmOpen(false), []);

  // Captura en el contenedor: cubre inputs, textareas, selects nativos y controles de Radix (switch, opción, casilla).
  const dirtyProps = useMemo(
    () => ({
      onInputCapture: () => setDirty(true),
      onChangeCapture: () => setDirty(true),
      onClickCapture: (e: MouseEvent) => {
        if ((e.target as HTMLElement).closest('[role="switch"],[role="option"],[role="checkbox"],[role="radio"]')) setDirty(true);
      },
    }),
    []
  );

  return { touch, dirtyProps, requestClose, confirmOpen, confirmExit, closeConfirm };
}
