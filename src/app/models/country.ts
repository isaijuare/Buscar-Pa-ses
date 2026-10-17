// Datos de cada país tal como los entrega nuestro servidor (/api/paises).
// El servidor recorta la respuesta de restcountries a estos campos para que pese menos.
export interface CountryApiResponse {
  names: {
    common: string;
    official: string;
    // Solo se conserva la traducción al español, para buscar y mostrar en español
    translations?: Record<string, { common: string; official: string }>;
  };
  codes: {
    alpha_2: string;
    alpha_3: string;
  };
  capitals?: {
    name: string;
    coordinates: { lat: number; lng: number };
  }[];
  flag: {
    emoji: string;
    url_svg: string;
    url_png: string;
  };
  region: string;
  subregion?: string;
  continents?: string[];
  area?: { kilometers: number; miles: number };
  population: number;
  languages?: { name: string; native_name?: string; bcp47: string }[];
  currencies?: { code: string; name: string; symbol: string }[];
  timezones?: string[];
  /** Códigos alpha_3 de los países vecinos */
  borders?: string[];
  calling_codes?: string[];
  tlds?: string[];
  landlocked?: boolean;
  driving_side?: string;
  /** Centro geográfico del país */
  coordinates?: { lat: number; lng: number };
}

//el pais se busca en español y se muestra en inglés
export interface Country {
  code: string;
  name: string;
  nameEs?: string;
  flagUrl?: string;
  capital?: string;
  population?: number;
  region?: string;
  lat?: number;
  lon?: number;
}

export function mapApiToCountry(api: CountryApiResponse): Country {
  const capital = api.capitals?.[0];

  return {
    code: api.codes.alpha_2,
    name: api.names.common,
    nameEs: api.names.translations?.['spa']?.common,
    flagUrl: api.flag.url_svg,
    capital: capital?.name,
    population: api.population,
    region: api.region,
    lat: capital?.coordinates.lat,
    lon: capital?.coordinates.lng,
  };
}

/** Nombre en español si existe; si no, el nombre común en inglés. */
export function nombreEnEspanol(api: CountryApiResponse): string {
  return api.names.translations?.['spa']?.common ?? api.names.common;
}

//los encuentra sin importar como se escriba (acentos, mayúsculas, minúsculas, espacios)
export function normalizarTexto(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim();
}
