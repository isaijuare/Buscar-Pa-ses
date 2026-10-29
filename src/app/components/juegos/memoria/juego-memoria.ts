import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { NombreEstacion } from '../../../services/astronomia';
import { RecordsJuegosService } from '../../../services/records-juegos';
import { TablaRankingComponent } from '../tabla-ranking';

/** Dos símbolos por estación: 8 pares, 16 cartas */
const SIMBOLOS: { icono: string; nombre: string; estacion: NombreEstacion }[] = [
  { icono: '🌸', nombre: 'Flor de cerezo', estacion: 'Primavera' },
  { icono: '🌷', nombre: 'Tulipán', estacion: 'Primavera' },
  { icono: '☀️', nombre: 'Sol', estacion: 'Verano' },
  { icono: '🍉', nombre: 'Sandía', estacion: 'Verano' },
  { icono: '🍂', nombre: 'Hojas secas', estacion: 'Otoño' },
  { icono: '🍄', nombre: 'Hongo', estacion: 'Otoño' },
  { icono: '❄️', nombre: 'Copo de nieve', estacion: 'Invierno' },
  { icono: '⛄', nombre: 'Muñeco de nieve', estacion: 'Invierno' }
];
// Tiempo que se ven dos cartas distintas antes de darse vuelta otra vez
const ESPERA_MS = 900;

export interface Carta {
  id: number;
  icono: string;
  nombre: string;
  estacion: NombreEstacion;
  boca: 'abajo' | 'arriba' | 'encontrada';
}

export function barajar<T>(lista: T[], aleatorio = Math.random): T[] {
  const copia = [...lista];
  for (let i = copia.length - 1; i > 0; i--) {
    const j = Math.floor(aleatorio() * (i + 1));
    [copia[i], copia[j]] = [copia[j], copia[i]];
  }
  return copia;
}

export function crearMazo(aleatorio = Math.random): Carta[] {
  return barajar([...SIMBOLOS, ...SIMBOLOS], aleatorio).map((s, id) => ({ ...s, id, boca: 'abajo' as const }));
}

@Component({
  selector: 'app-juego-memoria',
  standalone: true,
  imports: [RouterLink, TablaRankingComponent],
  templateUrl: './juego-memoria.html',
  styleUrls: ['../juegos.css', './juego-memoria.css']
})
export class JuegoMemoriaComponent {
  protected records = inject(RecordsJuegosService);

  readonly pares = SIMBOLOS.length;
  readonly formatoPuntaje = (p: number) => `${p} movimientos`;

  cartas = signal<Carta[]>(crearMazo());
  movimientos = signal(0);
  segundos = signal(0);
  /** Último par encontrado, para anunciar a qué estación pertenece */
  ultimoPar = signal<Carta | null>(null);
  nuevoRecord = signal(false);
  private bloqueado = false;

  encontradas = computed(() => this.cartas().filter((c) => c.boca === 'encontrada').length / 2);
  terminado = computed(() => this.encontradas() === this.pares);
  record = computed(() => this.records.propios().memoria);
  tiempo = computed(() => {
    const s = this.segundos();
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
  });

  mensajeFinal = computed(() => {
    const m = this.movimientos();
    if (m <= this.pares + 2) return '¡Memoria de elefante! Casi sin errores. 🏆';
    if (m <= this.pares * 2) return '¡Muy bien! Recorriste las cuatro estaciones. 🌍';
    return '¡Lo lograste! Juega otra vez para bajar tus movimientos. 🍂';
  });

  private reloj?: ReturnType<typeof setInterval>;
  private espera?: ReturnType<typeof setTimeout>;

  constructor() {
    inject(DestroyRef).onDestroy(() => this.detener());
  }

  voltear(carta: Carta): void {
    if (this.bloqueado || carta.boca !== 'abajo' || this.terminado()) return;
    // El reloj empieza con la primera carta
    if (!this.reloj) this.reloj = setInterval(() => this.segundos.update((s) => s + 1), 1000);

    this.cambiar(carta.id, 'arriba');
    const arriba = this.cartas().filter((c) => c.boca === 'arriba');
    if (arriba.length < 2) return;

    this.movimientos.update((m) => m + 1);
    const [a, b] = arriba;
    if (a.icono === b.icono) {
      this.cambiar(a.id, 'encontrada');
      this.cambiar(b.id, 'encontrada');
      this.ultimoPar.set(a);
      if (this.terminado()) this.terminar();
    } else {
      this.bloqueado = true;
      this.espera = setTimeout(() => {
        this.cambiar(a.id, 'abajo');
        this.cambiar(b.id, 'abajo');
        this.bloqueado = false;
      }, ESPERA_MS);
    }
  }

  reiniciar(): void {
    this.detener();
    this.cartas.set(crearMazo());
    this.movimientos.set(0);
    this.segundos.set(0);
    this.ultimoPar.set(null);
    this.nuevoRecord.set(false);
    this.bloqueado = false;
  }

  etiqueta(carta: Carta): string {
    return carta.boca === 'abajo' ? `Carta ${carta.id + 1}, boca abajo` : `${carta.nombre} (${carta.estacion})`;
  }

  private terminar(): void {
    this.detener();
    this.nuevoRecord.set(this.records.registrar('memoria', this.movimientos()));
  }

  private cambiar(id: number, boca: Carta['boca']): void {
    this.cartas.update((cartas) => cartas.map((c) => (c.id === id ? { ...c, boca } : c)));
  }

  private detener(): void {
    clearInterval(this.reloj);
    clearTimeout(this.espera);
    this.reloj = undefined;
  }
}
