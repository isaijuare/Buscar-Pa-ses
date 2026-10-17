import { Component, DestroyRef, PLATFORM_ID, computed, effect, inject, input, signal, untracked } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Meta, Title } from '@angular/platform-browser';
import { RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';
import { CountryService } from '../../services/country';
import { LugaresService } from '../../services/lugares';
import { FavoritosService } from '../../services/favoritos';
import { UbicacionService } from '../../services/ubicacion';
import { CountryApiResponse, mapApiToCountry, nombreEnEspanol } from '../../models/country';
import { Ubicacion } from '../../models/cielo';
import { PanelCieloComponent } from '../panel-cielo/panel-cielo';
import { DatosViajeComponent } from '../datos-viaje/datos-viaje';
import { formatoNumero } from '../../utils/formato';

@Component({
  selector: 'app-pais-detalle',
  standalone: true,
  imports: [RouterLink, PanelCieloComponent, DatosViajeComponent],
  templateUrl: './pais-detalle.html',
  styleUrl: './pais-detalle.css'
})
export class PaisDetalleComponent {
  private countryService = inject(CountryService);
  private lugaresService = inject(LugaresService);
  private favoritosService = inject(FavoritosService);
  private ubicacionService = inject(UbicacionService);
  private titulo = inject(Title);
  private meta = inject(Meta);
  private enNavegador = isPlatformBrowser(inject(PLATFORM_ID));

  /** Viene de la URL: /pais/:codigo */
  codigo = input.required<string>();

  pais = signal<CountryApiResponse | null>(null);
  cargando = signal(true);
  error = signal<string | null>(null);
  vecinos = signal<{ codigo: string; nombre: string; bandera: string }[]>([]);

  /** Punto elegido en el mapa de esta página; si es null se usa la capital */
  private puntoMapa = signal<Ubicacion | null>(null);

  private peticion?: Subscription;
  private peticionVecinos?: Subscription;

  nombre = computed(() => {
    const p = this.pais();
    return p ? nombreEnEspanol(p) : '';
  });

  capital = computed<Ubicacion | null>(() => {
    const p = this.pais();
    if (!p) return null;
    const c = p.capitals?.[0];
    // Sin capital (p. ej. la Antártida) se usa el centro geográfico del país
    if (c) return { lat: c.coordinates.lat, lon: c.coordinates.lng, nombre: `${c.name}, ${this.nombre()}`, fuente: 'pais' };
    if (p.coordinates) return { lat: p.coordinates.lat, lon: p.coordinates.lng, nombre: this.nombre(), fuente: 'pais' };
    return null;
  });

  ubicacionPanel = computed(() => this.puntoMapa() ?? this.capital());
  eligioPunto = computed(() => this.puntoMapa() !== null);

  esFavorito = computed(() => {
    const p = this.pais();
    return !!p && this.favoritosService.favoritos().some((f) => f.code === p.codes.alpha_2);
  });

  datos = computed(() => {
    const p = this.pais();
    if (!p) return [];
    const densidad = p.area?.kilometers ? p.population / p.area.kilometers : null;
    return [
      { etiqueta: 'Capital', valor: p.capitals?.map((c) => c.name).join(', ') || 'Sin capital' },
      { etiqueta: 'Población', valor: formatoNumero(p.population) + ' hab.' },
      { etiqueta: 'Área', valor: p.area ? formatoNumero(p.area.kilometers) + ' km²' : '—' },
      { etiqueta: 'Densidad', valor: densidad !== null ? formatoNumero(densidad, 1) + ' hab./km²' : '—' },
      { etiqueta: 'Región', valor: [p.region, p.subregion].filter(Boolean).join(' · ') },
      { etiqueta: 'Continente', valor: p.continents?.join(', ') || '—' },
      {
        etiqueta: 'Idiomas',
        valor: p.languages?.map((l) => (l.native_name && l.native_name !== l.name ? `${l.name} (${l.native_name})` : l.name)).join(', ') || '—'
      },
      { etiqueta: 'Moneda', valor: p.currencies?.map((c) => `${c.name} (${c.code}, ${c.symbol})`).join(', ') || '—' },
      { etiqueta: 'Zonas horarias', valor: p.timezones?.join(', ') || '—' }
    ];
  });

  constructor() {
    effect(() => {
      const codigo = this.codigo();
      untracked(() => this.cargar(codigo));
    });

    // El fondo muestra el cielo real de la capital (o del punto elegido en el mapa)
    effect(() => {
      const lugar = this.ubicacionPanel();
      untracked(() => this.ubicacionService.fondo.set(lugar));
    });

    inject(DestroyRef).onDestroy(() => {
      this.peticion?.unsubscribe();
      this.peticionVecinos?.unsubscribe();
      // Al salir de la ficha, la barra y el fondo vuelven a la ubicación del usuario
      this.lugaresService.volverACercaDeTi();
      this.ubicacionService.fondo.set(null);
    });
  }

  alternarFavorito(): void {
    const p = this.pais();
    if (!p) return;
    this.favoritosService.alternarFavorito({ code: p.codes.alpha_2, nombre: this.nombre(), banderaUrl: p.flag.url_svg });
  }

  // Clic en el mapa: el cielo y los lugares de la barra pasan a ese punto
  onPuntoElegido(punto: { lat: number; lon: number }): void {
    const ubicacion: Ubicacion = { lat: punto.lat, lon: punto.lon, nombre: 'Punto del mapa', fuente: 'mapa' };
    this.puntoMapa.set(ubicacion);
    this.lugaresService.elegirZona({ lat: punto.lat, lon: punto.lon, nombre: 'Punto del mapa', esPais: true });
    this.ubicacionService.nombreDe(punto.lat, punto.lon).subscribe((nombre) => {
      if (this.puntoMapa() !== ubicacion) return;
      this.puntoMapa.set({ ...ubicacion, nombre });
      this.lugaresService.elegirZona({ lat: punto.lat, lon: punto.lon, nombre, esPais: true });
    });
  }

  volverACapital(): void {
    this.puntoMapa.set(null);
    const p = this.pais();
    if (p) this.lugaresService.mostrarPais(mapApiToCountry(p));
  }

  private cargar(codigo: string): void {
    this.peticion?.unsubscribe();
    this.cargando.set(true);
    this.error.set(null);
    this.puntoMapa.set(null);

    this.peticion = this.countryService.obtenerPorCodigo(codigo).subscribe({
      next: (pais) => {
        this.pais.set(pais);
        this.cargando.set(false);
        this.actualizarTitulo(pais);
        this.lugaresService.mostrarPais(mapApiToCountry(pais));
        if (this.enNavegador) {
          this.favoritosService.registrarVisita({
            code: pais.codes.alpha_2,
            nombre: nombreEnEspanol(pais),
            banderaUrl: pais.flag.url_svg
          });
          this.cargarVecinos(pais);
        }
      },
      error: (e: { status?: number }) => {
        this.cargando.set(false);
        this.error.set(e.status === 404 ? 'No encontramos ese país.' : 'No se pudieron cargar los datos del país.');
        this.titulo.setTitle('País no encontrado · Buscador de Países');
      }
    });
  }

  // Los vecinos llegan como códigos (GTM, SLV…): se buscan sus nombres en la lista completa
  private cargarVecinos(pais: CountryApiResponse): void {
    this.vecinos.set([]);
    if (!pais.borders?.length) return;
    this.peticionVecinos?.unsubscribe();
    this.peticionVecinos = this.countryService.obtenerTodos().subscribe((todos) => {
      const porCodigo = new Map(todos.map((p) => [p.codes.alpha_3, p]));
      this.vecinos.set(
        pais.borders!
          .map((c) => porCodigo.get(c))
          .filter((p): p is CountryApiResponse => !!p)
          .map((p) => ({ codigo: p.codes.alpha_2.toLowerCase(), nombre: nombreEnEspanol(p), bandera: p.flag.url_svg }))
      );
    });
  }

  private actualizarTitulo(pais: CountryApiResponse): void {
    const nombre = nombreEnEspanol(pais);
    this.titulo.setTitle(`${nombre} · Buscador de Países`);
    this.meta.updateTag({
      name: 'description',
      content: `${nombre}: capital, población, clima, Luna, lugares turísticos, hora local, moneda y feriados.`
    });
  }
}
