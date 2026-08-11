// Deteccion simple de dispositivo movil, usada unicamente para decidir que ayuda mostrar
// en el flujo de firma (celular: el cliente de FirmaEC no notifica solo al terminar, asi
// que se ofrece la carga manual del PDF firmado de entrada; escritorio: se sigue confiando
// primero en el aviso automatico). No es una decision de seguridad — el backend valida
// igual sin importar que reporte esto.
export function isMobileDevice(): boolean {
  if (typeof navigator === "undefined") return false;
  return /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
}
