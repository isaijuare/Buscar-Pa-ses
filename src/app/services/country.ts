import { Injectable, inject, signal } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, forkJoin, map, shareReplay } from 'rxjs';
import {
  Country,
  CountryApiResponse,
  WeatherApiResponse,
  mapApiToCountry,
  normalizarTexto
} from '../models/country';
import { environment } from '../../environments/environment';


interface ListaApiResponse<T> {
  data: {
    objects: T[];
  };
}

@Injectable({ providedIn: 'root' })
export class CountryService {
  private http = inject(HttpClient);

  private baseUrl = environment.restCountriesApiUrl;
  private climaBaseUrl = 'https://api.open-meteo.com/v1/forecast';

  private headers = new HttpHeaders({
    Authorization: `Bearer ${environment.restCountriesApiKey}`
  });

  //trae toda la lista de una sola vez
  private todosLosPaises$?: Observable<Country[]>;
  textoBusqueda = signal('');
  resultadosBusqueda = signal<Country[]>([]);

   private obtenerTodosLosPaises(): Observable<Country[]> {
    if (!this.todosLosPaises$) {
      const offsets = [0, 100, 200];    
      
      const peticiones = offsets.map((offset) =>
        this.http.get<ListaApiResponse<CountryApiResponse>>(
          `${this.baseUrl}?limit=100&offset=${offset}&pretty=1`,
          { headers: this.headers }
        )
      );

      this.todosLosPaises$ = forkJoin(peticiones).pipe(
        map((respuestas) => {
          const todos = respuestas.flatMap((r) => r.data.objects);
          return todos.map(mapApiToCountry);
        }),
        shareReplay(1) // guarda el resultado anterior en memoria
      );
    }

    return this.todosLosPaises$;
  }

  
  buscarPaises(query: string): Observable<Country[]> {
    const texto = normalizarTexto(query);

    if (!texto) {
      return this.obtenerTodosLosPaises().pipe(map(() => []));
    }

    return this.obtenerTodosLosPaises().pipe(
      map((paises) =>
        paises.filter((pais) => {
          const nombreIngles = normalizarTexto(pais.name);
          const nombreEspanol = pais.nameEs ? normalizarTexto(pais.nameEs) : '';

          return (
            nombreIngles.startsWith(texto) || nombreEspanol.startsWith(texto)
          );
        })
      )
    );
  }

  //** Trae un país por código
  obtenerPorCodigo(codigoPais: string): Observable<Country> {
    return this.http
      .get<ListaApiResponse<CountryApiResponse>>(
        `${this.baseUrl}/codes.alpha_2/${codigoPais.toLowerCase()}?pretty=1`,
        { headers: this.headers }
      )
      .pipe(map((respuesta) => mapApiToCountry(respuesta.data.objects[0])));
  }

  //** Datos demográficos: reutiliza el mismo endpoint por código */
  obtenerDatosDemograficos(codigoPais: string): Observable<CountryApiResponse> {
    return this.http
      .get<ListaApiResponse<CountryApiResponse>>(
        `${this.baseUrl}/codes.alpha_2/${codigoPais.toLowerCase()}?pretty=1`,
        { headers: this.headers }
      )
      .pipe(map((respuesta) => respuesta.data.objects[0]));
  }

  obtenerClima(lat: number, lon: number): Observable<WeatherApiResponse> {
    const params = `latitude=${lat}&longitude=${lon}&hourly=temperature_2m`;
    return this.http.get<WeatherApiResponse>(`${this.climaBaseUrl}?${params}`);
  }
}