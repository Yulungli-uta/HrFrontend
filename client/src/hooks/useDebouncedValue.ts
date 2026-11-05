import { useEffect, useState } from "react";

/** Devuelve `value` con retraso: útil para no consultar al servidor en cada tecla de una caja de búsqueda. */
export function useDebouncedValue<T>(value: T, delayMs = 300): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);
  return debounced;
}
