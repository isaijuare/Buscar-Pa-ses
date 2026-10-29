import {
  AngularNodeAppEngine,
  createNodeRequestHandler,
  isMainModule,
  writeResponseToNodeResponse,
} from '@angular/ssr/node';
import express from 'express';
import { join } from 'node:path';
import type { CountryApiResponse } from './app/models/country';
import { rutasAuth } from './servidor/auth';
import { rutasUsuario } from './servidor/datos-usuario';
import { rutasContacto } from './servidor/contacto';
import { rutaContorno } from './servidor/contornos';

// La API key vive solo en el servidor: se lee del archivo .env (o de las variables del sistema)
try {
  process.loadEnvFile();
} catch {
  // Sin archivo .env: se usan las variables de entorno del sistema
}

const browserDistFolder = join(import.meta.dirname, '../browser');

const app = express();
const angularApp = new AngularNodeAppEngine();

/**
 * Proxy de restcountries: el navegador nunca ve la API key.
 * La lista se descarga una vez y se guarda 12 horas en memoria.
 */
const API_PAISES = 'https://api.restcountries.com/countries/v5';
const DURACION_CACHE_MS = 12 * 60 * 60 * 1000;

let cachePaises: { datos: CountryApiResponse[]; vence: number } | null = null;
let descargaEnCurso: Promise<CountryApiResponse[]> | null = null;

async function obtenerPaises(): Promise<CountryApiResponse[]> {
  if (cachePaises && cachePaises.vence > Date.now()) return cachePaises.datos;
  // Si llegan varias peticiones a la vez, todas esperan la misma descarga
  descargaEnCurso ??= descargarPaises().finally(() => (descargaEnCurso = null));
  return descargaEnCurso;
}

async function descargarPaises(): Promise<CountryApiResponse[]> {
  const apiKey = process.env['RESTCOUNTRIES_API_KEY'];
  if (!apiKey) throw new Error('Falta la variable RESTCOUNTRIES_API_KEY (ver .env.example)');

  const todos: PaisRestCountries[] = [];
  for (let offset = 0; ; offset += 100) {
    const respuesta = await fetch(`${API_PAISES}?limit=100&offset=${offset}`, {
      headers: { Authorization: `Bearer ${apiKey}` }
    });
    if (!respuesta.ok) throw new Error(`restcountries respondió ${respuesta.status}`);

    const json = (await respuesta.json()) as {
      data: { objects: PaisRestCountries[]; meta?: { more?: boolean } };
    };
    todos.push(...json.data.objects);
    if (!json.data.meta?.more) break;
  }

  // Se omiten los territorios sin código ISO (no se pueden enlazar ni buscar por código)
  const datos = todos.filter((p) => p.codes?.alpha_2).map(recortarPais);
  cachePaises = { datos, vence: Date.now() + DURACION_CACHE_MS };
  return datos;
}

type PaisRestCountries = CountryApiResponse & {
  cars?: { driving_side?: string };
  capitals?: (NonNullable<CountryApiResponse['capitals']>[number] & { attributes?: { primary?: boolean } })[];
};

// De ~1,4 MB a una fracción: solo los campos que usa la app
function recortarPais(p: PaisRestCountries): CountryApiResponse {
  const capitales = [...(p.capitals ?? [])].sort(
    (a, b) => Number(b.attributes?.primary ?? false) - Number(a.attributes?.primary ?? false)
  );
  return {
    names: {
      common: p.names.common,
      official: p.names.official,
      translations: p.names.translations?.['spa'] ? { spa: p.names.translations['spa'] } : undefined
    },
    codes: { alpha_2: p.codes.alpha_2, alpha_3: p.codes.alpha_3 },
    capitals: capitales.map((c) => ({ name: c.name, coordinates: c.coordinates })),
    flag: { emoji: p.flag.emoji, url_svg: p.flag.url_svg, url_png: p.flag.url_png },
    region: p.region,
    subregion: p.subregion,
    continents: p.continents,
    area: p.area,
    population: p.population,
    languages: p.languages?.map((l) => ({ name: l.name, native_name: l.native_name, bcp47: l.bcp47 })),
    currencies: p.currencies,
    timezones: p.timezones,
    borders: p.borders,
    calling_codes: p.calling_codes,
    tlds: p.tlds,
    landlocked: p.landlocked,
    driving_side: p.cars?.driving_side,
    coordinates: p.coordinates
  };
}

// Registro e inicio de sesión (JWT), y los datos de cada cuenta
// La foto de perfil viaja en el cuerpo (data URL), por eso el límite es mayor que el de 100 KB por defecto
app.use('/api/auth', express.json({ limit: '500kb' }), rutasAuth);
app.use('/api/usuario', express.json({ limit: '100kb' }), rutasUsuario);
app.use('/api/contacto', express.json({ limit: '20kb' }), rutasContacto);

app.get('/api/paises', async (_req, res) => {
  try {
    res.set('Cache-Control', 'public, max-age=3600');
    res.json(await obtenerPaises());
  } catch (error) {
    console.error(error);
    res.status(502).json({ error: 'No se pudo obtener la lista de países.' });
  }
});

// Contorno del país para la página de mapas (OpenStreetMap, guardado en la base de datos)
app.get(
  '/api/paises/:codigo/contorno',
  rutaContorno(async (codigo) =>
    (await obtenerPaises()).find((p) => p.codes.alpha_2 === codigo || p.codes.alpha_3 === codigo)
  )
);

app.get('/api/paises/:codigo', async (req, res) => {
  try {
    const codigo = req.params.codigo.toUpperCase();
    const pais = (await obtenerPaises()).find((p) => p.codes.alpha_2 === codigo || p.codes.alpha_3 === codigo);
    if (!pais) {
      res.status(404).json({ error: 'País no encontrado.' });
      return;
    }
    res.set('Cache-Control', 'public, max-age=3600');
    res.json(pais);
  } catch (error) {
    console.error(error);
    res.status(502).json({ error: 'No se pudo obtener el país.' });
  }
});

/**
 * Serve static files from /browser
 */
app.use(
  express.static(browserDistFolder, {
    maxAge: '1y',
    index: false,
    redirect: false,
  }),
);

/**
 * Handle all other requests by rendering the Angular application.
 */
app.use((req, res, next) => {
  angularApp
    .handle(req)
    .then((response) =>
      response ? writeResponseToNodeResponse(response, res) : next(),
    )
    .catch(next);
});

/**
 * Start the server if this module is the main entry point, or it is ran via PM2.
 * The server listens on the port defined by the `PORT` environment variable, or defaults to 4000.
 */
if (isMainModule(import.meta.url) || process.env['pm_id']) {
  const port = process.env['PORT'] || 4000;
  app.listen(port, (error) => {
    if (error) {
      throw error;
    }

  });
}

/**
 * Request handler used by the Angular CLI (for dev-server and during build) or Firebase Cloud Functions.
 */
export const reqHandler = createNodeRequestHandler(app);
