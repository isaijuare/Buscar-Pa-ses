/** Anillos de coordenadas [lon, lat] como en GeoJSON */
export type Anillo = [number, number][];

export type GeometriaPais =
  | { type: 'Polygon'; coordinates: Anillo[] }
  | { type: 'MultiPolygon'; coordinates: Anillo[][] };

/** Contorno de un país (frontera de OpenStreetMap, incluye el mar territorial). */
export interface ContornoPais {
  codigo: string;
  nombre: string;
  geometria: GeometriaPais;
  /** [oeste, sur, este, norte] */
  caja: [number, number, number, number];
  /** Relación de OpenStreetMap, para abrir el país allá */
  osm?: { tipo: string; id: number };
}

/** Todos los polígonos de la geometría, cada uno como lista de anillos (el primero es el borde exterior). */
export function poligonos(g: GeometriaPais): Anillo[][] {
  return g.type === 'Polygon' ? [g.coordinates] : g.coordinates;
}
