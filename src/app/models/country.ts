
export interface CountryApiResponse {
  names: {
    common: string;
    official: string;
    native?: Record<string, { common: string; official: string }>;
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

// Modelo "limpio" que realmente usan tus componentes
export interface Country {
  code: string;
  name: string;
  flagUrl?: string;
  capital?: string;
  population?: number;
  region?: string;
  lat?: number;   // 👈 necesarias para pedir el clima
  lon?: number;
}

/** Convierte la respuesta cruda de la API a tu modelo interno */
export function mapApiToCountry(api: CountryApiResponse): Country {
  const capital = api.capitals?.[0];

  return {
    code: api.codes.alpha_2,
    name: api.names.common,
    flagUrl: api.flag.url_svg,
    capital: capital?.name,
    population: api.population,
    region: api.region,
    lat: capital?.coordinates.lat,
    lon: capital?.coordinates.lng,
  };
}

// ----- Modelo de la API de clima (Open-Meteo) -----
export interface WeatherApiResponse {
  latitude: number;
  longitude: number;
  timezone: string;
  hourly: {
    time: string[];
    temperature_2m: number[];
  };
  hourly_units: {
    temperature_2m: string; // ej: "°C"
  };
}