// Utilidades para trabajar con la hora de otro lugar (zona horaria IANA, p. ej. "Asia/Tokyo").
// Si no se indica zona, se usa la del navegador.

const formateadores = new Map<string, Intl.DateTimeFormat>();

function partes(fecha: Date, zona: string): Record<string, number> {
  let f = formateadores.get(zona);
  if (!f) {
    f = new Intl.DateTimeFormat('en-US', {
      timeZone: zona,
      hourCycle: 'h23',
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
      second: 'numeric'
    });
    formateadores.set(zona, f);
  }
  const resultado: Record<string, number> = {};
  for (const p of f.formatToParts(fecha)) {
    if (p.type !== 'literal') resultado[p.type] = Number(p.value);
  }
  return resultado;
}

/** Minutos de diferencia entre la zona y UTC en esa fecha (Tokio = +540). */
export function desfaseMinutos(fecha: Date, zona?: string): number {
  if (!zona) return -fecha.getTimezoneOffset();
  const p = partes(fecha, zona);
  const comoUtc = Date.UTC(p['year'], p['month'] - 1, p['day'], p['hour'], p['minute'], p['second']);
  return Math.round((comoUtc - Math.floor(fecha.valueOf() / 1000) * 1000) / 60000);
}

/** Instante en que empieza (00:00) el día de `fecha` en la zona indicada. */
export function inicioDelDia(fecha: Date, zona?: string): Date {
  if (!zona) {
    const inicio = new Date(fecha);
    inicio.setHours(0, 0, 0, 0);
    return inicio;
  }
  const p = partes(fecha, zona);
  const medianocheUtc = Date.UTC(p['year'], p['month'] - 1, p['day']);
  // Se corrige con el desfase de esa medianoche (puede diferir por horario de verano)
  return new Date(medianocheUtc - desfaseMinutos(new Date(medianocheUtc), zona) * 60000);
}

/** "UTC+9", "UTC−6", "UTC+5:30" */
export function textoDesfase(minutos: number): string {
  const signo = minutos >= 0 ? '+' : '−';
  const abs = Math.abs(minutos);
  const h = Math.floor(abs / 60);
  const m = abs % 60;
  return `UTC${signo}${h}${m ? ':' + String(m).padStart(2, '0') : ''}`;
}
