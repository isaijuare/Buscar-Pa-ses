// Estructura Actualizada para que se muestren todos los paises y banderas
export interface CountryApiResponse {
  names: {
    common: string;
    official: string;
    native?: Record<string, { common: string; official: string }>;
    // Traducciones a otros idiomas para que se pueda buscar por nombre en español, ing
    translations?: Record<string, { common: string; official: string }>;
  };
  codes: {
    alpha_2: string;
    alpha_3: string;
    ccn3: string;
    fifa?: string;
    cioc?: string;
  };
  capitals?: {
    name: string;
    primary: boolean;
    coordinates: { lat: number; lng: number };
  }[];
  flag: {
    emoji: string;
    url_svg: string;
    url_png: string;
  };
  region: string;
  subregion?: string;
  area?: { kilometers: number; miles: number };
  population: number;
  languages?: { name: string; bcp47: string }[];
  currencies?: { code: string; name: string; symbol: string }[];
  timezones?: string[];
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

//los encuentra sin importar como se escriba (acentos, mayúsculas, minúsculas, espacios)
export function normalizarTexto(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

export interface WeatherApiResponse {
  latitude: number;
  longitude: number;
  timezone: string;
  hourly: {
    time: string[];
    temperature_2m: number[];
  };
  hourly_units: {
    temperature_2m: string;
  };
}