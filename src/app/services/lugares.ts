import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, forkJoin, map, of, switchMap } from 'rxjs';
import { CategoriaLugar, LugarTuristico, ZonaLugares } from '../models/lugares';
import { Country } from '../models/country';

interface PaginaGeosearch {
  pageid: number;
  title: string;
  fullurl: string;
  description?: string;
  coordinates?: { lat: number; lon: number }[];
  thumbnail?: { source: string };
  pageprops?: { wikibase_item?: string };
}

interface GeosearchApiResponse {
  query?: { pages: Record<string, PaginaGeosearch> };
}

interface EntidadesApiResponse {
  entities: Record<
    string,
    {
      labels?: Record<string, { value: string }>;
      descriptions?: Record<string, { value: string }>;
      // El valor es un objeto { id } en "instancia de" y el nombre del archivo en "imagen"
      claims?: Record<string, { mainsnak: { datavalue?: { value: { id?: string } | string } } }[]>;
    }
  >;
}

// Tipos de Wikidata (propiedad "instancia de") que se consideran turísticos
const TIPOS: Record<CategoriaLugar, string[]> = {
  naturaleza: [
    'Q22698', 'Q22746', 'Q1107656', 'Q167346', 'Q46169', 'Q473972', 'Q179049', 'Q8502', 'Q8072',
    'Q34038', 'Q23397', 'Q40080', 'Q35509', 'Q23442', 'Q6017969', 'Q23790', 'Q43501', 'Q2281788'
  ],
  historia: [
    'Q23413', 'Q57821', 'Q16560', 'Q839954', 'Q109607', 'Q4989906', 'Q5003624', 'Q1081138', 'Q12516',
    'Q162875', 'Q179700', 'Q860861', 'Q39715', 'Q12518', 'Q12280', 'Q676050', 'Q15243209'
  ],
  cultura: [
    'Q33506', 'Q207694', 'Q588140', 'Q1970365', 'Q2772772', 'Q17431399', 'Q1007870', 'Q24354',
    'Q153562', 'Q1329623'
  ],
  religion: [
    'Q16970', 'Q2977', 'Q120560', 'Q1088552', 'Q317557', 'Q108325', 'Q32815', 'Q44539', 'Q44613', 'Q697295'
  ],
  ocio: ['Q174782', 'Q570116', 'Q194195', 'Q2416723', 'Q1440300']
};

const CATEGORIA_POR_TIPO = new Map<string, CategoriaLugar>(
  (Object.entries(TIPOS) as [CategoriaLugar, string[]][]).flatMap(([categoria, ids]) =>
    ids.map((id) => [id, categoria] as [string, CategoriaLugar])
  )
);

// Wikipedia permite buscar como máximo a 10 km del punto
export const RADIO_BUSQUEDA_KM = 10;
// Si en español hay menos que esto, se completa con la Wikipedia en inglés
const MINIMO_RESULTADOS = 6;

@Injectable({ providedIn: 'root' })
export class LugaresService {
  private http = inject(HttpClient);

  // Si se eligió un país desde su tarjeta, la barra muestra los sitios de su capital
  zonaPais = signal<ZonaLugares | null>(null);

  mostrarPais(pais: Country): void {
    if (pais.lat == null || pais.lon == null) return;
    const nombrePais = pais.nameEs ?? pais.name;
    this.zonaPais.set({
      lat: pais.lat,
      lon: pais.lon,
      nombre: pais.capital ? `${pais.capital}, ${nombrePais}` : nombrePais,
      esPais: true,
      banderaUrl: pais.flagUrl
    });
  }

  volverACercaDeTi(): void {
    this.zonaPais.set(null);
  }

  buscarCerca(lat: number, lon: number): Observable<LugarTuristico[]> {
    return this.buscarEnWikipedia('es', lat, lon).pipe(
      switchMap((enEspanol) => {
        if (enEspanol.length >= MINIMO_RESULTADOS) return of(enEspanol);

        return this.buscarEnWikipedia('en', lat, lon).pipe(
          map((enIngles) => {
            const yaIncluidos = new Set(enEspanol.map((l) => l.id));
            return [...enEspanol, ...enIngles.filter((l) => !yaIncluidos.has(l.id))].sort(
              (a, b) => a.distanciaKm - b.distanciaKm
            );
          })
        );
      })
    );
  }

  private buscarEnWikipedia(idioma: 'es' | 'en', lat: number, lon: number): Observable<LugarTuristico[]> {
    const params = new URLSearchParams({
      action: 'query',
      format: 'json',
      origin: '*',
      generator: 'geosearch',
      ggscoord: `${lat}|${lon}`,
      ggsradius: String(RADIO_BUSQUEDA_KM * 1000),
      ggslimit: '80',
      prop: 'coordinates|pageimages|description|pageprops|info',
      inprop: 'url',
      ppprop: 'wikibase_item',
      piprop: 'thumbnail',
      pithumbsize: '400',
      pilimit: 'max',
      colimit: 'max'
    });

    return this.http.get<GeosearchApiResponse>(`https://${idioma}.wikipedia.org/w/api.php?${params}`).pipe(
      switchMap((respuesta) => {
        const paginas = Object.values(respuesta.query?.pages ?? {}).filter(
          (p) => p.pageprops?.wikibase_item && p.coordinates?.length
        );
        if (!paginas.length) return of([]);

        return this.obtenerEntidades(paginas.map((p) => p.pageprops!.wikibase_item!)).pipe(
          map((entidades) =>
            paginas
              .map((pagina) => this.armarLugar(pagina, entidades[pagina.pageprops!.wikibase_item!], lat, lon))
              .filter((lugar): lugar is LugarTuristico => lugar !== null)
              .sort((a, b) => a.distanciaKm - b.distanciaKm)
          )
        );
      })
    );
  }

  // Wikidata acepta como máximo 50 IDs por petición
  private obtenerEntidades(ids: string[]): Observable<EntidadesApiResponse['entities']> {
    const lotes: string[][] = [];
    for (let i = 0; i < ids.length; i += 50) lotes.push(ids.slice(i, i + 50));

    return forkJoin(
      lotes.map((lote) =>
        this.http.get<EntidadesApiResponse>(
          `https://www.wikidata.org/w/api.php?action=wbgetentities&format=json&origin=*` +
            `&props=claims|labels|descriptions&languages=es&ids=${lote.join('|')}`
        )
      )
    ).pipe(map((respuestas) => Object.assign({}, ...respuestas.map((r) => r.entities))));
  }

  private armarLugar(
    pagina: PaginaGeosearch,
    entidad: EntidadesApiResponse['entities'][string] | undefined,
    lat: number,
    lon: number
  ): LugarTuristico | null {
    const tipos = (entidad?.claims?.['P31'] ?? []).map((c) => {
      const valor = c.mainsnak.datavalue?.value;
      return typeof valor === 'object' ? (valor.id ?? '') : '';
    });
    // P1435 = declarado patrimonio (nacional, UNESCO, etc.)
    const patrimonio = Boolean(entidad?.claims?.['P1435']?.length);
    const categoria = tipos.map((t) => CATEGORIA_POR_TIPO.get(t)).find(Boolean) ?? (patrimonio ? 'historia' : null);
    if (!categoria) return null;

    // Se prefiere la foto del lugar en Wikidata (P18): la de Wikipedia a veces es un logo
    const archivo = entidad?.claims?.['P18']?.[0]?.mainsnak.datavalue?.value;
    const imagen =
      typeof archivo === 'string'
        ? `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(archivo)}?width=400`
        : pagina.thumbnail?.source;

    const coords = pagina.coordinates![0];
    return {
      id: pagina.pageprops!.wikibase_item!,
      nombre: entidad?.labels?.['es']?.value ?? pagina.title,
      descripcion: entidad?.descriptions?.['es']?.value ?? pagina.description,
      categoria,
      patrimonio,
      imagen,
      lat: coords.lat,
      lon: coords.lon,
      distanciaKm: distanciaKm(lat, lon, coords.lat, coords.lon),
      urlWikipedia: pagina.fullurl,
      urlMapa: `https://www.google.com/maps/search/?api=1&query=${coords.lat},${coords.lon}`
    };
  }
}

/** Distancia en línea recta entre dos puntos (fórmula del haversine). */
function distanciaKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const rad = Math.PI / 180;
  const dLat = (lat2 - lat1) * rad;
  const dLon = (lon2 - lon1) * rad;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * rad) * Math.cos(lat2 * rad) * Math.sin(dLon / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.sqrt(a));
}
