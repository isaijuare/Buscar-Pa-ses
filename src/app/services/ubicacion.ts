import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, map, of, switchMap, timeout } from 'rxjs';
import { GeocodificacionApiResponse, Ubicacion } from '../models/cielo';

// Se usa si fallan tanto el GPS como la ubicación por IP
export const UBICACION_PREDETERMINADA: Ubicacion = {
  lat: 19.4326,
  lon: -99.1332,
  nombre: 'Ciudad de México, México',
  fuente: 'predeterminada'
};

@Injectable({ providedIn: 'root' })
export class UbicacionService {
  private http = inject(HttpClient);

  // Gratuito y sin API key; sin coordenadas, ubica por la IP del visitante
  private geoUrl = 'https://api.bigdatacloud.net/data/reverse-geocode-client';

  // Ubicación compartida por el panel del cielo y la barra de lugares turísticos
  actual = signal<Ubicacion | null>(null);
  buscandoGps = signal(false);
  avisoGps = signal<string | null>(null);

  private iniciada = false;

  /** Resuelve la ubicación una sola vez. Llamar solo en el navegador. */
  async iniciar(): Promise<void> {
    if (this.iniciada) return;
    this.iniciada = true;

    // Respaldo: si en 8 s no hay ninguna ubicación, la página no se queda vacía
    setTimeout(() => {
      if (!this.actual()) this.actual.set(UBICACION_PREDETERMINADA);
    }, 8000);

    // Si ya dio permiso antes se usa el GPS; si no, la ubicación aproximada sin preguntar
    if (await this.gpsAutorizado()) {
      this.usarGps();
    } else {
      this.cargarPorIp();
    }
  }

  usarGps(): void {
    this.buscandoGps.set(true);
    this.avisoGps.set(null);

    this.obtenerPorGps().subscribe({
      next: (ubicacion) => {
        this.actual.set(ubicacion);
        this.buscandoGps.set(false);
      },
      error: () => {
        this.buscandoGps.set(false);
        this.avisoGps.set('No se pudo acceder a tu ubicación exacta; se muestra una aproximada.');
        if (!this.actual()) this.cargarPorIp();
      }
    });
  }

  private cargarPorIp(): void {
    this.obtenerPorIp().subscribe((ubicacion) => this.actual.set(ubicacion));
  }

  /** Ubicación aproximada por IP: no pide permiso al usuario. */
  obtenerPorIp(): Observable<Ubicacion> {
    return this.http.get<GeocodificacionApiResponse>(`${this.geoUrl}?localityLanguage=es`).pipe(
      map((r) => ({
        lat: r.latitude,
        lon: r.longitude,
        nombre: this.armarNombre(r),
        fuente: 'ip' as const
      })),
      timeout(6000),
      catchError(() => of(UBICACION_PREDETERMINADA))
    );
  }

  /** Ubicación exacta del navegador (pide permiso la primera vez). */
  obtenerPorGps(): Observable<Ubicacion> {
    return new Observable<GeolocationCoordinates>((suscriptor) => {
      navigator.geolocation.getCurrentPosition(
        (posicion) => {
          suscriptor.next(posicion.coords);
          suscriptor.complete();
        },
        (error) => suscriptor.error(error),
        { timeout: 10000, maximumAge: 10 * 60 * 1000 }
      );
    }).pipe(
      switchMap((coords) =>
        this.http
          .get<GeocodificacionApiResponse>(
            `${this.geoUrl}?latitude=${coords.latitude}&longitude=${coords.longitude}&localityLanguage=es`
          )
          .pipe(
            map((r) => this.armarNombre(r)),
            timeout(6000),
            catchError(() => of('Tu ubicación')),
            map((nombre) => ({
              lat: coords.latitude,
              lon: coords.longitude,
              nombre,
              fuente: 'gps' as const
            }))
          )
      )
    );
  }

  /** true si el usuario ya autorizó la geolocalización antes (así no se le pregunta). */
  async gpsAutorizado(): Promise<boolean> {
    try {
      // Algunos navegadores nunca responden esta consulta: se espera como máximo 1,5 s
      const estado = await Promise.race([
        navigator.permissions.query({ name: 'geolocation' }),
        new Promise<null>((resolver) => setTimeout(() => resolver(null), 1500))
      ]);
      return estado?.state === 'granted';
    } catch {
      return false;
    }
  }

  private armarNombre(r: GeocodificacionApiResponse): string {
    const lugar = r.city || r.locality || r.principalSubdivision;
    return [lugar, r.countryName].filter(Boolean).join(', ') || 'Tu ubicación';
  }
}
