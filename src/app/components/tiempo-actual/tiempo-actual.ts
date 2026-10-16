import { Component, DestroyRef, computed, effect, inject, input, signal } from '@angular/core';
import { Subscription } from 'rxjs';
import { PronosticoApiResponse, Ubicacion } from '../../models/cielo';
import { TiempoService, describirCodigo, direccionViento, nivelUv } from '../../services/tiempo';

@Component({
  selector: 'app-tiempo-actual',
  standalone: true,
  templateUrl: './tiempo-actual.html',
  styleUrl: './tiempo-actual.css'
})
export class TiempoActualComponent {
  private tiempoService = inject(TiempoService);

  ubicacion = input.required<Ubicacion>();

  datos = signal<PronosticoApiResponse | null>(null);
  cargando = signal(false);
  error = signal<string | null>(null);

  private peticion?: Subscription;

  actual = computed(() => {
    const d = this.datos();
    if (!d) return null;
    const c = d.current;
    return {
      ...describirCodigo(c.weather_code, c.is_day === 1),
      temperatura: Math.round(c.temperature_2m),
      sensacion: Math.round(c.apparent_temperature),
      humedad: c.relative_humidity_2m,
      viento: Math.round(c.wind_speed_10m),
      direccion: direccionViento(c.wind_direction_10m),
      presion: Math.round(c.pressure_msl),
      nubosidad: c.cloud_cover,
      maxima: Math.round(d.daily.temperature_2m_max[0]),
      minima: Math.round(d.daily.temperature_2m_min[0]),
      uv: Math.round(d.daily.uv_index_max[0]),
      nivelUv: nivelUv(d.daily.uv_index_max[0]),
      // Las horas vienen como "2026-10-16T05:53" en la zona horaria del lugar
      amanecer: d.daily.sunrise[0].slice(11, 16),
      atardecer: d.daily.sunset[0].slice(11, 16),
      horaLocal: c.time.slice(11, 16)
    };
  });

  // Próximas 12 horas a partir de la hora actual del lugar
  proximasHoras = computed(() => {
    const d = this.datos();
    if (!d) return [];
    const horaActual = d.current.time.slice(0, 13);
    const inicio = Math.max(0, d.hourly.time.findIndex((t) => t.startsWith(horaActual)));

    return d.hourly.time.slice(inicio, inicio + 12).map((hora, i) => {
      const j = inicio + i;
      return {
        hora: i === 0 ? 'Ahora' : hora.slice(11, 16),
        icono: describirCodigo(d.hourly.weather_code[j], d.hourly.is_day[j] === 1).icono,
        temperatura: Math.round(d.hourly.temperature_2m[j]),
        lluvia: d.hourly.precipitation_probability[j] ?? 0
      };
    });
  });

  constructor() {
    effect(() => {
      const { lat, lon } = this.ubicacion();
      this.cargar(lat, lon);
    });
    inject(DestroyRef).onDestroy(() => this.peticion?.unsubscribe());
  }

  private cargar(lat: number, lon: number): void {
    // Si cambia la ubicación antes de que responda, se descarta la petición anterior
    this.peticion?.unsubscribe();
    this.cargando.set(true);
    this.error.set(null);

    this.peticion = this.tiempoService.obtenerPronostico(lat, lon).subscribe({
      next: (respuesta) => {
        this.datos.set(respuesta);
        this.cargando.set(false);
      },
      error: () => {
        this.error.set('No se pudo cargar el clima de tu zona.');
        this.cargando.set(false);
      }
    });
  }
}
