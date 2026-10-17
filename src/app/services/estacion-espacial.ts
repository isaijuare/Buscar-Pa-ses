import { Injectable, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, defer, map, of, shareReplay, tap } from 'rxjs';
import * as satelite from 'satellite.js';
import { direccionSol, posicionSol, textoRumbo } from './astronomia';

export interface PasoEstacion {
  inicio: Date;
  fin: Date;
  /** Momento de mayor altura */
  maximo: Date;
  alturaMaxima: number;
  desde: string;
  hacia: string;
}

const RADIO_TIERRA_KM = 6371;
const GRADO = Math.PI / 180;
// Elementos orbitales (TLE) de la Estación Espacial Internacional, NORAD 25544.
// CelesTrak bloquea (403) a quien pide los mismos datos muy seguido: por eso es el respaldo
// y el TLE se guarda 12 horas en el navegador.
const URL_TLE = 'https://api.wheretheiss.at/v1/satellites/25544/tles';
const URL_TLE_RESPALDO = 'https://celestrak.org/NORAD/elements/gp.php?CATNR=25544&FORMAT=TLE';
const CLAVE_TLE = 'buscador-paises:tle-iss';
const DURACION_TLE_MS = 12 * 3600000;

type Tle = [string, string];

@Injectable({ providedIn: 'root' })
export class EstacionEspacialService {
  private http = inject(HttpClient);
  private enNavegador = isPlatformBrowser(inject(PLATFORM_ID));

  private tle$: Observable<Tle> = defer(() => {
    const guardado = this.leerGuardado();
    if (guardado) return of(guardado);
    return this.http.get<{ line1: string; line2: string }>(URL_TLE).pipe(
      map((r): Tle => [r.line1, r.line2]),
      catchError(() =>
        this.http.get(URL_TLE_RESPALDO, { responseType: 'text' }).pipe(
          map((texto): Tle => {
            const lineas = texto.trim().split(/\r?\n/).map((l) => l.trim());
            return [lineas.find((l) => l.startsWith('1 '))!, lineas.find((l) => l.startsWith('2 '))!];
          })
        )
      ),
      tap((tle) => this.guardar(tle))
    );
  }).pipe(shareReplay(1));

  /** Pasos visibles a simple vista en los próximos días (la estación iluminada y el cielo oscuro). */
  pasosVisibles(lat: number, lon: number, dias = 7): Observable<PasoEstacion[]> {
    return this.tle$.pipe(map(([linea1, linea2]) => calcularPasos(linea1, linea2, lat, lon, new Date(), dias)));
  }

  private leerGuardado(): Tle | null {
    if (!this.enNavegador) return null;
    try {
      const g = JSON.parse(localStorage.getItem(CLAVE_TLE) ?? 'null');
      return g && Date.now() - g.fecha < DURACION_TLE_MS ? g.tle : null;
    } catch {
      return null;
    }
  }

  private guardar(tle: Tle): void {
    if (!this.enNavegador) return;
    try {
      localStorage.setItem(CLAVE_TLE, JSON.stringify({ tle, fecha: Date.now() }));
    } catch {
      // Sin almacenamiento: se vuelve a descargar en la próxima visita
    }
  }
}

/** Recorre la órbita cada 20 s y junta los tramos en que la estación se ve desde el lugar. */
export function calcularPasos(
  linea1: string,
  linea2: string,
  lat: number,
  lon: number,
  desde: Date,
  dias: number
): PasoEstacion[] {
  const satrec = satelite.twoline2satrec(linea1, linea2);
  const observador = {
    latitude: lat * GRADO,
    longitude: lon * GRADO,
    height: 0.1
  };

  const pasos: PasoEstacion[] = [];
  let actual: (PasoEstacion & { azInicio: number; azFin: number }) | null = null;
  const paso = 20000;
  const fin = desde.valueOf() + dias * 86400000;

  for (let t = desde.valueOf(); t <= fin; t += paso) {
    const instante = new Date(t);
    const visible = alturaVisible(satrec, observador, instante, lat, lon);

    if (visible) {
      if (!actual) {
        actual = {
          inicio: instante,
          fin: instante,
          maximo: instante,
          alturaMaxima: visible.altura,
          desde: '',
          hacia: '',
          azInicio: visible.azimut,
          azFin: visible.azimut
        };
      }
      actual.fin = instante;
      actual.azFin = visible.azimut;
      if (visible.altura > actual.alturaMaxima) {
        actual.alturaMaxima = visible.altura;
        actual.maximo = instante;
      }
    } else if (actual) {
      // Se descartan apariciones de menos de un minuto
      if (actual.fin.valueOf() - actual.inicio.valueOf() >= 60000) {
        const { azInicio, azFin, ...datos } = actual;
        pasos.push({ ...datos, desde: textoRumbo(azInicio), hacia: textoRumbo(azFin) });
      }
      actual = null;
    }
  }
  return pasos;
}

function alturaVisible(
  satrec: satelite.SatRec,
  observador: satelite.GeodeticLocation,
  instante: Date,
  lat: number,
  lon: number
): { altura: number; azimut: number } | null {
  const pv = satelite.propagate(satrec, instante);
  if (typeof pv.position === 'boolean') return null;

  const gmst = satelite.gstime(instante);
  const angulos = satelite.ecfToLookAngles(observador, satelite.eciToEcf(pv.position, gmst));
  const altura = angulos.elevation / GRADO;
  if (altura < 10) return null;

  // El observador tiene que estar de noche (Sol 6° bajo el horizonte o más)...
  if (posicionSol(instante, lat, lon).altitud > -6) return null;

  // ...y la estación iluminada por el Sol: fuera del cilindro de sombra de la Tierra
  const { x, y, z } = pv.position;
  const [sx, sy, sz] = direccionSol(instante);
  const proyeccion = x * sx + y * sy + z * sz;
  if (proyeccion < 0) {
    const perpendicular = Math.hypot(x - proyeccion * sx, y - proyeccion * sy, z - proyeccion * sz);
    if (perpendicular < RADIO_TIERRA_KM) return null;
  }

  return { altura, azimut: angulos.azimuth / GRADO };
}
