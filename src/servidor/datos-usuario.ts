import { Router } from 'express';
import { REGLAS_JUEGOS } from '../app/models/usuario';
import type { ListasUsuario, ModoJuego, PaisGuardado, RecordsQuiz } from '../app/models/usuario';
import { requiereSesion, usuarioDePeticion } from './auth';
import { db } from './db';

/** Datos de cada cuenta: favoritos, vistos recientemente y récords del quiz. */

const MAXIMO_PAISES = 300;
const PUESTOS_RANKING = 5;
const MODOS = Object.keys(REGLAS_JUEGOS) as ModoJuego[];

// ---------- Favoritos y recientes ----------

const leerLista = db.prepare('SELECT paises FROM listas WHERE usuario_id = ? AND tipo = ?');
const guardarLista = db.prepare(
  `INSERT INTO listas (usuario_id, tipo, paises) VALUES (?, ?, ?)
   ON CONFLICT (usuario_id, tipo) DO UPDATE SET paises = excluded.paises`
);

function lista(usuarioId: string, tipo: keyof ListasUsuario): PaisGuardado[] {
  const fila = leerLista.get(usuarioId, tipo) as { paises: string } | undefined;
  return fila ? JSON.parse(fila.paises) : [];
}

/** Solo acepta una lista de países bien formada; devuelve null si no lo es. */
function validarPaises(valor: unknown): PaisGuardado[] | null {
  if (!Array.isArray(valor) || valor.length > MAXIMO_PAISES) return null;
  const paises: PaisGuardado[] = [];
  for (const p of valor) {
    if (typeof p?.code !== 'string' || typeof p?.nombre !== 'string' || p.code.length > 3) return null;
    paises.push({
      code: p.code,
      nombre: p.nombre.slice(0, 100),
      banderaUrl: typeof p.banderaUrl === 'string' ? p.banderaUrl.slice(0, 300) : undefined
    });
  }
  return paises;
}

export const rutasUsuario = Router();

rutasUsuario.get('/listas', requiereSesion, (_req, res) => {
  const id = res.locals['usuarioId'] as string;
  const respuesta: ListasUsuario = { favoritos: lista(id, 'favoritos'), recientes: lista(id, 'recientes') };
  res.json(respuesta);
});

rutasUsuario.put('/listas/:tipo', requiereSesion, (req, res) => {
  const tipo = req.params['tipo'] as string;
  if (tipo !== 'favoritos' && tipo !== 'recientes') return void res.status(404).json({ error: 'Lista desconocida.' });

  const paises = validarPaises(req.body);
  if (!paises) return void res.status(400).json({ error: 'La lista de países no es válida.' });

  guardarLista.run(res.locals['usuarioId'], tipo, JSON.stringify(paises));
  res.status(204).end();
});

// ---------- Récords de los juegos ----------

const leerPropios = db.prepare('SELECT modo, puntaje FROM records WHERE usuario_id = ?');
// En Memoria gana quien usa menos movimientos; en los demás, quien acierta más
const leerRanking = {
  mayor: db.prepare(
    `SELECT r.usuario_id AS id, u.nombre, r.puntaje FROM records r
     JOIN usuarios u ON u.id = r.usuario_id
     WHERE r.modo = ? ORDER BY r.puntaje DESC, r.fecha ASC LIMIT ?`
  ),
  menor: db.prepare(
    `SELECT r.usuario_id AS id, u.nombre, r.puntaje FROM records r
     JOIN usuarios u ON u.id = r.usuario_id
     WHERE r.modo = ? ORDER BY r.puntaje ASC, r.fecha ASC LIMIT ?`
  )
};
// Solo se guarda si mejora el récord anterior
const guardarRecord = {
  mayor: db.prepare(
    `INSERT INTO records (usuario_id, modo, puntaje, fecha) VALUES (?, ?, ?, ?)
     ON CONFLICT (usuario_id, modo) DO UPDATE SET puntaje = excluded.puntaje, fecha = excluded.fecha
     WHERE excluded.puntaje > records.puntaje`
  ),
  menor: db.prepare(
    `INSERT INTO records (usuario_id, modo, puntaje, fecha) VALUES (?, ?, ?, ?)
     ON CONFLICT (usuario_id, modo) DO UPDATE SET puntaje = excluded.puntaje, fecha = excluded.fecha
     WHERE excluded.puntaje < records.puntaje`
  )
};
const sentido = (modo: ModoJuego) => (REGLAS_JUEGOS[modo].menorEsMejor ? 'menor' : 'mayor');

function records(usuarioId: string | null): RecordsQuiz {
  let propios: RecordsQuiz['propios'] = null;
  if (usuarioId) {
    // Sin récord: 0 en los juegos de aciertos (así lo espera el quiz) y null en Memoria
    const sinRecord = Object.fromEntries(MODOS.map((m) => [m, REGLAS_JUEGOS[m].menorEsMejor ? null : 0]));
    propios = sinRecord as NonNullable<RecordsQuiz['propios']>;
    for (const fila of leerPropios.all(usuarioId) as { modo: ModoJuego; puntaje: number }[]) {
      propios[fila.modo] = fila.puntaje;
    }
  }

  const ranking = {} as RecordsQuiz['ranking'];
  for (const modo of MODOS) {
    const filas = leerRanking[sentido(modo)].all(modo, PUESTOS_RANKING) as { id: string; nombre: string; puntaje: number }[];
    ranking[modo] = filas.map((f) => ({ nombre: f.nombre, puntaje: f.puntaje, propio: f.id === usuarioId }));
  }
  return { propios, ranking };
}

// El ranking es público; los récords propios solo llegan con sesión
rutasUsuario.get('/records', (req, res) => {
  res.json(records(usuarioDePeticion(req)?.sub ?? null));
});

rutasUsuario.post('/records', requiereSesion, (req, res) => {
  const modo = req.body?.modo as ModoJuego;
  const puntaje = Number(req.body?.puntaje);
  if (!MODOS.includes(modo)) return void res.status(400).json({ error: 'Récord no válido.' });
  const { minimo, maximo } = REGLAS_JUEGOS[modo];
  if (!Number.isInteger(puntaje) || puntaje < minimo || puntaje > maximo) {
    return void res.status(400).json({ error: 'Récord no válido.' });
  }

  const id = res.locals['usuarioId'] as string;
  guardarRecord[sentido(modo)].run(id, modo, puntaje, new Date().toISOString());
  res.json(records(id));
});
