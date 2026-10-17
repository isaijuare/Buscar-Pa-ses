import { Component, DestroyRef, computed, effect, inject, input, signal, untracked } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';
import { CountryService } from '../../services/country';
import { TiempoService, describirCodigo } from '../../services/tiempo';
import { CountryApiResponse, nombreEnEspanol, normalizarTexto } from '../../models/country';
import { formatoNumero } from '../../utils/formato';

interface Fila {
  etiqueta: string;
  a: string;
  b: string;
  /** Para las filas numéricas: proporción de cada valor respecto al mayor (barras) */
  barras?: [number, number];
}

@Component({
  selector: 'app-comparador',
  standalone: true,
  imports: [FormsModule, RouterLink],
  templateUrl: './comparador.html',
  styleUrl: './comparador.css'
})
export class ComparadorComponent {
  private countryService = inject(CountryService);
  private tiempoService = inject(TiempoService);
  private router = inject(Router);

  // Vienen de la URL (?a=jp&b=hn), así la comparación se puede compartir
  a = input<string | undefined>(undefined);
  b = input<string | undefined>(undefined);

  todos = signal<CountryApiResponse[]>([]);
  error = signal(false);
  textoA = signal('');
  textoB = signal('');
  clima = signal<Record<string, string>>({});

  private suscripciones: Subscription[] = [];

  opciones = computed(() =>
    this.todos()
      .map((p) => ({ codigo: p.codes.alpha_2.toLowerCase(), nombre: nombreEnEspanol(p) }))
      .sort((x, y) => x.nombre.localeCompare(y.nombre, 'es'))
  );

  paisA = computed(() => this.buscar(this.a()));
  paisB = computed(() => this.buscar(this.b()));

  filas = computed<Fila[]>(() => {
    const a = this.paisA();
    const b = this.paisB();
    if (!a || !b) return [];

    const numerica = (etiqueta: string, va: number | null, vb: number | null, unidad: string, decimales = 0): Fila => {
      const mayor = Math.max(va ?? 0, vb ?? 0) || 1;
      return {
        etiqueta,
        a: va === null ? '—' : `${formatoNumero(va, decimales)} ${unidad}`,
        b: vb === null ? '—' : `${formatoNumero(vb, decimales)} ${unidad}`,
        barras: [(va ?? 0) / mayor, (vb ?? 0) / mayor]
      };
    };
    const densidad = (p: CountryApiResponse) => (p.area?.kilometers ? p.population / p.area.kilometers : null);
    const texto = (etiqueta: string, f: (p: CountryApiResponse) => string | undefined): Fila => ({
      etiqueta,
      a: f(a) || '—',
      b: f(b) || '—'
    });
    const clima = this.clima();

    return [
      texto('Capital', (p) => p.capitals?.map((c) => c.name).join(', ')),
      texto('Clima ahora en la capital', (p) => clima[p.codes.alpha_2] ?? 'Cargando…'),
      numerica('Población', a.population, b.population, 'hab.'),
      numerica('Área', a.area?.kilometers ?? null, b.area?.kilometers ?? null, 'km²'),
      numerica('Densidad', densidad(a), densidad(b), 'hab./km²', 1),
      texto('Región', (p) => [p.region, p.subregion].filter(Boolean).join(' · ')),
      texto('Idiomas', (p) => p.languages?.map((l) => l.name).join(', ')),
      texto('Moneda', (p) => p.currencies?.map((c) => `${c.name} (${c.code})`).join(', ')),
      texto('Zonas horarias', (p) => p.timezones?.join(', ')),
      numerica('Países vecinos', a.borders?.length ?? 0, b.borders?.length ?? 0, ''),
      texto('Se conduce por la', (p) => (p.driving_side === 'left' ? 'izquierda' : p.driving_side === 'right' ? 'derecha' : undefined)),
      texto('Salida al mar', (p) => (p.landlocked === undefined ? undefined : p.landlocked ? 'No' : 'Sí')),
      texto('Prefijo', (p) => p.calling_codes?.map((c) => '+' + c).join(', '))
    ];
  });

  constructor() {
    this.suscripciones.push(
      this.countryService.obtenerTodos().subscribe({
        next: (todos) => this.todos.set(todos),
        error: () => this.error.set(true)
      })
    );

    // Muestra en los campos el nombre del país elegido
    effect(() => {
      const a = this.paisA();
      const b = this.paisB();
      untracked(() => {
        if (a) this.textoA.set(nombreEnEspanol(a));
        if (b) this.textoB.set(nombreEnEspanol(b));
      });
    });

    // Temperatura actual en cada capital
    effect(() => {
      for (const p of [this.paisA(), this.paisB()]) {
        const c = p?.capitals?.[0];
        if (!p || !c) continue;
        const codigo = p.codes.alpha_2;
        untracked(() => {
          if (this.clima()[codigo]) return;
          this.suscripciones.push(
            this.tiempoService.obtenerPronostico(c.coordinates.lat, c.coordinates.lng).subscribe({
              next: (r) => {
                const d = describirCodigo(r.current.weather_code, r.current.is_day === 1);
                this.clima.update((m) => ({ ...m, [codigo]: `${d.icono} ${Math.round(r.current.temperature_2m)}° · ${d.texto}` }));
              },
              error: () => this.clima.update((m) => ({ ...m, [codigo]: 'No disponible' }))
            })
          );
        });
      }
    });

    inject(DestroyRef).onDestroy(() => this.suscripciones.forEach((s) => s.unsubscribe()));
  }

  /** Al escribir o elegir un país en un campo se actualiza la URL */
  elegir(lado: 'a' | 'b', texto: string): void {
    (lado === 'a' ? this.textoA : this.textoB).set(texto);
    const buscado = normalizarTexto(texto);
    const opcion = this.opciones().find((o) => normalizarTexto(o.nombre) === buscado);
    if (!opcion) return;
    this.router.navigate([], {
      queryParams: { [lado]: opcion.codigo },
      queryParamsHandling: 'merge',
      replaceUrl: true
    });
  }

  intercambiar(): void {
    this.router.navigate([], { queryParams: { a: this.b(), b: this.a() }, replaceUrl: true });
  }

  private buscar(codigo: string | undefined): CountryApiResponse | null {
    if (!codigo) return null;
    const c = codigo.toUpperCase();
    return this.todos().find((p) => p.codes.alpha_2 === c || p.codes.alpha_3 === c) ?? null;
  }
}
