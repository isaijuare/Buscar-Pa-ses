import { Component, DestroyRef, PLATFORM_ID, computed, effect, inject, signal, untracked } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { RouterLink } from '@angular/router';
import { CountryService } from '../../services/country';
import { AuthService } from '../../services/auth';
import { CountryApiResponse, nombreEnEspanol } from '../../models/country';
import { ModoQuiz, RecordsQuiz } from '../../models/usuario';

export type { ModoQuiz } from '../../models/usuario';

interface Pregunta {
  pais: CountryApiResponse;
  opciones: string[];
  correcta: string;
}

const TOTAL_PREGUNTAS = 10;
// Para que no aparezcan territorios diminutos casi desconocidos
const POBLACION_MINIMA = 300000;
const CLAVE_RECORD = 'buscador-paises:record-quiz';

function mezclar<T>(lista: T[]): T[] {
  const copia = [...lista];
  for (let i = copia.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copia[i], copia[j]] = [copia[j], copia[i]];
  }
  return copia;
}

@Component({
  selector: 'app-quiz',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './quiz.html',
  styleUrl: './quiz.css'
})
export class QuizComponent {
  private enNavegador = isPlatformBrowser(inject(PLATFORM_ID));
  private http = inject(HttpClient);
  protected auth = inject(AuthService);
  readonly total = TOTAL_PREGUNTAS;
  readonly modos: { id: ModoQuiz; nombre: string }[] = [
    { id: 'bandera', nombre: 'Banderas' },
    { id: 'capital', nombre: 'Capitales' }
  ];

  private paises = signal<CountryApiResponse[]>([]);
  error = signal(false);

  modo = signal<ModoQuiz | null>(null);
  preguntas = signal<Pregunta[]>([]);
  indice = signal(0);
  respuesta = signal<string | null>(null);
  aciertos = signal(0);
  record = signal<Record<ModoQuiz, number>>({ bandera: 0, capital: 0 });
  nuevoRecord = signal(false);
  /** Mejores puntajes de todos los usuarios (null mientras carga o si no hay conexión) */
  ranking = signal<RecordsQuiz['ranking'] | null>(null);

  actual = computed(() => this.preguntas()[this.indice()] ?? null);
  terminado = computed(() => this.preguntas().length > 0 && this.indice() >= this.preguntas().length);
  listo = computed(() => this.paises().length > 0);
  progreso = computed(() => (this.indice() / TOTAL_PREGUNTAS) * 100);

  mensajeFinal = computed(() => {
    const n = this.aciertos();
    if (n === TOTAL_PREGUNTAS) return '¡Perfecto! Eres un experto en geografía. 🏆';
    if (n >= 7) return '¡Muy bien! Conoces el mundo. 🌍';
    if (n >= 4) return 'Nada mal. Con práctica llegarás a 10. 🧭';
    return 'Sigue intentándolo: cada partida se aprende algo nuevo. 📚';
  });

  constructor() {
    const sub = inject(CountryService)
      .obtenerTodos()
      .subscribe({
        next: (todos) =>
          this.paises.set(todos.filter((p) => p.population >= POBLACION_MINIMA && p.capitals?.length)),
        error: () => this.error.set(true)
      });
    inject(DestroyRef).onDestroy(() => sub.unsubscribe());

    if (this.enNavegador) {
      try {
        const guardado = JSON.parse(localStorage.getItem(CLAVE_RECORD) ?? 'null');
        if (guardado) this.record.set({ bandera: guardado.bandera ?? 0, capital: guardado.capital ?? 0 });
      } catch {
        // Sin almacenamiento: el récord vale solo para esta visita
      }

      // Se vuelve a pedir al iniciar o cerrar sesión: cambian los récords propios y el ranking
      effect(() => {
        this.auth.usuario();
        untracked(() => this.cargarRecords());
      });
    }
  }

  empezar(modo: ModoQuiz): void {
    const paises = mezclar(this.paises());
    const respuestaDe = (p: CountryApiResponse) => (modo === 'bandera' ? nombreEnEspanol(p) : p.capitals![0].name);

    const preguntas = paises.slice(0, TOTAL_PREGUNTAS).map((pais) => {
      const correcta = respuestaDe(pais);
      // Opciones incorrectas: de preferencia de la misma región, para que no sea tan fácil
      const mismaRegion = mezclar(paises.filter((p) => p !== pais && p.region === pais.region));
      const resto = mezclar(paises.filter((p) => p !== pais && p.region !== pais.region));
      const incorrectas = [...new Set([...mismaRegion, ...resto].map(respuestaDe))]
        .filter((r) => r !== correcta)
        .slice(0, 3);
      return { pais, correcta, opciones: mezclar([correcta, ...incorrectas]) };
    });

    this.modo.set(modo);
    this.preguntas.set(preguntas);
    this.indice.set(0);
    this.aciertos.set(0);
    this.respuesta.set(null);
    this.nuevoRecord.set(false);
  }

  responder(opcion: string): void {
    if (this.respuesta() !== null) return;
    this.respuesta.set(opcion);
    if (opcion === this.actual()?.correcta) this.aciertos.update((n) => n + 1);
  }

  siguiente(): void {
    this.respuesta.set(null);
    this.indice.update((i) => i + 1);
    if (this.terminado()) this.guardarRecord();
  }

  volverAlMenu(): void {
    this.modo.set(null);
    this.preguntas.set([]);
  }

  nombre(p: CountryApiResponse): string {
    return nombreEnEspanol(p);
  }

  private guardarRecord(): void {
    const modo = this.modo();
    if (!modo || this.aciertos() <= this.record()[modo]) return;
    this.record.update((r) => ({ ...r, [modo]: this.aciertos() }));
    this.nuevoRecord.set(true);
    this.guardarLocal();
    this.subirRecord(modo, this.aciertos());
  }

  /** Trae el ranking y, con sesión, los récords de la cuenta (se queda el mayor de cada modo). */
  private cargarRecords(): void {
    this.http.get<RecordsQuiz>('/api/usuario/records').subscribe({
      next: ({ propios, ranking }) => {
        this.ranking.set(ranking);
        if (!propios) return;
        const local = this.record();
        const cuenta = { bandera: propios.bandera ?? 0, capital: propios.capital ?? 0 };
        this.record.set({
          bandera: Math.max(local.bandera, cuenta.bandera),
          capital: Math.max(local.capital, cuenta.capital)
        });
        this.guardarLocal();
        // Récords logrados sin sesión: se suben a la cuenta
        for (const m of ['bandera', 'capital'] as ModoQuiz[]) {
          if (local[m] > cuenta[m]) this.subirRecord(m, local[m]);
        }
      },
      error: () => this.ranking.set(null)
    });
  }

  private subirRecord(modo: ModoQuiz, puntaje: number): void {
    if (!this.auth.conectado()) return;
    this.http.post<RecordsQuiz>('/api/usuario/records', { modo, puntaje }).subscribe({
      next: ({ ranking }) => this.ranking.set(ranking),
      error: () => {}
    });
  }

  private guardarLocal(): void {
    try {
      localStorage.setItem(CLAVE_RECORD, JSON.stringify(this.record()));
    } catch {
      // Sin almacenamiento
    }
  }
}
