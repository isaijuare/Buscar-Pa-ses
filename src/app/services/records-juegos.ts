import { Injectable, PLATFORM_ID, effect, inject, signal, untracked } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { AuthService } from './auth';
import { ModoJuego, REGLAS_JUEGOS, RecordsQuiz } from '../models/usuario';

/** Juegos de la sección Entretenimiento (el quiz maneja sus récords por su cuenta). */
export type JuegoEntretenimiento = 'estaciones' | 'memoria';
const JUEGOS: JuegoEntretenimiento[] = ['estaciones', 'memoria'];
const CLAVE = 'buscador-paises:records-juegos';

/** ¿`nuevo` supera a `actual`? En Memoria gana el menor; en los demás, el mayor. */
export function esMejor(modo: ModoJuego, nuevo: number, actual: number | null | undefined): boolean {
  if (actual == null) return true;
  return REGLAS_JUEGOS[modo].menorEsMejor ? nuevo < actual : nuevo > actual;
}

/**
 * Récords de los juegos: sin sesión se guardan en el navegador; con sesión, también en la cuenta
 * (los logrados antes de iniciar sesión se suben al entrar). El ranking es de todos los usuarios.
 */
@Injectable({ providedIn: 'root' })
export class RecordsJuegosService {
  private http = inject(HttpClient);
  private auth = inject(AuthService);
  private enNavegador = isPlatformBrowser(inject(PLATFORM_ID));

  propios = signal<Partial<Record<JuegoEntretenimiento, number>>>(this.leerLocal());
  /** null mientras carga o si no hay conexión */
  ranking = signal<RecordsQuiz['ranking'] | null>(null);

  constructor() {
    // Al iniciar o cerrar sesión cambian los récords propios y quién aparece como "tú"
    effect(() => {
      this.auth.usuario();
      if (this.enNavegador) untracked(() => this.cargar());
    });
  }

  /** Guarda el puntaje si es récord; devuelve true si lo fue. */
  registrar(modo: JuegoEntretenimiento, puntaje: number): boolean {
    if (!esMejor(modo, puntaje, this.propios()[modo])) return false;
    this.propios.update((p) => ({ ...p, [modo]: puntaje }));
    this.guardarLocal();
    this.subir(modo, puntaje);
    return true;
  }

  private cargar(): void {
    this.http.get<RecordsQuiz>('/api/usuario/records').subscribe({
      next: ({ propios, ranking }) => {
        this.ranking.set(ranking);
        if (!propios) return;
        const local = this.propios();
        const juntos: Partial<Record<JuegoEntretenimiento, number>> = { ...local };
        for (const m of JUEGOS) {
          const cuenta = propios[m];
          // En los juegos de aciertos el servidor manda 0 cuando no hay récord
          const hayEnCuenta = cuenta != null && !(cuenta === 0 && !REGLAS_JUEGOS[m].menorEsMejor);
          if (hayEnCuenta && esMejor(m, cuenta, juntos[m])) juntos[m] = cuenta;
          // Récords logrados sin sesión que mejoran el de la cuenta: se suben
          if (local[m] != null && esMejor(m, local[m]!, hayEnCuenta ? cuenta : null)) this.subir(m, local[m]!);
        }
        this.propios.set(juntos);
        this.guardarLocal();
      },
      error: () => this.ranking.set(null)
    });
  }

  private subir(modo: JuegoEntretenimiento, puntaje: number): void {
    if (!this.auth.conectado()) return;
    this.http.post<RecordsQuiz>('/api/usuario/records', { modo, puntaje }).subscribe({
      next: ({ ranking }) => this.ranking.set(ranking),
      error: () => {}
    });
  }

  private leerLocal(): Partial<Record<JuegoEntretenimiento, number>> {
    if (!this.enNavegador) return {};
    try {
      const valor = JSON.parse(localStorage.getItem(CLAVE) ?? '{}');
      return typeof valor === 'object' && valor ? valor : {};
    } catch {
      return {};
    }
  }

  private guardarLocal(): void {
    try {
      localStorage.setItem(CLAVE, JSON.stringify(this.propios()));
    } catch {
      // Sin almacenamiento: el récord vale solo para esta visita
    }
  }
}
