import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map, shareReplay } from 'rxjs';
import { CalidadAireApiResponse, PronosticoApiResponse } from '../models/cielo';

@Injectable({ providedIn: 'root' })
export class TiempoService {
  private http = inject(HttpClient);
  private baseUrl = 'https://api.open-meteo.com/v1/forecast';

  // El fondo del cielo y la tarjeta del clima piden lo mismo: se comparte durante 10 minutos
  private pronosticos = new Map<string, { datos$: Observable<PronosticoApiResponse>; vence: number }>();

  /** Clima actual, por hora y diario. Las horas vienen en la zona horaria del lugar. */
  obtenerPronostico(lat: number, lon: number): Observable<PronosticoApiResponse> {
    const clave = `${lat.toFixed(3)},${lon.toFixed(3)}`;
    const guardado = this.pronosticos.get(clave);
    if (guardado && guardado.vence > Date.now()) return guardado.datos$;

    const params = new URLSearchParams({
      latitude: String(lat),
      longitude: String(lon),
      current:
        'temperature_2m,apparent_temperature,relative_humidity_2m,is_day,weather_code,' +
        'wind_speed_10m,wind_direction_10m,pressure_msl,cloud_cover',
      hourly: 'temperature_2m,weather_code,precipitation_probability,is_day',
      daily: 'temperature_2m_max,temperature_2m_min,sunrise,sunset,uv_index_max',
      timezone: 'auto',
      forecast_days: '2'
    });
    const datos$ = this.http.get<PronosticoApiResponse>(`${this.baseUrl}?${params}`).pipe(shareReplay(1));
    this.pronosticos.set(clave, { datos$, vence: Date.now() + 10 * 60000 });
    return datos$;
  }

  private zonas = new Map<string, Observable<string>>();

  /** Zona horaria IANA del lugar (p. ej. "Asia/Tokyo"), con horario de verano incluido. */
  obtenerZonaHoraria(lat: number, lon: number): Observable<string> {
    const clave = `${lat.toFixed(2)},${lon.toFixed(2)}`;
    let zona$ = this.zonas.get(clave);
    if (!zona$) {
      zona$ = this.http
        .get<{ timezone: string }>(
          `${this.baseUrl}?latitude=${lat}&longitude=${lon}&timezone=auto&forecast_days=1&current=is_day`
        )
        .pipe(
          map((r) => r.timezone),
          shareReplay(1)
        );
      this.zonas.set(clave, zona$);
    }
    return zona$;
  }

  /** Calidad del aire actual. El polen solo está disponible en Europa. */
  obtenerCalidadAire(lat: number, lon: number): Observable<CalidadAireApiResponse> {
    const params = new URLSearchParams({
      latitude: String(lat),
      longitude: String(lon),
      current:
        'us_aqi,pm2_5,pm10,ozone,nitrogen_dioxide,' +
        'alder_pollen,birch_pollen,grass_pollen,mugwort_pollen,olive_pollen,ragweed_pollen',
      timezone: 'auto'
    });
    return this.http.get<CalidadAireApiResponse>(`https://air-quality-api.open-meteo.com/v1/air-quality?${params}`);
  }
}

/** Descripción e ícono para los códigos de tiempo WMO que usa Open-Meteo. */
export function describirCodigo(codigo: number, esDeDia = true): { texto: string; icono: string } {
  if (codigo === 0) return { texto: 'Despejado', icono: esDeDia ? '☀️' : '🌙' };
  if (codigo === 1) return { texto: 'Mayormente despejado', icono: esDeDia ? '🌤️' : '🌙' };
  if (codigo === 2) return { texto: 'Parcialmente nublado', icono: esDeDia ? '⛅' : '☁️' };
  if (codigo === 3) return { texto: 'Nublado', icono: '☁️' };
  if (codigo === 45 || codigo === 48) return { texto: 'Niebla', icono: '🌫️' };
  if (codigo >= 51 && codigo <= 57) return { texto: 'Llovizna', icono: '🌦️' };
  if (codigo >= 61 && codigo <= 67) return { texto: codigo >= 65 ? 'Lluvia fuerte' : 'Lluvia', icono: '🌧️' };
  if (codigo >= 71 && codigo <= 77) return { texto: 'Nieve', icono: '🌨️' };
  if (codigo >= 80 && codigo <= 82) return { texto: 'Chubascos', icono: '🌦️' };
  if (codigo === 85 || codigo === 86) return { texto: 'Chubascos de nieve', icono: '🌨️' };
  if (codigo === 95) return { texto: 'Tormenta', icono: '⛈️' };
  if (codigo === 96 || codigo === 99) return { texto: 'Tormenta con granizo', icono: '⛈️' };
  return { texto: 'Sin datos', icono: '🌡️' };
}

export function direccionViento(grados: number): string {
  const puntos = ['N', 'NE', 'E', 'SE', 'S', 'SO', 'O', 'NO'];
  return puntos[Math.round(grados / 45) % 8];
}

export function nivelUv(indice: number): string {
  if (indice < 3) return 'Bajo';
  if (indice < 6) return 'Moderado';
  if (indice < 8) return 'Alto';
  if (indice < 11) return 'Muy alto';
  return 'Extremo';
}
