import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map, shareReplay } from 'rxjs';

export interface TiposDeCambio {
  /** Fecha de actualización */
  actualizado: Date;
  /** Cuántas unidades de cada moneda equivalen a 1 USD */
  porDolar: Record<string, number>;
}

export interface Feriado {
  fecha: string;
  nombreLocal: string;
  nombre: string;
}

interface CambioApiResponse {
  result: string;
  time_last_update_unix: number;
  rates: Record<string, number>;
}

interface FeriadoApiResponse {
  date: string;
  localName: string;
  name: string;
  global: boolean;
}

@Injectable({ providedIn: 'root' })
export class ViajeService {
  private http = inject(HttpClient);

  // Gratis y sin API key: más de 160 monedas, actualizadas una vez al día
  private cambio$ = this.http.get<CambioApiResponse>('https://open.er-api.com/v6/latest/USD').pipe(
    map((r) => ({ actualizado: new Date(r.time_last_update_unix * 1000), porDolar: r.rates })),
    shareReplay(1)
  );

  tiposDeCambio(): Observable<TiposDeCambio> {
    return this.cambio$;
  }

  /** Próximos feriados nacionales (Nager.Date; algunos países no tienen datos). */
  proximosFeriados(codigoPais: string): Observable<Feriado[]> {
    return this.http
      .get<FeriadoApiResponse[] | null>(`https://date.nager.at/api/v3/NextPublicHolidays/${codigoPais.toUpperCase()}`)
      .pipe(
        map((lista) =>
          (lista ?? [])
            // Solo los de todo el país, no los regionales
            .filter((f) => f.global)
            .map((f) => ({ fecha: f.date, nombreLocal: f.localName, nombre: f.name }))
        )
      );
  }
}

/** Convierte entre dos monedas pasando por el dólar. */
export function convertir(monto: number, de: string, a: string, cambio: TiposDeCambio): number | null {
  const tasaDe = cambio.porDolar[de];
  const tasaA = cambio.porDolar[a];
  if (!tasaDe || !tasaA) return null;
  return (monto / tasaDe) * tasaA;
}
