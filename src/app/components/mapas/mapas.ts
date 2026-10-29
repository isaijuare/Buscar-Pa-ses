import {
  Component,
  DestroyRef,
  ElementRef,
  afterNextRender,
  computed,
  effect,
  inject,
  input,
  signal,
  untracked,
  viewChild
} from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Router, RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';
import type * as Leaflet from 'leaflet';
import { CountryService } from '../../services/country';
import { CountryApiResponse, nombreEnEspanol, normalizarTexto } from '../../models/country';
import { ContornoPais } from '../../models/contorno';
import { archivoPng, archivoSvg, descargar, silueta } from '../../utils/contorno-svg';
import { formatoNumero } from '../../utils/formato';

@Component({
  selector: 'app-mapas',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './mapas.html',
  styleUrl: './mapas.css'
})
export class MapasComponent {
  private http = inject(HttpClient);
  private router = inject(Router);

  /** Código del país (de la URL /mapas/:codigo); vacío en /mapas */
  codigo = input<string | undefined>();

  private paises = signal<CountryApiResponse[]>([]);
  opciones = computed(() =>
    this.paises()
      .map((p) => ({ codigo: p.codes.alpha_2.toLowerCase(), nombre: nombreEnEspanol(p) }))
      .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'))
  );

  pais = computed(() => {
    const codigo = this.codigo()?.toUpperCase();
    return this.paises().find((p) => p.codes.alpha_2 === codigo || p.codes.alpha_3 === codigo) ?? null;
  });
  datos = computed(() => {
    const p = this.pais();
    if (!p) return null;
    return {
      nombre: nombreEnEspanol(p),
      bandera: p.flag.url_svg,
      capital: p.capitals?.[0]?.name ?? '—',
      area: p.area?.kilometers ? `${formatoNumero(p.area.kilometers)} km²` : '—',
      region: p.subregion ?? p.region ?? '—'
    };
  });

  contorno = signal<ContornoPais | null>(null);
  cargando = signal(false);
  error = signal<string | null>(null);
  descargandoPng = signal(false);

  vista = computed(() => {
    const c = this.contorno();
    return c ? silueta(c, 600, 12) : null;
  });

  enlaces = computed(() => {
    const c = this.contorno();
    const nombre = this.datos()?.nombre ?? c?.nombre ?? '';
    return {
      osm: c?.osm ? `https://www.openstreetmap.org/${c.osm.tipo}/${c.osm.id}` : null,
      google: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(nombre)}`
    };
  });

  private lienzo = viewChild<ElementRef<HTMLElement>>('lienzo');
  private L?: typeof Leaflet;
  private mapa?: Leaflet.Map;
  private capa?: Leaflet.Layer;
  private mapaListo = signal(false);
  private peticion?: Subscription;

  constructor() {
    const lista = inject(CountryService)
      .obtenerTodos()
      .subscribe({ next: (p) => this.paises.set(p), error: () => this.error.set('No se pudo cargar la lista de países.') });

    // Al cambiar de país en la URL se pide su contorno
    effect(() => {
      const codigo = this.codigo();
      untracked(() => this.cargarContorno(codigo));
    });

    // Leaflet usa window: solo en el navegador y bajo demanda
    afterNextRender(async () => {
      const modulo = await import('leaflet');
      this.L = ((modulo as { default?: typeof Leaflet }).default ?? modulo) as typeof Leaflet;
      const elemento = this.lienzo()?.nativeElement;
      if (!elemento) return;
      this.mapa = this.L.map(elemento, { scrollWheelZoom: false }).setView([15, 0], 2);
      this.L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 18,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
      }).addTo(this.mapa);
      this.mapaListo.set(true);
    });

    // Dibuja el país en el mapa interactivo y lo encuadra
    effect(() => {
      const c = this.contorno();
      if (!this.mapaListo() || !this.L || !this.mapa) return;
      this.capa?.remove();
      this.capa = undefined;
      if (!c) return;
      this.capa = this.L.geoJSON(c.geometria as GeoJSON.Geometry, {
        style: { color: '#0f766e', weight: 2, fillColor: '#2dd4bf', fillOpacity: 0.35 }
      }).addTo(this.mapa);
      const [oeste, sur, este, norte] = c.caja;
      // El contenedor estaba oculto mientras no había país: Leaflet debe recalcular su tamaño
      this.mapa.invalidateSize();
      // Sin animación: al deslizarse hacia países que cruzan el meridiano 180 (Rusia, Fiyi)
      // Leaflet a veces deja sin dibujar el mapa del otro lado
      this.mapa.fitBounds([[sur, oeste], [norte, este]], { padding: [16, 16], animate: false });
    });

    inject(DestroyRef).onDestroy(() => {
      lista.unsubscribe();
      this.peticion?.unsubscribe();
      this.mapa?.remove();
    });
  }

  private cargarContorno(codigo: string | undefined): void {
    this.peticion?.unsubscribe();
    this.contorno.set(null);
    this.error.set(null);
    if (!codigo) return;

    this.cargando.set(true);
    this.peticion = this.http.get<ContornoPais>(`/api/paises/${codigo.toLowerCase()}/contorno`).subscribe({
      next: (c) => {
        this.contorno.set(c);
        this.cargando.set(false);
      },
      error: (e: HttpErrorResponse) => {
        this.cargando.set(false);
        this.error.set(e.error?.error ?? 'No se pudo obtener el mapa.');
      }
    });
  }

  /** El buscador acepta el nombre (con o sin tildes) o el código del país. */
  elegir(texto: string): void {
    const buscado = normalizarTexto(texto);
    if (!buscado) return;
    const encontrado =
      this.opciones().find((o) => normalizarTexto(o.nombre) === buscado || o.codigo === buscado) ??
      this.opciones().find((o) => normalizarTexto(o.nombre).startsWith(buscado));
    if (encontrado) {
      this.router.navigate(['/mapas', encontrado.codigo]);
    } else {
      this.error.set(`No encontramos un país llamado «${texto}».`);
    }
  }

  sorprendeme(): void {
    const opciones = this.opciones();
    if (opciones.length) this.router.navigate(['/mapas', opciones[Math.floor(Math.random() * opciones.length)].codigo]);
  }

  // ---------- Descargas ----------

  private nombreArchivo(extension: string): string {
    const nombre = normalizarTexto(this.contorno()?.nombre ?? 'pais').replace(/[^a-z0-9]+/g, '-');
    return `mapa-${nombre}.${extension}`;
  }

  descargarSvg(): void {
    const c = this.contorno();
    if (c) descargar(archivoSvg(c), this.nombreArchivo('svg'));
  }

  async descargarPng(): Promise<void> {
    const c = this.contorno();
    if (!c || this.descargandoPng()) return;
    this.descargandoPng.set(true);
    try {
      descargar(await archivoPng(archivoSvg(c)), this.nombreArchivo('png'));
    } finally {
      this.descargandoPng.set(false);
    }
  }

  descargarGeoJson(): void {
    const c = this.contorno();
    if (!c) return;
    const geojson = {
      type: 'Feature',
      properties: { nombre: c.nombre, codigo: c.codigo, fuente: '© colaboradores de OpenStreetMap (ODbL)' },
      geometry: c.geometria
    };
    descargar(JSON.stringify(geojson), this.nombreArchivo('geojson'), 'application/geo+json');
  }
}
