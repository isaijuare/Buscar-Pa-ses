import { Component, DestroyRef, computed, effect, inject, input, signal, untracked } from '@angular/core';
import { Subscription } from 'rxjs';
import { Ubicacion } from '../../models/cielo';
import { NOMBRE_ECLIPSE, planetasVisibles, proximosEclipses } from '../../services/astronomia';
import { EstacionEspacialService, PasoEstacion } from '../../services/estacion-espacial';
import { formatoFechaCorta, formatoFechaLarga, formatoHora, tiempoRelativo } from '../../utils/formato';

const ICONO_PLANETA: Record<string, string> = {
  Mercurio: '☿',
  Venus: '♀',
  Marte: '♂',
  Júpiter: '♃',
  Saturno: '♄'
};

function textoBrillo(magnitud: number): string {
  if (magnitud < -2) return 'muy brillante';
  if (magnitud < 0.5) return 'brillante';
  if (magnitud < 2) return 'visible a simple vista';
  return 'débil';
}

@Component({
  selector: 'app-cielo-nocturno',
  standalone: true,
  templateUrl: './cielo-nocturno.html',
  styleUrl: './cielo-nocturno.css'
})
export class CieloNocturnoComponent {
  private estacionService = inject(EstacionEspacialService);

  ubicacion = input.required<Ubicacion>();
  ahora = input.required<Date>();
  zona = input<string | undefined>(undefined);

  private pasos = signal<PasoEstacion[] | null>(null);
  errorEstacion = signal(false);
  private peticion?: Subscription;

  planetas = computed(() => {
    const { lat, lon } = this.ubicacion();
    const zona = this.zona();
    return planetasVisibles(this.ahora(), lat, lon).map((p) => ({
      nombre: p.nombre,
      icono: ICONO_PLANETA[p.nombre],
      mejorHora: formatoHora(p.mejorHora, zona),
      desde: formatoHora(p.desde, zona),
      hasta: formatoHora(p.hasta, zona),
      altura: Math.round(p.alturaMaxima),
      rumbo: p.rumbo,
      brillo: textoBrillo(p.magnitud)
    }));
  });

  pasosEstacion = computed(() => {
    const pasos = this.pasos();
    if (!pasos) return null;
    const zona = this.zona();
    const ahora = this.ahora();
    return pasos
      .filter((p) => p.fin > ahora)
      .slice(0, 3)
      .map((p) => ({
        clave: p.inicio.valueOf(),
        fecha: formatoFechaCorta(p.inicio, zona),
        hora: formatoHora(p.inicio, zona),
        minutos: Math.max(1, Math.round((p.fin.valueOf() - p.inicio.valueOf()) / 60000)),
        altura: Math.round(p.alturaMaxima),
        desde: p.desde,
        hacia: p.hacia,
        falta: tiempoRelativo(p.inicio, ahora)
      }));
  });

  eclipses = computed(() => {
    const { lat, lon } = this.ubicacion();
    const zona = this.zona();
    const ahora = this.ahora();
    return proximosEclipses(ahora, 4, lat, lon).map((e) => {
      const lunar = e.tipo.startsWith('lunar');
      return {
        clave: e.fecha.valueOf(),
        nombre: NOMBRE_ECLIPSE[e.tipo],
        icono: lunar ? '🌘' : '🌑',
        fecha: formatoFechaLarga(e.fecha, zona),
        hora: formatoHora(e.fecha, zona),
        falta: tiempoRelativo(e.fecha, ahora),
        // En un eclipse lunar basta con que la Luna esté sobre el horizonte; en uno solar, solo
        // se sabe si es de día (la franja de visibilidad es estrecha)
        visibilidad: lunar
          ? e.astroSobreHorizonte
            ? 'Visible desde aquí'
            : 'No visible desde aquí (la Luna estará bajo el horizonte)'
          : e.astroSobreHorizonte
            ? 'Será de día aquí: podría verse, según la franja del eclipse'
            : 'No visible desde aquí (será de noche)',
        visible: e.astroSobreHorizonte
      };
    });
  });

  constructor() {
    effect(() => {
      const { lat, lon } = this.ubicacion();
      untracked(() => this.cargarEstacion(lat, lon));
    });
    inject(DestroyRef).onDestroy(() => this.peticion?.unsubscribe());
  }

  private cargarEstacion(lat: number, lon: number): void {
    this.peticion?.unsubscribe();
    this.pasos.set(null);
    this.errorEstacion.set(false);
    this.peticion = this.estacionService.pasosVisibles(lat, lon).subscribe({
      next: (pasos) => this.pasos.set(pasos),
      error: () => this.errorEstacion.set(true)
    });
  }
}
