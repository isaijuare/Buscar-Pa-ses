export interface Ubicacion {
  lat: number;
  lon: number;
  nombre: string;
  // gps = ubicación exacta del navegador, ip = aproximada por la conexión,
  // pais = capital de un país, mapa = punto elegido en el mapa
  fuente: 'gps' | 'ip' | 'predeterminada' | 'pais' | 'mapa';
}

export interface GeocodificacionApiResponse {
  latitude: number;
  longitude: number;
  city: string;
  locality: string;
  principalSubdivision: string;
  countryName: string;
}

export interface PronosticoApiResponse {
  timezone: string;
  current: {
    time: string;
    temperature_2m: number;
    apparent_temperature: number;
    relative_humidity_2m: number;
    is_day: number;
    weather_code: number;
    wind_speed_10m: number;
    wind_direction_10m: number;
    pressure_msl: number;
    cloud_cover: number;
  };
  hourly: {
    time: string[];
    temperature_2m: number[];
    weather_code: number[];
    precipitation_probability: number[];
    is_day: number[];
  };
  daily: {
    time: string[];
    temperature_2m_max: number[];
    temperature_2m_min: number[];
    sunrise: string[];
    sunset: string[];
    uv_index_max: number[];
  };
}

export interface CalidadAireApiResponse {
  current: {
    time: string;
    us_aqi: number | null;
    pm2_5: number | null;
    pm10: number | null;
    ozone: number | null;
    nitrogen_dioxide: number | null;
    // Polen (granos/m³): null fuera de Europa
    alder_pollen: number | null;
    birch_pollen: number | null;
    grass_pollen: number | null;
    mugwort_pollen: number | null;
    olive_pollen: number | null;
    ragweed_pollen: number | null;
  };
}
