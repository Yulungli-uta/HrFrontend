import { useState, useCallback } from "react";

export function useUnsavedChangesGuard(setOpen: (open: boolean) => void) {
  const [isDirty, setIsDirty] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const handleOpenChange = useCallback(
    (open: boolean) => {
      if (!open && isDirty) {
        setConfirmOpen(true);
      } else {
        setOpen(open);
      }
    },
    [isDirty, setOpen]
  );

  const close = useCallback(() => {
    setIsDirty(false);
    setOpen(false);
  }, [setOpen]);

  const confirmExit = useCallback(() => {
    setConfirmOpen(false);
    setIsDirty(false);
    setOpen(false);
  }, [setOpen]);

  return {
    setIsFormDirty: setIsDirty,
    handleOpenChange,
    close,
    confirmOpen,
    confirmExit,
    closeConfirm: () => setConfirmOpen(false),
  };
}
