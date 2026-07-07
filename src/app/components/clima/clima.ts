import { Component, effect, inject, input, output, signal, computed } from '@angular/core';
import { CountryService } from '../../services/country';
import { WeatherApiResponse } from '../../models/country';

@Component({
  selector: 'app-clima',
  standalone: true,
  templateUrl: './clima.html',
  styleUrl: './clima.css'
})
export class ClimaComponent {
  private countryService = inject(CountryService);

  // Ya no viene de la URL: el modal se lo pasa directo.
  lat = input<number | null>(null);
  lon = input<number | null>(null);
  nombrePais = input<string | null>(null);

  cerrar = output<void>();

  datos = signal<WeatherApiResponse | null>(null);
  cargando = signal(false);
  error = signal<string | null>(null);

  temperaturaActual = computed(() => this.datos()?.hourly.temperature_2m[0] ?? null);
  unidad = computed(() => this.datos()?.hourly_units.temperature_2m ?? '');

  proximasHoras = computed(() => {
    const d = this.datos();
    if (!d) return [];
    return d.hourly.time.slice(0, 6).map((hora, i) => ({
      hora,
      temperatura: d.hourly.temperature_2m[i]
    }));
  });

  constructor() {
    effect(() => {
      const lat = this.lat();
      const lon = this.lon();

      if (lat != null && lon != null) {
        this.cargarClima(lat, lon);
      } else {
        this.error.set('Faltan coordenadas para consultar el clima.');
      }
    });
  }

  onCerrar(): void {
    this.cerrar.emit();
  }

  private cargarClima(lat: number, lon: number): void {
    this.cargando.set(true);
    this.error.set(null);

    this.countryService.obtenerClima(lat, lon).subscribe({
      next: (respuesta) => {
        this.datos.set(respuesta);
        this.cargando.set(false);
      },
      error: () => {
        this.error.set('No se pudo cargar el clima.');
        this.cargando.set(false);
      }
    });
  }
}