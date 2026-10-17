import { Component, DestroyRef, computed, effect, inject, input, signal, untracked } from '@angular/core';
import { Subscription } from 'rxjs';
import { CalidadAireApiResponse, Ubicacion } from '../../models/cielo';
import { TiempoService } from '../../services/tiempo';

// Escala oficial del AQI de EE. UU.
const NIVELES = [
  { hasta: 50, nombre: 'Buena', color: '#3ccf6e', consejo: 'Aire limpio: ideal para actividades al aire libre.' },
  { hasta: 100, nombre: 'Moderada', color: '#f5d43b', consejo: 'Aceptable; las personas muy sensibles pueden notar molestias.' },
  { hasta: 150, nombre: 'Dañina para grupos sensibles', color: '#ff9b3d', consejo: 'Niños, mayores y personas con asma: limiten el esfuerzo al aire libre.' },
  { hasta: 200, nombre: 'Dañina', color: '#ff5a5f', consejo: 'Conviene reducir el ejercicio intenso al aire libre.' },
  { hasta: 300, nombre: 'Muy dañina', color: '#b05cd6', consejo: 'Evita las actividades prolongadas al aire libre.' },
  { hasta: Infinity, nombre: 'Peligrosa', color: '#8b1e3f', consejo: 'Permanece en interiores en lo posible.' }
];

const POLENES: [keyof CalidadAireApiResponse['current'], string][] = [
  ['grass_pollen', 'Gramíneas'],
  ['birch_pollen', 'Abedul'],
  ['alder_pollen', 'Aliso'],
  ['olive_pollen', 'Olivo'],
  ['mugwort_pollen', 'Artemisa'],
  ['ragweed_pollen', 'Ambrosía']
];

@Component({
  selector: 'app-calidad-aire',
  standalone: true,
  templateUrl: './calidad-aire.html',
  styleUrl: './calidad-aire.css'
})
export class CalidadAireComponent {
  private tiempoService = inject(TiempoService);

  ubicacion = input.required<Ubicacion>();

  datos = signal<CalidadAireApiResponse | null>(null);
  error = signal(false);
  private peticion?: Subscription;

  resumen = computed(() => {
    const c = this.datos()?.current;
    if (!c || c.us_aqi == null) return null;
    const nivel = NIVELES.find((n) => c.us_aqi! <= n.hasta)!;
    return {
      indice: Math.round(c.us_aqi),
      ...nivel,
      // Posición del indicador en la barra (0 a 300+)
      posicion: Math.min(100, (c.us_aqi / 300) * 100),
      contaminantes: [
        { nombre: 'PM2.5', valor: c.pm2_5 },
        { nombre: 'PM10', valor: c.pm10 },
        { nombre: 'Ozono', valor: c.ozone },
        { nombre: 'NO₂', valor: c.nitrogen_dioxide }
      ].filter((x) => x.valor != null)
    };
  });

  // null = no hay datos de polen para esta región (fuera de Europa)
  polen = computed(() => {
    const c = this.datos()?.current;
    if (!c) return null;
    const conDatos = POLENES.filter(([clave]) => c[clave] != null);
    if (!conDatos.length) return null;
    return conDatos.map(([clave, nombre]) => {
      const valor = Number(c[clave]);
      const nivel = valor < 10 ? 'Bajo' : valor < 50 ? 'Moderado' : valor < 200 ? 'Alto' : 'Muy alto';
      return { nombre, valor: Math.round(valor), nivel };
    });
  });

  constructor() {
    effect(() => {
      const { lat, lon } = this.ubicacion();
      untracked(() => this.cargar(lat, lon));
    });
    inject(DestroyRef).onDestroy(() => this.peticion?.unsubscribe());
  }

  private cargar(lat: number, lon: number): void {
    this.peticion?.unsubscribe();
    this.error.set(false);
    this.peticion = this.tiempoService.obtenerCalidadAire(lat, lon).subscribe({
      next: (r) => this.datos.set(r),
      error: () => this.error.set(true)
    });
  }
}
