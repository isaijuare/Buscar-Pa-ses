const hora = new Intl.DateTimeFormat('es', { hour: '2-digit', minute: '2-digit' });
const fechaCorta = new Intl.DateTimeFormat('es', { weekday: 'short', day: 'numeric', month: 'short' });
const fechaLarga = new Intl.DateTimeFormat('es', { day: 'numeric', month: 'long', year: 'numeric' });

export const formatoHora = (fecha: Date) => hora.format(fecha);
export const formatoFechaCorta = (fecha: Date) => fechaCorta.format(fecha);
export const formatoFechaLarga = (fecha: Date) => fechaLarga.format(fecha);

/** "en 5 h", "en 3 días"… */
export function tiempoRelativo(fecha: Date, ahora: Date): string {
  const horas = (fecha.valueOf() - ahora.valueOf()) / 3600000;
  if (horas < 1) return 'en menos de 1 h';
  if (horas < 24) return `en ${Math.round(horas)} h`;
  const dias = Math.round(horas / 24);
  return `en ${dias} ${dias === 1 ? 'día' : 'días'}`;
}

/** 708 → "11 h 48 min" */
export function formatoDuracion(minutos: number): string {
  const h = Math.floor(minutos / 60);
  const m = Math.round(minutos % 60);
  return `${h} h ${m} min`;
}
