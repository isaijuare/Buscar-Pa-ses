import type { RequestHandler } from 'express';
import type { CountryApiResponse } from '../app/models/country';
import { type Anillo, type ContornoPais, type GeometriaPais, poligonos } from '../app/models/contorno';
import { db } from './db';

/**
 * Contorno de cada país desde Nominatim (OpenStreetMap). Su política de uso pide identificarse
 * y no hacer más de una consulta por segundo: por eso cada país se pide una sola vez, se guarda
 * en la tabla `contornos` y las consultas nuevas esperan su turno en una cola.
 */

const NOMINATIM = 'https://nominatim.openstreetmap.org/search';
// Al publicar la app, agrega aquí un correo o la URL del sitio: Nominatim lo pide para poder avisar
const AGENTE = 'TuClima/1.0 (app educativa de clima y países)';
const ESPERA_ENTRE_CONSULTAS_MS = 1100;

const leerGuardado = db.prepare('SELECT datos FROM contornos WHERE codigo = ?');
const guardar = db.prepare(
  'INSERT INTO contornos (codigo, datos, fecha) VALUES (?, ?, ?) ON CONFLICT (codigo) DO UPDATE SET datos = excluded.datos'
);

let cola: Promise<unknown> = Promise.resolve();
const enCurso = new Map<string, Promise<ContornoPais | null>>();

/** Pone la consulta en la cola: empieza cuando terminó la anterior y pasó el tiempo de espera. */
function enCola<T>(tarea: () => Promise<T>): Promise<T> {
  const resultado = cola.then(tarea);
  cola = resultado.catch(() => {}).then(() => new Promise((r) => setTimeout(r, ESPERA_ENTRE_CONSULTAS_MS)));
  return resultado;
}

/** Los países chicos necesitan más detalle; en los grandes se simplifica más para que pese poco. */
function tolerancia(area = 0): string {
  if (area < 1_000) return '0.0005';
  if (area < 50_000) return '0.005';
  return '0.02';
}

/**
 * Países que cruzan el meridiano 180 (Rusia, Fiyi, Estados Unidos con las Aleutianas…): se pasan
 * las longitudes negativas a 180-360 para que el país se dibuje entero y no partido en dos.
 */
function unirAntimeridiano(g: GeometriaPais): GeometriaPais {
  const [oeste, , este] = caja(g);
  if (!(este > 150 && oeste < -150)) return g;
  const mover = (anillo: Anillo): Anillo => anillo.map(([lon, lat]) => [lon < 0 ? lon + 360 : lon, lat]);
  return g.type === 'Polygon'
    ? { type: 'Polygon', coordinates: g.coordinates.map(mover) }
    : { type: 'MultiPolygon', coordinates: g.coordinates.map((p) => p.map(mover)) };
}

function caja(g: GeometriaPais): ContornoPais['caja'] {
  let [oeste, sur, este, norte] = [Infinity, Infinity, -Infinity, -Infinity];
  for (const [lon, lat] of poligonos(g).flat(2)) {
    oeste = Math.min(oeste, lon);
    este = Math.max(este, lon);
    sur = Math.min(sur, lat);
    norte = Math.max(norte, lat);
  }
  return [oeste, sur, este, norte];
}

async function descargar(pais: CountryApiResponse): Promise<ContornoPais | null> {
  const parametros = new URLSearchParams({
    q: pais.names.common,
    countrycodes: pais.codes.alpha_2.toLowerCase(),
    featureType: 'country',
    polygon_geojson: '1',
    polygon_threshold: tolerancia(pais.area?.kilometers),
    format: 'jsonv2',
    limit: '1'
  });
  const respuesta = await fetch(`${NOMINATIM}?${parametros}`, {
    headers: { 'User-Agent': AGENTE, 'Accept-Language': 'es' },
    signal: AbortSignal.timeout(15000)
  });
  if (!respuesta.ok) throw new Error(`Nominatim respondió ${respuesta.status}`);

  const [lugar] = (await respuesta.json()) as {
    osm_type?: string;
    osm_id?: number;
    geojson?: { type: string; coordinates: unknown };
  }[];
  if (!lugar?.geojson || (lugar.geojson.type !== 'Polygon' && lugar.geojson.type !== 'MultiPolygon')) return null;

  const geometria = unirAntimeridiano(lugar.geojson as GeometriaPais);
  return {
    codigo: pais.codes.alpha_2,
    nombre: pais.names.translations?.['spa']?.common ?? pais.names.common,
    geometria,
    caja: caja(geometria),
    osm: lugar.osm_type && lugar.osm_id ? { tipo: lugar.osm_type, id: lugar.osm_id } : undefined
  };
}

async function contorno(pais: CountryApiResponse): Promise<ContornoPais | null> {
  const codigo = pais.codes.alpha_2;
  const fila = leerGuardado.get(codigo) as { datos: string } | undefined;
  if (fila) return JSON.parse(fila.datos);

  // Si varias personas piden el mismo país a la vez, todas esperan la misma descarga
  let pendiente = enCurso.get(codigo);
  if (!pendiente) {
    pendiente = enCola(() => descargar(pais))
      .then((c) => {
        if (c) guardar.run(codigo, JSON.stringify(c), new Date().toISOString());
        return c;
      })
      .finally(() => enCurso.delete(codigo));
    enCurso.set(codigo, pendiente);
  }
  return pendiente;
}

/** GET /api/paises/:codigo/contorno */
export function rutaContorno(buscarPais: (codigo: string) => Promise<CountryApiResponse | undefined>): RequestHandler {
  return async (req, res) => {
    try {
      const pais = await buscarPais(String(req.params['codigo']).toUpperCase());
      if (!pais) return void res.status(404).json({ error: 'País no encontrado.' });

      const datos = await contorno(pais);
      if (!datos) return void res.status(404).json({ error: 'No encontramos el mapa de este país.' });

      // El contorno casi nunca cambia: el navegador lo puede guardar una semana
      res.set('Cache-Control', 'public, max-age=604800');
      res.json(datos);
    } catch (error) {
      console.error(error);
      res.status(502).json({ error: 'No se pudo obtener el mapa. Intenta de nuevo en unos segundos.' });
    }
  };
}
