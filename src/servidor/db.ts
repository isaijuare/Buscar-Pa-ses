import type * as Sqlite from 'node:sqlite';
import { existsSync, mkdirSync, readFileSync, renameSync } from 'node:fs';
import { join } from 'node:path';

// Se carga así porque el empaquetador de Angular convierte el import 'node:sqlite' en 'sqlite'
const { DatabaseSync } = process.getBuiltinModule('node:sqlite') as typeof Sqlite;

/**
 * Base de datos SQLite (incluida en Node 22.5+, sin dependencias).
 * Vive en datos/tu-clima.db, que no se sube a git.
 */

const CARPETA = join(process.cwd(), 'datos');
mkdirSync(CARPETA, { recursive: true });

export const db = new DatabaseSync(join(CARPETA, 'tu-clima.db'));

db.exec(`
  PRAGMA journal_mode = WAL;
  PRAGMA foreign_keys = ON;

  CREATE TABLE IF NOT EXISTS usuarios (
    id      TEXT PRIMARY KEY,
    nombre  TEXT NOT NULL,
    email   TEXT NOT NULL UNIQUE,
    sal     TEXT NOT NULL,
    hash    TEXT NOT NULL,
    creado  TEXT NOT NULL
  );

  -- Favoritos y vistos recientemente de cada usuario (la lista entera, en JSON)
  CREATE TABLE IF NOT EXISTS listas (
    usuario_id TEXT NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    tipo       TEXT NOT NULL CHECK (tipo IN ('favoritos', 'recientes')),
    paises     TEXT NOT NULL,
    PRIMARY KEY (usuario_id, tipo)
  );

  -- Mejor puntaje de cada usuario en cada juego (modos del quiz y juegos de Entretenimiento)
  CREATE TABLE IF NOT EXISTS records (
    usuario_id TEXT NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    modo       TEXT NOT NULL CHECK (modo IN ('bandera', 'capital', 'estaciones', 'memoria')),
    puntaje    INTEGER NOT NULL,
    fecha      TEXT NOT NULL,
    PRIMARY KEY (usuario_id, modo)
  );

  -- Contornos de los países (GeoJSON de OpenStreetMap): se descargan una vez y quedan guardados
  CREATE TABLE IF NOT EXISTS contornos (
    codigo TEXT PRIMARY KEY,
    datos  TEXT NOT NULL,
    fecha  TEXT NOT NULL
  );

  -- Mensajes del formulario de contacto
  CREATE TABLE IF NOT EXISTS mensajes (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre     TEXT NOT NULL,
    email      TEXT NOT NULL,
    asunto     TEXT NOT NULL,
    mensaje    TEXT NOT NULL,
    usuario_id TEXT REFERENCES usuarios(id) ON DELETE SET NULL,
    fecha      TEXT NOT NULL
  );
`);

// Columnas agregadas después de crear la tabla: se suman si la base es de una versión anterior
const columnas = (db.prepare('PRAGMA table_info(usuarios)').all() as { name: string }[]).map((c) => c.name);
// Foto de perfil como data URL (JPEG de 256 px, unos 20-40 KB)
if (!columnas.includes('foto')) db.exec('ALTER TABLE usuarios ADD COLUMN foto TEXT');
// Segundos (epoch) del último cambio de contraseña: los tokens emitidos antes dejan de valer
if (!columnas.includes('password_cambiada')) {
  db.exec('ALTER TABLE usuarios ADD COLUMN password_cambiada INTEGER NOT NULL DEFAULT 0');
}

// La tabla de récords de versiones anteriores solo aceptaba los modos del quiz. SQLite no permite
// cambiar un CHECK, así que se rehace la tabla conservando los récords
const tablaRecords = db.prepare("SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'records'").get() as
  | { sql: string }
  | undefined;
if (tablaRecords && !tablaRecords.sql.includes("'memoria'")) {
  db.exec(`
    BEGIN;
    ALTER TABLE records RENAME TO records_viejo;
    CREATE TABLE records (
      usuario_id TEXT NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
      modo       TEXT NOT NULL CHECK (modo IN ('bandera', 'capital', 'estaciones', 'memoria')),
      puntaje    INTEGER NOT NULL,
      fecha      TEXT NOT NULL,
      PRIMARY KEY (usuario_id, modo)
    );
    INSERT INTO records SELECT usuario_id, modo, puntaje, fecha FROM records_viejo;
    DROP TABLE records_viejo;
    COMMIT;
  `);
}

// Los usuarios registrados antes de tener base de datos estaban en datos/usuarios.json
const ARCHIVO_VIEJO = join(CARPETA, 'usuarios.json');
if (existsSync(ARCHIVO_VIEJO)) {
  try {
    const viejos = JSON.parse(readFileSync(ARCHIVO_VIEJO, 'utf8')) as Record<string, string>[];
    const insertar = db.prepare(
      'INSERT OR IGNORE INTO usuarios (id, nombre, email, sal, hash, creado) VALUES (?, ?, ?, ?, ?, ?)'
    );
    for (const u of viejos) insertar.run(u['id'], u['nombre'], u['email'], u['sal'], u['hash'], u['creado']);
    renameSync(ARCHIVO_VIEJO, `${ARCHIVO_VIEJO}.migrado`);
    console.log(`Se pasaron ${viejos.length} usuarios de usuarios.json a la base de datos.`);
  } catch (error) {
    console.error('No se pudieron migrar los usuarios de usuarios.json:', error);
  }
}
