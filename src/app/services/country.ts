import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import {
  Country,
  CountryApiResponse,
  WeatherApiResponse,
  mapApiToCountry
} from '../models/country';
import { environment } from '../../environments/environment';

// La API envuelve las listas así: { data: { objects: [...] } }
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

  /** Busca países por nombre (para el autocompletar) */
  buscarPaises(query: string): Observable<Country[]> {
    const textoBuscado = query.trim().toLowerCase();

    return this.http
      .get<ListaApiResponse<CountryApiResponse>>(
        `${this.baseUrl}?q=${query}&pretty=1`,
        { headers: this.headers }
      )
      .pipe(
        map((respuesta) => respuesta.data.objects.map(mapApiToCountry)),
        // La API hace fuzzy-matching (tolera errores de tipeo), así que
        // filtramos aquí para quedarnos solo con coincidencias reales:
        // el nombre del país debe EMPEZAR con lo que el usuario escribió.
        map((paises) =>
          paises.filter((pais) =>
            pais.name.toLowerCase().startsWith(textoBuscado)
          )
        )
      );
  }

  /** Trae un país por su código alpha_2 (ej: 'CA', 'HN') */
  obtenerPorCodigo(codigoPais: string): Observable<Country> {
    return this.http
      .get<ListaApiResponse<CountryApiResponse>>(
        `${this.baseUrl}/codes.alpha_2/${codigoPais.toLowerCase()}?pretty=1`,
        { headers: this.headers }
      )
      .pipe(map((respuesta) => mapApiToCountry(respuesta.data.objects[0])));
  }

  /** Datos demográficos: reutiliza el mismo endpoint por código */
  obtenerDatosDemograficos(codigoPais: string): Observable<CountryApiResponse> {
    return this.http
      .get<ListaApiResponse<CountryApiResponse>>(
        `${this.baseUrl}/codes.alpha_2/${codigoPais.toLowerCase()}?pretty=1`,
        { headers: this.headers }
      )
      .pipe(map((respuesta) => respuesta.data.objects[0]));
  }

  /**
   * Clima (Open-Meteo): NO usa código de país, usa lat/lon de la capital.
   * No requiere API key.
   */
  obtenerClima(lat: number, lon: number): Observable<WeatherApiResponse> {
    const params = `latitude=${lat}&longitude=${lon}&hourly=temperature_2m`;
    return this.http.get<WeatherApiResponse>(`${this.climaBaseUrl}?${params}`);
  }
}