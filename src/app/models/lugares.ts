export type CategoriaLugar = 'naturaleza' | 'historia' | 'cultura' | 'religion' | 'ocio';

export const INFO_CATEGORIA: Record<CategoriaLugar, { nombre: string; icono: string }> = {
  naturaleza: { nombre: 'Naturaleza', icono: '🌿' },
  historia: { nombre: 'Historia', icono: '🏛️' },
  cultura: { nombre: 'Museos y cultura', icono: '🎨' },
  religion: { nombre: 'Religión', icono: '⛪' },
  ocio: { nombre: 'Plazas y ocio', icono: '🎡' }
};

/** Punto alrededor del cual se buscan lugares: la ubicación del usuario o la capital de un país */
export interface ZonaLugares {
  lat: number;
  lon: number;
  nombre: string;
  esPais: boolean;
  banderaUrl?: string;
}

export interface LugarTuristico {
  /** ID de Wikidata */
  id: string;
  nombre: string;
  descripcion?: string;
  categoria: CategoriaLugar;
  patrimonio: boolean;
  imagen?: string;
  lat: number;
  lon: number;
  distanciaKm: number;
  urlWikipedia: string;
  urlMapa: string;
}
