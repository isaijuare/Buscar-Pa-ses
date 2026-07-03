import { Component, inject, signal, computed } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { CountryService } from '../../services/country';
import { WeatherApiResponse } from '../../models/country';

@Component({
  selector: 'app-clima',
  standalone: true,
  templateUrl: './clima.html',
  styleUrl: './clima.css'
})
export class ClimaComponent {
  private route = inject(ActivatedRoute);
  private countryService = inject(CountryService);

  nombrePais = signal<string | null>(null);
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
    this.route.queryParamMap.subscribe((params) => {
      const lat = params.get('lat');
      const lon = params.get('lon');
      this.nombrePais.set(params.get('nombre'));

      if (lat && lon) {
        this.cargarClima(Number(lat), Number(lon));
      } else {
        this.error.set('Faltan coordenadas para consultar el clima.');
      }
    });
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