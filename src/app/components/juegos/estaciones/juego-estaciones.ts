import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CountryService } from '../../../services/country';
import { RecordsJuegosService } from '../../../services/records-juegos';
import { NombreEstacion, estadoEstacion, eventosDelAnio } from '../../../services/astronomia';
import { CountryApiResponse, nombreEnEspanol } from '../../../models/country';
import { TablaRankingComponent } from '../tabla-ranking';

const TOTAL_PREGUNTAS = 10;
// Fuera de los trópicos (23,44°) las cuatro estaciones están bien marcadas
const LATITUD_MINIMA = 23.5;
// No se pregunta por fechas a menos de estos días de un equinoccio o solsticio (serían dudosas)
const MARGEN_DIAS = 5;
const DIA_MS = 86_400_000;

export const ESTACIONES: { nombre: NombreEstacion; icono: string }[] = [
  { nombre: 'Primavera', icono: '🌸' },
  { nombre: 'Verano', icono: '☀️' },
  { nombre: 'Otoño', icono: '🍂' },
  { nombre: 'Invierno', icono: '❄️' }
];

interface Lugar {
  pais: CountryApiResponse;
  ciudad: string;
  lat: number;
}

export interface PreguntaEstacion {
  lugar: Lugar;
  fecha: Date;
  correcta: NombreEstacion;
  hemisferio: 'norte' | 'sur';
  /** Fechas en que empieza y termina esa estación ese año */
  desde: Date;
  hasta: Date;
}

const azar = <T>(lista: T[]): T => lista[Math.floor(Math.random() * lista.length)];
const formatoDia = new Intl.DateTimeFormat('es', { day: 'numeric', month: 'long', timeZone: 'UTC' });

/** Arma una pregunta: un lugar y una fecha lejos de los cambios de estación. */
export function crearPregunta(lugar: Lugar, anio: number, aleatorio = Math.random): PreguntaEstacion {
  const eventos = eventosDelAnio(anio, lugar.lat).map((e) => e.fecha.valueOf());
  let fecha: Date;
  do {
    // Mediodía UTC de un día cualquiera del año
    fecha = new Date(Date.UTC(anio, 0, 1 + Math.floor(aleatorio() * 365), 12));
  } while (eventos.some((e) => Math.abs(e - fecha.valueOf()) < MARGEN_DIAS * DIA_MS));

  const estado = estadoEstacion(fecha, lugar.lat);
  return {
    lugar,
    fecha,
    correcta: estado.actual.estacion,
    hemisferio: estado.hemisferio,
    desde: estado.actual.fecha,
    hasta: estado.siguiente.fecha
  };
}

@Component({
  selector: 'app-juego-estaciones',
  standalone: true,
  imports: [RouterLink, TablaRankingComponent],
  templateUrl: './juego-estaciones.html',
  styleUrls: ['../juegos.css', './juego-estaciones.css']
})
export class JuegoEstacionesComponent {
  protected records = inject(RecordsJuegosService);

  readonly total = TOTAL_PREGUNTAS;
  readonly estaciones = ESTACIONES;
  readonly formatoPuntaje = (p: number) => `${p}/${TOTAL_PREGUNTAS}`;
  readonly dia = (f: Date) => formatoDia.format(f);

  private lugares = signal<{ norte: Lugar[]; sur: Lugar[] }>({ norte: [], sur: [] });
  error = signal(false);
  listo = computed(() => this.lugares().norte.length > 0 && this.lugares().sur.length > 0);

  jugando = signal(false);
  preguntas = signal<PreguntaEstacion[]>([]);
  indice = signal(0);
  respuesta = signal<NombreEstacion | null>(null);
  aciertos = signal(0);
  nuevoRecord = signal(false);

  actual = computed(() => this.preguntas()[this.indice()] ?? null);
  terminado = computed(() => this.jugando() && this.indice() >= TOTAL_PREGUNTAS);
  progreso = computed(() => (this.indice() / TOTAL_PREGUNTAS) * 100);
  record = computed(() => this.records.propios().estaciones);

  mensajeFinal = computed(() => {
    const n = this.aciertos();
    if (n === TOTAL_PREGUNTAS) return '¡Perfecto! Dominas las estaciones de los dos hemisferios. 🏆';
    if (n >= 7) return '¡Muy bien! Ya sabes que en el sur las estaciones van al revés. 🌍';
    if (n >= 4) return 'Nada mal. Fíjate en el hemisferio antes de responder. 🧭';
    return 'Pista: cuando en el norte es verano, en el sur es invierno. 📚';
  });

  constructor() {
    const sub = inject(CountryService)
      .obtenerTodos()
      .subscribe({
        next: (todos) => {
          const lugares = todos
            .filter((p) => p.population >= 300_000 && p.capitals?.[0]?.coordinates)
            .map((p) => ({ pais: p, ciudad: p.capitals![0].name, lat: p.capitals![0].coordinates!.lat }))
            .filter((l) => Math.abs(l.lat) >= LATITUD_MINIMA);
          this.lugares.set({ norte: lugares.filter((l) => l.lat > 0), sur: lugares.filter((l) => l.lat < 0) });
        },
        error: () => this.error.set(true)
      });
    inject(DestroyRef).onDestroy(() => sub.unsubscribe());
  }

  empezar(): void {
    const { norte, sur } = this.lugares();
    const anio = new Date().getFullYear();
    // Mitad y mitad entre hemisferios (al azar), para que el truco del sur aparezca seguido
    const preguntas = Array.from({ length: TOTAL_PREGUNTAS }, () =>
      crearPregunta(azar(Math.random() < 0.5 ? norte : sur), anio)
    );
    this.preguntas.set(preguntas);
    this.indice.set(0);
    this.aciertos.set(0);
    this.respuesta.set(null);
    this.nuevoRecord.set(false);
    this.jugando.set(true);
  }

  responder(estacion: NombreEstacion): void {
    if (this.respuesta() !== null) return;
    this.respuesta.set(estacion);
    if (estacion === this.actual()?.correcta) this.aciertos.update((n) => n + 1);
  }

  siguiente(): void {
    this.respuesta.set(null);
    this.indice.update((i) => i + 1);
    if (this.terminado()) this.nuevoRecord.set(this.records.registrar('estaciones', this.aciertos()));
  }

  salir(): void {
    this.jugando.set(false);
  }

  nombre(p: CountryApiResponse): string {
    return nombreEnEspanol(p);
  }

  icono(estacion: NombreEstacion): string {
    return ESTACIONES.find((e) => e.nombre === estacion)!.icono;
  }
}
