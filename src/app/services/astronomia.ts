// Cálculos astronómicos locales (sin API): fases de la Luna, salida/puesta,
// equinoccios, solsticios y duración del día.
// Fases y estaciones: algoritmos de Jean Meeus, "Astronomical Algorithms" (cap. 27 y 49).
// Posición de la Luna y del Sol: fórmulas simplificadas usadas por SunCalc.

import { inicioDelDia } from '../utils/zona-horaria';

const { sin, cos, tan, asin, acos, atan2, PI, abs, sqrt, floor, log10 } = Math;
const RAD = PI / 180;
const DIA_MS = 86400000;
const J1970 = 2440588;
const J2000 = 2451545;
const OBLICUIDAD = RAD * 23.4397;
// Diferencia entre Tiempo Terrestre (Meeus) y UTC, aprox. 69 s en esta década
const DELTA_T_DIAS = 69 / 86400;

const aJuliano = (fecha: Date) => fecha.valueOf() / DIA_MS - 0.5 + J1970;
const desdeJuliano = (j: number) => new Date((j + 0.5 - J1970) * DIA_MS);
const diasDesdeJ2000 = (fecha: Date) => aJuliano(fecha) - J2000;
const horasDespues = (fecha: Date, h: number) => new Date(fecha.valueOf() + (h * DIA_MS) / 24);

// ---------- Coordenadas básicas ----------

const ascensionRecta = (l: number, b: number) =>
  atan2(sin(l) * cos(OBLICUIDAD) - tan(b) * sin(OBLICUIDAD), cos(l));
const declinacion = (l: number, b: number) =>
  asin(sin(b) * cos(OBLICUIDAD) + cos(b) * sin(OBLICUIDAD) * sin(l));
const altitud = (H: number, phi: number, dec: number) =>
  asin(sin(phi) * sin(dec) + cos(phi) * cos(dec) * cos(H));
const tiempoSidereo = (d: number, lw: number) => RAD * (280.16 + 360.9856235 * d) - lw;

function refraccion(h: number): number {
  if (h < 0) h = 0;
  return 0.0002967 / tan(h + 0.00312536 / (h + 0.08901179));
}

const anomaliaSolar = (d: number) => RAD * (357.5291 + 0.98560028 * d);

function longitudEclipticaSol(M: number): number {
  const C = RAD * (1.9148 * sin(M) + 0.02 * sin(2 * M) + 0.0003 * sin(3 * M));
  return M + C + RAD * 102.9372 + PI;
}

function coordenadasSol(d: number) {
  const L = longitudEclipticaSol(anomaliaSolar(d));
  return { dec: declinacion(L, 0), ra: ascensionRecta(L, 0) };
}

function coordenadasLuna(d: number) {
  const L = RAD * (218.316 + 13.176396 * d);
  const M = RAD * (134.963 + 13.064993 * d);
  const F = RAD * (93.272 + 13.22935 * d);
  const l = L + RAD * 6.289 * sin(M);
  const b = RAD * 5.128 * sin(F);
  return { ra: ascensionRecta(l, b), dec: declinacion(l, b), distanciaKm: 385001 - 20905 * cos(M) };
}

function altitudLuna(fecha: Date, lat: number, lon: number): number {
  const d = diasDesdeJ2000(fecha);
  const c = coordenadasLuna(d);
  const H = tiempoSidereo(d, RAD * -lon) - c.ra;
  const h = altitud(H, RAD * lat, c.dec);
  return h + refraccion(h);
}

// ---------- Luna ----------

export type TipoFase = 'nueva' | 'cuarto-creciente' | 'llena' | 'cuarto-menguante';
const TIPOS_FASE: TipoFase[] = ['nueva', 'cuarto-creciente', 'llena', 'cuarto-menguante'];

export const NOMBRE_FASE: Record<TipoFase, string> = {
  nueva: 'Luna nueva',
  'cuarto-creciente': 'Cuarto creciente',
  llena: 'Luna llena',
  'cuarto-menguante': 'Cuarto menguante'
};

// Nombre de la fase intermedia que sigue a cada fase principal
const FASE_INTERMEDIA: Record<TipoFase, string> = {
  nueva: 'Luna creciente',
  'cuarto-creciente': 'Gibosa creciente',
  llena: 'Gibosa menguante',
  'cuarto-menguante': 'Luna menguante'
};

export interface FasePrincipal {
  tipo: TipoFase;
  fecha: Date;
}

/** Fecha exacta de una fase principal. k entero = luna nueva; +0.25, +0.5, +0.75 = resto. */
function fechaFase(k: number): Date {
  const T = k / 1236.85;
  const jde =
    2451550.09766 + 29.530588861 * k + 0.00015437 * T ** 2 - 0.00000015 * T ** 3 + 0.00000000073 * T ** 4;
  const E = 1 - 0.002516 * T - 0.0000074 * T ** 2;
  const M = RAD * (2.5534 + 29.1053567 * k - 0.0000014 * T ** 2 - 0.00000011 * T ** 3);
  const Mp = RAD * (201.5643 + 385.81693528 * k + 0.0107582 * T ** 2 + 0.00001238 * T ** 3 - 0.000000058 * T ** 4);
  const F = RAD * (160.7108 + 390.67050284 * k - 0.0016118 * T ** 2 - 0.00000227 * T ** 3 + 0.000000011 * T ** 4);
  const O = RAD * (124.7746 - 1.56375588 * k + 0.0020672 * T ** 2 + 0.00000215 * T ** 3);
  const tipo = Math.round((k - floor(k)) * 4) % 4;

  let c: number;
  if (tipo === 0 || tipo === 2) {
    const nueva = tipo === 0;
    c =
      (nueva ? -0.4072 : -0.40614) * sin(Mp) +
      (nueva ? 0.17241 : 0.17302) * E * sin(M) +
      (nueva ? 0.01608 : 0.01614) * sin(2 * Mp) +
      (nueva ? 0.01039 : 0.01043) * sin(2 * F) +
      (nueva ? 0.00739 : 0.00734) * E * sin(Mp - M) -
      (nueva ? 0.00514 : 0.00515) * E * sin(Mp + M) +
      (nueva ? 0.00208 : 0.00209) * E * E * sin(2 * M) -
      0.00111 * sin(Mp - 2 * F) -
      0.00057 * sin(Mp + 2 * F) +
      0.00056 * E * sin(2 * Mp + M) -
      0.00042 * sin(3 * Mp) +
      0.00042 * E * sin(M + 2 * F) +
      0.00038 * E * sin(M - 2 * F) -
      0.00024 * E * sin(2 * Mp - M) -
      0.00017 * sin(O) -
      0.00007 * sin(Mp + 2 * M) +
      0.00004 * sin(2 * Mp - 2 * F) +
      0.00004 * sin(3 * M) +
      0.00003 * sin(Mp + M - 2 * F) +
      0.00003 * sin(2 * Mp + 2 * F) -
      0.00003 * sin(Mp + M + 2 * F) +
      0.00003 * sin(Mp - M + 2 * F) -
      0.00002 * sin(Mp - M - 2 * F) -
      0.00002 * sin(3 * Mp + M) +
      0.00002 * sin(4 * Mp);
  } else {
    c =
      -0.62801 * sin(Mp) +
      0.17172 * E * sin(M) -
      0.01183 * E * sin(Mp + M) +
      0.00862 * sin(2 * Mp) +
      0.00804 * sin(2 * F) +
      0.00454 * E * sin(Mp - M) +
      0.00204 * E * E * sin(2 * M) -
      0.0018 * sin(Mp - 2 * F) -
      0.0007 * sin(Mp + 2 * F) -
      0.0004 * sin(3 * Mp) -
      0.00034 * E * sin(2 * Mp - M) +
      0.00032 * E * sin(M + 2 * F) +
      0.00032 * E * sin(M - 2 * F) -
      0.00028 * E * E * sin(Mp + 2 * M) +
      0.00027 * E * sin(2 * Mp + M) -
      0.00017 * sin(O) -
      0.00005 * sin(Mp - M - 2 * F) +
      0.00004 * sin(2 * Mp + 2 * F) -
      0.00004 * sin(Mp + M + 2 * F) +
      0.00004 * sin(Mp - 2 * M) +
      0.00003 * sin(Mp + M - 2 * F) +
      0.00003 * sin(3 * M) +
      0.00002 * sin(2 * Mp - 2 * F) +
      0.00002 * sin(Mp - M + 2 * F) -
      0.00002 * sin(3 * Mp + M);
    const W =
      0.00306 -
      0.00038 * E * cos(M) +
      0.00026 * cos(Mp) -
      0.00002 * cos(Mp - M) +
      0.00002 * cos(Mp + M) +
      0.00002 * cos(2 * F);
    c += tipo === 1 ? W : -W;
  }

  // Correcciones planetarias
  const argumentos = [
    299.77 + 0.107408 * k - 0.009173 * T ** 2,
    251.88 + 0.016321 * k,
    251.83 + 26.651886 * k,
    349.42 + 36.412478 * k,
    84.66 + 18.206239 * k,
    141.74 + 53.303771 * k,
    207.14 + 2.453732 * k,
    154.84 + 7.30686 * k,
    34.52 + 27.261239 * k,
    207.19 + 0.121824 * k,
    291.34 + 1.844379 * k,
    161.72 + 24.198154 * k,
    239.56 + 25.513099 * k,
    331.55 + 3.592518 * k
  ];
  const coeficientes = [325, 165, 164, 126, 110, 62, 60, 56, 47, 42, 40, 37, 35, 23];
  c += argumentos.reduce((suma, a, i) => suma + coeficientes[i] * 1e-6 * sin(RAD * a), 0);

  return desdeJuliano(jde + c - DELTA_T_DIAS);
}

export interface EstadoLuna {
  nombre: string;
  /** Fracción iluminada, de 0 a 1 */
  iluminacion: number;
  creciente: boolean;
  edadDias: number;
  distanciaKm: number;
  sobreHorizonte: boolean;
  ultimaNueva: Date;
  proximas: FasePrincipal[];
}

export function estadoLuna(ahora: Date, lat: number, lon: number, cantidadProximas = 4): EstadoLuna {
  // Se empieza una lunación antes para tener siempre la fase anterior
  let k = floor((diasDesdeJ2000(ahora) / 365.25) * 12.3685) - 1;
  let anterior!: FasePrincipal;
  let ultimaNueva!: Date;
  const proximas: FasePrincipal[] = [];

  while (proximas.length < cantidadProximas) {
    const fase: FasePrincipal = { tipo: TIPOS_FASE[Math.round((k - floor(k)) * 4) % 4], fecha: fechaFase(k) };
    if (fase.fecha <= ahora) {
      anterior = fase;
      if (fase.tipo === 'nueva') ultimaNueva = fase.fecha;
    } else {
      proximas.push(fase);
    }
    k += 0.25;
  }

  // Si estamos a menos de 12 h de una fase principal, se usa su nombre
  const doceHoras = DIA_MS / 2;
  const cercana = [anterior, proximas[0]].find((f) => abs(f.fecha.valueOf() - ahora.valueOf()) < doceHoras);
  const nombre = cercana ? NOMBRE_FASE[cercana.tipo] : FASE_INTERMEDIA[anterior.tipo];

  // Iluminación a partir del ángulo Sol-Tierra-Luna
  const d = diasDesdeJ2000(ahora);
  const s = coordenadasSol(d);
  const m = coordenadasLuna(d);
  const distanciaSolKm = 149598000;
  const elongacion = acos(
    sin(s.dec) * sin(m.dec) + cos(s.dec) * cos(m.dec) * cos(s.ra - m.ra)
  );
  const angulo = atan2(distanciaSolKm * sin(elongacion), m.distanciaKm - distanciaSolKm * cos(elongacion));
  const iluminacion = (1 + cos(angulo)) / 2;

  const edadDias = (ahora.valueOf() - ultimaNueva.valueOf()) / DIA_MS;

  return {
    nombre,
    iluminacion,
    creciente: edadDias < 29.530588861 / 2,
    edadDias,
    distanciaKm: m.distanciaKm,
    sobreHorizonte: altitudLuna(ahora, lat, lon) > 0,
    ultimaNueva,
    proximas
  };
}

export interface HorarioLuna {
  salida?: Date;
  puesta?: Date;
  siempreArriba: boolean;
  siempreAbajo: boolean;
}

/** Salida y puesta de la Luna durante el día de `fecha` en la zona horaria del lugar. */
export function horarioLuna(fecha: Date, lat: number, lon: number, zona?: string): HorarioLuna {
  const inicio = inicioDelDia(fecha, zona);

  const hc = 0.133 * RAD;
  let h0 = altitudLuna(inicio, lat, lon) - hc;
  let salida: number | undefined;
  let puesta: number | undefined;
  let ye = 0;

  // Se ajusta una parábola cada 2 horas para encontrar los cruces del horizonte
  for (let i = 1; i <= 24; i += 2) {
    const h1 = altitudLuna(horasDespues(inicio, i), lat, lon) - hc;
    const h2 = altitudLuna(horasDespues(inicio, i + 1), lat, lon) - hc;

    const a = (h0 + h2) / 2 - h1;
    const b = (h2 - h0) / 2;
    const xe = -b / (2 * a);
    ye = (a * xe + b) * xe + h1;
    const disc = b * b - 4 * a * h1;
    let raices = 0;
    let x1 = 0;
    let x2 = 0;

    if (disc >= 0) {
      const dx = sqrt(disc) / (abs(a) * 2);
      x1 = xe - dx;
      x2 = xe + dx;
      if (abs(x1) <= 1) raices++;
      if (abs(x2) <= 1) raices++;
      if (x1 < -1) x1 = x2;
    }

    if (raices === 1) {
      if (h0 < 0) salida = i + x1;
      else puesta = i + x1;
    } else if (raices === 2) {
      salida = i + (ye < 0 ? x2 : x1);
      puesta = i + (ye < 0 ? x1 : x2);
    }

    if (salida !== undefined && puesta !== undefined) break;
    h0 = h2;
  }

  return {
    salida: salida !== undefined ? horasDespues(inicio, salida) : undefined,
    puesta: puesta !== undefined ? horasDespues(inicio, puesta) : undefined,
    siempreArriba: salida === undefined && puesta === undefined && ye > 0,
    siempreAbajo: salida === undefined && puesta === undefined && ye <= 0
  };
}

// ---------- Estaciones ----------

export type TipoEvento = 'equinoccio-marzo' | 'solsticio-junio' | 'equinoccio-septiembre' | 'solsticio-diciembre';
const TIPOS_EVENTO: TipoEvento[] = ['equinoccio-marzo', 'solsticio-junio', 'equinoccio-septiembre', 'solsticio-diciembre'];

export const NOMBRE_EVENTO: Record<TipoEvento, string> = {
  'equinoccio-marzo': 'Equinoccio de marzo',
  'solsticio-junio': 'Solsticio de junio',
  'equinoccio-septiembre': 'Equinoccio de septiembre',
  'solsticio-diciembre': 'Solsticio de diciembre'
};

export type NombreEstacion = 'Primavera' | 'Verano' | 'Otoño' | 'Invierno';
// Estación que empieza con cada evento (mismo orden que TIPOS_EVENTO)
const ESTACIONES_NORTE: NombreEstacion[] = ['Primavera', 'Verano', 'Otoño', 'Invierno'];
const ESTACIONES_SUR: NombreEstacion[] = ['Otoño', 'Invierno', 'Primavera', 'Verano'];

export interface EventoEstacional {
  tipo: TipoEvento;
  fecha: Date;
  /** Estación que comienza con este evento en el hemisferio indicado */
  estacion: NombreEstacion;
}

// Coeficientes periódicos de Meeus (tabla 27.C)
const TERMINOS_ESTACION: [number, number, number][] = [
  [485, 324.96, 1934.136], [203, 337.23, 32964.467], [199, 342.08, 20.186], [182, 27.85, 445267.112],
  [156, 73.14, 45036.886], [136, 171.52, 22518.443], [77, 222.54, 65928.934], [74, 296.72, 3034.906],
  [70, 243.58, 9037.513], [58, 119.81, 33718.147], [52, 297.17, 150.678], [50, 21.02, 2281.226],
  [45, 247.54, 29929.562], [44, 325.15, 31555.956], [29, 60.93, 4443.417], [18, 155.12, 67555.328],
  [17, 288.79, 4562.452], [16, 198.04, 62894.029], [14, 199.76, 31436.921], [12, 95.39, 14577.848],
  [12, 287.11, 31931.756], [12, 320.81, 34777.259], [9, 227.73, 1222.114], [8, 15.45, 16859.074]
];

function fechaEvento(anio: number, indice: number): Date {
  const Y = (anio - 2000) / 1000;
  const polinomios = [
    [2451623.80984, 365242.37404, 0.05169, -0.00411, -0.00057],
    [2451716.56767, 365241.62603, 0.00325, 0.00888, -0.0003],
    [2451810.21715, 365242.01767, -0.11575, 0.00337, 0.00078],
    [2451900.05952, 365242.74049, -0.06223, -0.00823, 0.00032]
  ][indice];
  const jde0 = polinomios.reduce((suma, coef, i) => suma + coef * Y ** i, 0);
  const T = (jde0 - J2000) / 36525;
  const W = RAD * (35999.373 * T - 2.47);
  const deltaLambda = 1 + 0.0334 * cos(W) + 0.0007 * cos(2 * W);
  const S = TERMINOS_ESTACION.reduce((suma, [A, B, C]) => suma + A * cos(RAD * (B + C * T)), 0);
  return desdeJuliano(jde0 + (0.00001 * S) / deltaLambda - DELTA_T_DIAS);
}

export function eventosDelAnio(anio: number, lat: number): EventoEstacional[] {
  const estaciones = lat >= 0 ? ESTACIONES_NORTE : ESTACIONES_SUR;
  return TIPOS_EVENTO.map((tipo, i) => ({ tipo, fecha: fechaEvento(anio, i), estacion: estaciones[i] }));
}

export interface EstadoEstacion {
  actual: EventoEstacional;
  siguiente: EventoEstacional;
  /** 0 a 1: cuánto de la estación actual ya pasó */
  progreso: number;
  diasRestantes: number;
  hemisferio: 'norte' | 'sur';
  tropical: boolean;
}

export function estadoEstacion(ahora: Date, lat: number): EstadoEstacion {
  const anio = ahora.getFullYear();
  const eventos = [anio - 1, anio, anio + 1].flatMap((a) => eventosDelAnio(a, lat));
  const indiceSiguiente = eventos.findIndex((e) => e.fecha > ahora);
  const actual = eventos[indiceSiguiente - 1];
  const siguiente = eventos[indiceSiguiente];
  const duracion = siguiente.fecha.valueOf() - actual.fecha.valueOf();

  return {
    actual,
    siguiente,
    progreso: (ahora.valueOf() - actual.fecha.valueOf()) / duracion,
    diasRestantes: (siguiente.fecha.valueOf() - ahora.valueOf()) / DIA_MS,
    hemisferio: lat >= 0 ? 'norte' : 'sur',
    tropical: abs(lat) < 23.44
  };
}

// ---------- Sol ----------

/** Altura máxima del Sol sobre el horizonte (en grados) al mediodía del día de `fecha`. */
export function alturaSolMediodia(fecha: Date, lat: number): number {
  const dec = coordenadasSol(diasDesdeJ2000(fecha)).dec / RAD;
  return 90 - abs(lat - dec);
}

/** Minutos de luz solar del día de `fecha`. Devuelve 0 en noche polar y 1440 en día polar. */
export function duracionDiaMinutos(fecha: Date, lat: number, lon: number): number {
  const J0 = 0.0009;
  const lw = RAD * -lon;
  const phi = RAD * lat;
  const d = diasDesdeJ2000(fecha);
  const n = Math.round(d - J0 - lw / (2 * PI));
  const ds = J0 + lw / (2 * PI) + n;
  const M = anomaliaSolar(ds);
  const L = longitudEclipticaSol(M);
  const dec = declinacion(L, 0);

  const cosH = (sin(-0.833 * RAD) - sin(phi) * sin(dec)) / (cos(phi) * cos(dec));
  if (cosH >= 1) return 0;
  if (cosH <= -1) return 1440;
  // El día dura el doble del ángulo horario (en fracciones de vuelta)
  return ((2 * acos(cosH)) / (2 * PI)) * 1440;
}

// ---------- Sol: hora dorada y hora azul ----------

/** Altura (grados) y rumbo desde el norte (grados) del Sol en ese instante. */
export function posicionSol(fecha: Date, lat: number, lon: number): { altitud: number; azimut: number } {
  const d = diasDesdeJ2000(fecha);
  const s = coordenadasSol(d);
  const H = tiempoSidereo(d, RAD * -lon) - s.ra;
  return {
    altitud: altitud(H, RAD * lat, s.dec) / RAD,
    azimut: rumboDesdeNorte(H, RAD * lat, s.dec)
  };
}

/** Altura (grados) y rumbo desde el norte (grados) de la Luna en ese instante. */
export function posicionLuna(fecha: Date, lat: number, lon: number): { altitud: number; azimut: number } {
  const d = diasDesdeJ2000(fecha);
  const c = coordenadasLuna(d);
  const H = tiempoSidereo(d, RAD * -lon) - c.ra;
  const h = altitud(H, RAD * lat, c.dec);
  return { altitud: (h + refraccion(h)) / RAD, azimut: rumboDesdeNorte(H, RAD * lat, c.dec) };
}

/** Vector unitario hacia el Sol en coordenadas ecuatoriales (para saber si un satélite está iluminado). */
export function direccionSol(fecha: Date): [number, number, number] {
  const s = coordenadasSol(diasDesdeJ2000(fecha));
  return [cos(s.dec) * cos(s.ra), cos(s.dec) * sin(s.ra), sin(s.dec)];
}

function rumboDesdeNorte(H: number, phi: number, dec: number): number {
  // SunCalc mide desde el sur; se pasa a la convención de brújula (0° = norte, 90° = este)
  const desdeSur = atan2(sin(H), cos(H) * sin(phi) - tan(dec) * cos(phi));
  return (((desdeSur / RAD + 180) % 360) + 360) % 360;
}

export interface TiemposSol {
  mediodia: Date;
  amanecer?: Date;
  atardecer?: Date;
  /** Hora azul: el Sol entre −6° y −4° bajo el horizonte */
  azulManana?: [Date, Date];
  /** Hora dorada: el Sol entre −4° y 6° sobre el horizonte */
  doradaManana?: [Date, Date];
  doradaTarde?: [Date, Date];
  azulTarde?: [Date, Date];
}

/** Horarios del Sol para el día de `fecha` en la zona horaria del lugar. */
export function tiemposSol(fecha: Date, lat: number, lon: number, zona?: string): TiemposSol {
  const mediodiaLocal = new Date(inicioDelDia(fecha, zona).valueOf() + DIA_MS / 2);
  const J0 = 0.0009;
  const lw = RAD * -lon;
  const phi = RAD * lat;
  const d = diasDesdeJ2000(mediodiaLocal);
  const n = Math.round(d - J0 - lw / (2 * PI));
  const ds = J0 + lw / (2 * PI) + n;
  const M = anomaliaSolar(ds);
  const L = longitudEclipticaSol(M);
  const dec = declinacion(L, 0);
  const transito = J2000 + ds + 0.0053 * sin(M) - 0.0069 * sin(2 * L);

  // Instantes en que el Sol pasa por una altura dada (subiendo y bajando); undefined si no llega
  const cruce = (alturaGrados: number): [Date, Date] | undefined => {
    const cosH = (sin(alturaGrados * RAD) - sin(phi) * sin(dec)) / (cos(phi) * cos(dec));
    if (cosH < -1 || cosH > 1) return undefined;
    const w = acos(cosH);
    const puesta = J2000 + (J0 + (w + lw) / (2 * PI) + n) + 0.0053 * sin(M) - 0.0069 * sin(2 * L);
    const salida = transito - (puesta - transito);
    return [desdeJuliano(salida), desdeJuliano(puesta)];
  };

  const horizonte = cruce(-0.833);
  const menos6 = cruce(-6);
  const menos4 = cruce(-4);
  const mas6 = cruce(6);

  return {
    mediodia: desdeJuliano(transito),
    amanecer: horizonte?.[0],
    atardecer: horizonte?.[1],
    azulManana: menos6 && menos4 ? [menos6[0], menos4[0]] : undefined,
    doradaManana: menos4 && mas6 ? [menos4[0], mas6[0]] : undefined,
    doradaTarde: menos4 && mas6 ? [mas6[1], menos4[1]] : undefined,
    azulTarde: menos6 && menos4 ? [menos4[1], menos6[1]] : undefined
  };
}

// ---------- Planetas ----------
// Elementos orbitales aproximados de JPL (E. M. Standish), válidos de 1800 a 2050:
// [a (UA), e, I, L, longitud del perihelio, longitud del nodo] y su variación por siglo.

export type NombrePlaneta = 'Mercurio' | 'Venus' | 'Marte' | 'Júpiter' | 'Saturno';

const ELEMENTOS: Record<NombrePlaneta | 'Tierra', [number[], number[]]> = {
  Mercurio: [
    [0.38709927, 0.20563593, 7.00497902, 252.2503235, 77.45779628, 48.33076593],
    [0.00000037, 0.00001906, -0.00594749, 149472.67411175, 0.16047689, -0.12534081]
  ],
  Venus: [
    [0.72333566, 0.00677672, 3.39467605, 181.9790995, 131.60246718, 76.67984255],
    [0.0000039, -0.00004107, -0.0007889, 58517.81538729, 0.00268329, -0.27769418]
  ],
  Tierra: [
    [1.00000261, 0.01671123, -0.00001531, 100.46457166, 102.93768193, 0],
    [0.00000562, -0.00004392, -0.01294668, 35999.37244981, 0.32327364, 0]
  ],
  Marte: [
    [1.52371034, 0.0933941, 1.84969142, -4.55343205, -23.94362959, 49.55953891],
    [0.00001847, 0.00007882, -0.00813131, 19140.30268499, 0.44441088, -0.29257343]
  ],
  Júpiter: [
    [5.202887, 0.04838624, 1.30439695, 34.39644051, 14.72847983, 100.47390909],
    [-0.00011607, -0.00013253, -0.00183714, 3034.74612775, 0.21252668, 0.20469106]
  ],
  Saturno: [
    [9.53667594, 0.05386179, 2.48599187, 49.95424423, 92.59887831, 113.66242448],
    [-0.0012506, -0.00050991, 0.00193609, 1222.49362201, -0.41897216, -0.28867794]
  ]
};

// Magnitud absoluta y corrección por ángulo de fase (fórmulas simplificadas)
const BRILLO: Record<NombrePlaneta, (fase: number) => number> = {
  Mercurio: (i) => -0.42 + 0.038 * i - 0.000273 * i * i + 0.000002 * i ** 3,
  Venus: (i) => -4.4 + 0.0009 * i + 0.000239 * i * i - 0.00000065 * i ** 3,
  Marte: (i) => -1.52 + 0.016 * i,
  Júpiter: (i) => -9.4 + 0.005 * i,
  Saturno: () => -8.88
};

function posicionHeliocentrica(nombre: NombrePlaneta | 'Tierra', siglos: number): [number, number, number] {
  const [base, tasa] = ELEMENTOS[nombre];
  const [a, e, I, L, perihelio, nodo] = base.map((v, i) => v + tasa[i] * siglos);
  const argPerihelio = RAD * (perihelio - nodo);
  const Om = RAD * nodo;
  const inc = RAD * I;
  const M = RAD * ((((L - perihelio) % 360) + 540) % 360 - 180);

  // Ecuación de Kepler por Newton-Raphson
  let E = M + e * sin(M);
  for (let k = 0; k < 8; k++) E -= (E - e * sin(E) - M) / (1 - e * cos(E));

  const xp = a * (cos(E) - e);
  const yp = a * sqrt(1 - e * e) * sin(E);
  const cw = cos(argPerihelio);
  const sw = sin(argPerihelio);
  const cO = cos(Om);
  const sO = sin(Om);
  const ci = cos(inc);
  const si = sin(inc);
  return [
    (cw * cO - sw * sO * ci) * xp + (-sw * cO - cw * sO * ci) * yp,
    (cw * sO + sw * cO * ci) * xp + (-sw * sO + cw * cO * ci) * yp,
    sw * si * xp + cw * si * yp
  ];
}

function posicionPlaneta(nombre: NombrePlaneta, fecha: Date, lat: number, lon: number) {
  const d = diasDesdeJ2000(fecha);
  const siglos = d / 36525;
  const p = posicionHeliocentrica(nombre, siglos);
  const t = posicionHeliocentrica('Tierra', siglos);
  const x = p[0] - t[0];
  const y = p[1] - t[1];
  const z = p[2] - t[2];

  // De coordenadas eclípticas a ecuatoriales
  const eps = RAD * 23.43928;
  const ye = y * cos(eps) - z * sin(eps);
  const ze = y * sin(eps) + z * cos(eps);
  const ra = atan2(ye, x);
  const dec = atan2(ze, sqrt(x * x + ye * ye));

  const H = tiempoSidereo(d, RAD * -lon) - ra;
  const h = altitud(H, RAD * lat, dec);

  const r = sqrt(p[0] ** 2 + p[1] ** 2 + p[2] ** 2);
  const delta = sqrt(x * x + y * y + z * z);
  const R = sqrt(t[0] ** 2 + t[1] ** 2 + t[2] ** 2);
  const fase = acos(Math.max(-1, Math.min(1, (r * r + delta * delta - R * R) / (2 * r * delta)))) / RAD;

  return {
    altitud: (h + refraccion(h)) / RAD,
    azimut: rumboDesdeNorte(H, RAD * lat, dec),
    magnitud: BRILLO[nombre](fase) + 5 * log10(r * delta)
  };
}

export interface PlanetaVisible {
  nombre: NombrePlaneta;
  /** Mejor momento para verlo (cuando está más alto con el cielo oscuro) */
  mejorHora: Date;
  alturaMaxima: number;
  rumbo: string;
  desde: Date;
  hasta: Date;
  magnitud: number;
}

const RUMBOS = ['norte', 'noreste', 'este', 'sureste', 'sur', 'suroeste', 'oeste', 'noroeste'];
export const textoRumbo = (azimut: number) => RUMBOS[Math.round(azimut / 45) % 8];

/**
 * Planetas visibles a simple vista esta noche (cielo oscuro y más de 8° sobre el horizonte).
 * Recorre la noche en curso o la próxima, cada 10 minutos.
 */
export function planetasVisibles(ahora: Date, lat: number, lon: number): PlanetaVisible[] {
  const paso = 10 * 60000;
  const fin = ahora.valueOf() + 26 * 3600000;
  const nombres: NombrePlaneta[] = ['Mercurio', 'Venus', 'Marte', 'Júpiter', 'Saturno'];
  const mejores = new Map<NombrePlaneta, PlanetaVisible>();

  let huboNoche = false;
  for (let t = ahora.valueOf(); t <= fin; t += paso) {
    const instante = new Date(t);
    if (posicionSol(instante, lat, lon).altitud >= -6) {
      // Terminó la noche: no se sigue hasta la siguiente
      if (huboNoche) break;
      continue;
    }
    huboNoche = true;

    for (const nombre of nombres) {
      const pos = posicionPlaneta(nombre, instante, lat, lon);
      if (pos.altitud < 8) continue;
      const previo = mejores.get(nombre);
      if (!previo) {
        mejores.set(nombre, {
          nombre,
          mejorHora: instante,
          alturaMaxima: pos.altitud,
          rumbo: textoRumbo(pos.azimut),
          desde: instante,
          hasta: instante,
          magnitud: pos.magnitud
        });
        continue;
      }
      previo.hasta = instante;
      if (pos.altitud > previo.alturaMaxima) {
        previo.mejorHora = instante;
        previo.alturaMaxima = pos.altitud;
        previo.rumbo = textoRumbo(pos.azimut);
        previo.magnitud = pos.magnitud;
      }
    }
  }
  return [...mejores.values()].sort((a, b) => a.magnitud - b.magnitud);
}

// ---------- Eclipses (Meeus, cap. 54) ----------

export type TipoEclipse =
  | 'solar-total'
  | 'solar-anular'
  | 'solar-hibrido'
  | 'solar-parcial'
  | 'lunar-total'
  | 'lunar-parcial'
  | 'lunar-penumbral';

export interface Eclipse {
  tipo: TipoEclipse;
  fecha: Date;
  magnitud: number;
  /** Lunares: si la Luna está sobre el horizonte del lugar. Solares: si el Sol lo está. */
  astroSobreHorizonte: boolean;
}

export const NOMBRE_ECLIPSE: Record<TipoEclipse, string> = {
  'solar-total': 'Eclipse solar total',
  'solar-anular': 'Eclipse solar anular',
  'solar-hibrido': 'Eclipse solar híbrido',
  'solar-parcial': 'Eclipse solar parcial',
  'lunar-total': 'Eclipse lunar total',
  'lunar-parcial': 'Eclipse lunar parcial',
  'lunar-penumbral': 'Eclipse lunar penumbral'
};

function analizarEclipse(k: number, lat: number, lon: number): Eclipse | null {
  const T = k / 1236.85;
  const F = RAD * (160.7108 + 390.67050284 * k - 0.0016118 * T ** 2 - 0.00000227 * T ** 3 + 0.000000011 * T ** 4);
  // Lejos del nodo lunar no hay eclipse
  if (abs(sin(F)) > 0.36) return null;

  const E = 1 - 0.002516 * T - 0.0000074 * T ** 2;
  const M = RAD * (2.5534 + 29.1053567 * k - 0.0000014 * T ** 2 - 0.00000011 * T ** 3);
  const Mp = RAD * (201.5643 + 385.81693528 * k + 0.0107582 * T ** 2 + 0.00001238 * T ** 3 - 0.000000058 * T ** 4);
  const O = RAD * (124.7746 - 1.56375588 * k + 0.0020672 * T ** 2 + 0.00000215 * T ** 3);
  const F1 = F - RAD * 0.02665 * sin(O);

  const P =
    0.207 * E * sin(M) +
    0.0024 * E * sin(2 * M) -
    0.0392 * sin(Mp) +
    0.0116 * sin(2 * Mp) -
    0.0073 * E * sin(Mp + M) +
    0.0067 * E * sin(Mp - M) +
    0.0118 * sin(2 * F1);
  const Q =
    5.2207 -
    0.0048 * E * cos(M) +
    0.002 * E * cos(2 * M) -
    0.3299 * cos(Mp) -
    0.006 * E * cos(Mp + M) +
    0.0041 * E * cos(Mp - M);
  const W = abs(cos(F1));
  const gamma = (P * cos(F1) + Q * sin(F1)) * (1 - 0.0048 * W);
  const u = 0.0059 + 0.0046 * E * cos(M) - 0.0182 * cos(Mp) + 0.0004 * cos(2 * Mp) - 0.0005 * cos(M + Mp);
  const g = abs(gamma);
  const fecha = fechaFase(k);

  if (Number.isInteger(k)) {
    if (g > 1.5433 + u) return null;
    let tipo: TipoEclipse;
    let magnitud = 1;
    if (g < 0.9972) {
      if (u < 0) tipo = 'solar-total';
      else if (u > 0.0047) tipo = 'solar-anular';
      else tipo = u < 0.00464 * sqrt(1 - gamma * gamma) ? 'solar-hibrido' : 'solar-anular';
    } else {
      tipo = 'solar-parcial';
      magnitud = (1.5433 + u - g) / (0.5461 + 2 * u);
    }
    return { tipo, fecha, magnitud, astroSobreHorizonte: posicionSol(fecha, lat, lon).altitud > 0 };
  }

  const penumbral = (1.5573 + u - g) / 0.545;
  const umbral = (1.0128 - u - g) / 0.545;
  let tipo: TipoEclipse;
  if (umbral >= 1) tipo = 'lunar-total';
  else if (umbral > 0) tipo = 'lunar-parcial';
  else if (penumbral > 0) tipo = 'lunar-penumbral';
  else return null;
  return {
    tipo,
    fecha,
    magnitud: umbral > 0 ? umbral : penumbral,
    astroSobreHorizonte: altitudLuna(fecha, lat, lon) > 0
  };
}

/** Próximos eclipses de Sol y de Luna a partir de `desde`. */
export function proximosEclipses(desde: Date, cantidad: number, lat: number, lon: number): Eclipse[] {
  const resultado: Eclipse[] = [];
  let k = floor((diasDesdeJ2000(desde) / 365.25) * 12.3685) - 1;
  // Como máximo unos 5 años de lunaciones
  for (let i = 0; i < 140 && resultado.length < cantidad; i++, k += 0.5) {
    const eclipse = analizarEclipse(k, lat, lon);
    if (eclipse && eclipse.fecha > desde) resultado.push(eclipse);
  }
  return resultado;
}
