// Formatos de fecha y hora en español. `zona` (IANA, p. ej. "Asia/Tokyo") muestra la hora de ese
// lugar; si se omite, se usa la hora del navegador.
const cache = new Map<string, Intl.DateTimeFormat>();

function formateador(opciones: Intl.DateTimeFormatOptions, zona?: string): Intl.DateTimeFormat {
  const clave = JSON.stringify(opciones) + (zona ?? '');
  let f = cache.get(clave);
  if (!f) {
    f = new Intl.DateTimeFormat('es', { ...opciones, timeZone: zona });
    cache.set(clave, f);
  }
  return f;
}

export const formatoHora = (fecha: Date, zona?: string) =>
  formateador({ hour: '2-digit', minute: '2-digit' }, zona).format(fecha);

export const formatoFechaCorta = (fecha: Date, zona?: string) =>
  formateador({ weekday: 'short', day: 'numeric', month: 'short' }, zona).format(fecha);

export const formatoFechaLarga = (fecha: Date, zona?: string) =>
  formateador({ day: 'numeric', month: 'long', year: 'numeric' }, zona).format(fecha);

/** "en 5 h", "en 3 días"… */
export function tiempoRelativo(fecha: Date, ahora: Date): string {
  const horas = (fecha.valueOf() - ahora.valueOf()) / 3600000;
  if (horas < 0) return 'ya pasó';
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

/** 1234567 → "1.234.567" */
export const formatoNumero = (n: number, decimales = 0) =>
  n.toLocaleString('es', { maximumFractionDigits: decimales, minimumFractionDigits: 0 });
