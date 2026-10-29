import { Component, ElementRef, afterNextRender, computed, effect, inject, signal, viewChild } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { RouterLink } from '@angular/router';
import { Categoria, ESCALA_MOHS, MINERALES, Mineral } from '../../models/minerales';
import { normalizarTexto } from '../../models/country';

type Orden = 'nombre' | 'dureza' | 'densidad';

interface RespuestaFotos {
  query?: {
    normalized?: { from: string; to: string }[];
    redirects?: { from: string; to: string }[];
    pages: { title: string; thumbnail?: { source: string } }[];
  };
}

const coma = (n: number) => String(n).replace('.', ',');

/** "7" o "6 a 6,5" */
export function textoDureza([min, max]: [number, number]): string {
  return min === max ? coma(min) : `${coma(min)} a ${coma(max)}`;
}

/** Primer número de la densidad ("2,6 a 2,9" → 2.6), para ordenar */
export function densidadNumerica(densidad: string): number {
  return Number(densidad.split(' ')[0].replace(',', '.'));
}

@Component({
  selector: 'app-minerales',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './minerales.html',
  styleUrl: './minerales.css'
})
export class MineralesComponent {
  private http = inject(HttpClient);

  readonly escala = ESCALA_MOHS;
  readonly categorias: ('Todas' | Categoria)[] = ['Todas', 'Gema', 'Metálico', 'Industrial'];
  readonly total = MINERALES.length;
  readonly dureza = textoDureza;

  categoria = signal<'Todas' | Categoria>('Todas');
  orden = signal<Orden>('nombre');
  busqueda = signal('');
  seleccionado = signal<Mineral | null>(null);

  /** Foto de Wikipedia de cada mineral (por id); sin foto se muestra una ilustración */
  fotos = signal<Record<string, string>>({});

  visibles = computed(() => {
    const texto = normalizarTexto(this.busqueda());
    const lista = MINERALES.filter(
      (m) =>
        (this.categoria() === 'Todas' || m.categoria === this.categoria()) &&
        (!texto || [m.nombre, m.formula, m.clase, m.color].some((t) => normalizarTexto(t).includes(texto)))
    );
    const comparar: Record<Orden, (a: Mineral, b: Mineral) => number> = {
      nombre: (a, b) => a.nombre.localeCompare(b.nombre, 'es'),
      dureza: (a, b) => b.dureza[1] - a.dureza[1] || b.dureza[0] - a.dureza[0],
      densidad: (a, b) => densidadNumerica(b.densidad) - densidadNumerica(a.densidad)
    };
    return [...lista].sort(comparar[this.orden()]);
  });

  /** Minerales de la colección en cada escalón de la escala de Mohs (1 a 10): los que su dureza toca ese escalón */
  enEscala = computed(() =>
    this.escala.map((_, i) =>
      MINERALES.filter((m) => Math.floor(m.dureza[0]) <= i + 1 && i + 1 <= Math.floor(m.dureza[1]))
    )
  );

  private dialogo = viewChild<ElementRef<HTMLDialogElement>>('dialogo');

  constructor() {
    // Las fotos se piden en el navegador, todas en una sola consulta (Wikipedia limita las consultas seguidas)
    afterNextRender(() => this.cargarFotos());

    effect(() => {
      const dialogo = this.dialogo()?.nativeElement;
      if (!dialogo) return;
      if (this.seleccionado() && !dialogo.open) dialogo.showModal();
      if (!this.seleccionado() && dialogo.open) dialogo.close();
    });
  }

  abrir(mineral: Mineral): void {
    this.seleccionado.set(mineral);
  }

  cerrar(): void {
    this.seleccionado.set(null);
  }

  /** Clic en el fondo oscuro del diálogo (fuera de la ficha) */
  clicEnDialogo(evento: MouseEvent): void {
    if (evento.target === this.dialogo()?.nativeElement) this.cerrar();
  }

  /** Ancho de la barra de dureza: la dureza máxima sobre 10 */
  porcentajeDureza(m: Mineral): number {
    return m.dureza[1] * 10;
  }

  /** Los primeros países de origen, para la tarjeta ("Brasil, Madagascar y 2 más") */
  lugares(m: Mineral): string {
    const nombres = m.paises.map((p) => p.nombre);
    return nombres.length > 3 ? `${nombres.slice(0, 2).join(', ')} y ${nombres.length - 2} más` : nombres.join(', ');
  }

  enlaceWikipedia(m: Mineral): string {
    return `https://es.wikipedia.org/wiki/${encodeURIComponent(m.wikipedia.replace(/ /g, '_'))}`;
  }

  private cargarFotos(): void {
    const tituloDe = new Map(MINERALES.map((m) => [m.fotoDe ?? m.wikipedia, m.id]));
    const parametros = new URLSearchParams({
      action: 'query',
      prop: 'pageimages',
      piprop: 'thumbnail',
      pithumbsize: '480',
      titles: [...tituloDe.keys()].join('|'),
      redirects: '1',
      format: 'json',
      formatversion: '2',
      origin: '*'
    });
    this.http.get<RespuestaFotos>(`https://es.wikipedia.org/w/api.php?${parametros}`).subscribe({
      next: (r) => {
        // Wikipedia puede devolver el título normalizado o redirigido: se sigue el rastro hasta el original
        const original = new Map<string, string>();
        for (const { from, to } of [...(r.query?.normalized ?? []), ...(r.query?.redirects ?? [])]) {
          original.set(to, original.get(from) ?? from);
        }
        const fotos: Record<string, string> = {};
        for (const pagina of r.query?.pages ?? []) {
          const id = tituloDe.get(original.get(pagina.title) ?? pagina.title);
          if (id && pagina.thumbnail) fotos[id] = pagina.thumbnail.source;
        }
        this.fotos.set(fotos);
      },
      error: () => {
        // Sin conexión con Wikipedia: quedan las ilustraciones
      }
    });
  }
}
