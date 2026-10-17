import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map, shareReplay } from 'rxjs';
import { Country, CountryApiResponse, mapApiToCountry, normalizarTexto } from '../models/country';

@Injectable({ providedIn: 'root' })
export class CountryService {
  private http = inject(HttpClient);

  // Nuestro servidor hace de intermediario con restcountries (la API key nunca llega al navegador)
  private baseUrl = '/api/paises';

  //trae toda la lista de una sola vez
  private todosLosPaises$?: Observable<CountryApiResponse[]>;
  textoBusqueda = signal('');
  resultadosBusqueda = signal<Country[]>([]);

  /** Todos los países con sus datos completos (se descarga una vez y queda en memoria). */
  obtenerTodos(): Observable<CountryApiResponse[]> {
    this.todosLosPaises$ ??= this.http.get<CountryApiResponse[]>(this.baseUrl).pipe(
      shareReplay(1) // guarda el resultado anterior en memoria
    );
    return this.todosLosPaises$;
  }

  /**
   * Busca por nombre en español o inglés, en cualquier parte del nombre, o por código (jp, usa).
   * Orden: primero los que empiezan con el texto, luego los que tienen una palabra que empieza
   * con el texto y al final los que lo contienen en cualquier parte.
   */
  buscarPaises(query: string): Observable<Country[]> {
    const texto = normalizarTexto(query);

    return this.obtenerTodos().pipe(
      map((paises) => {
        if (!texto) return [];

        return paises
          .map((pais) => ({ pais, puntaje: this.puntajeCoincidencia(pais, texto) }))
          .filter((r) => r.puntaje !== null)
          .sort((a, b) => a.puntaje! - b.puntaje! || b.pais.population - a.pais.population)
          .map((r) => mapApiToCountry(r.pais));
      })
    );
  }

  //** Trae un país por código (alpha_2 o alpha_3)
  obtenerPorCodigo(codigoPais: string): Observable<CountryApiResponse> {
    return this.http.get<CountryApiResponse>(`${this.baseUrl}/${codigoPais.toLowerCase()}`);
  }

  // Menor puntaje = mejor coincidencia; null = no coincide
  private puntajeCoincidencia(pais: CountryApiResponse, texto: string): number | null {
    if (pais.codes.alpha_2.toLowerCase() === texto || pais.codes.alpha_3.toLowerCase() === texto) return 0;

    const nombres = [pais.names.common, pais.names.translations?.['spa']?.common]
      .filter((n): n is string => Boolean(n))
      .map(normalizarTexto);

    if (nombres.some((n) => n.startsWith(texto))) return 1;
    if (nombres.some((n) => n.split(/[\s\-(),]+/).some((palabra) => palabra.startsWith(texto)))) return 2;
    if (nombres.some((n) => n.includes(texto))) return 3;
    return null;
  }
}
