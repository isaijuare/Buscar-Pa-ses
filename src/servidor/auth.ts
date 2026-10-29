import { Router, type NextFunction, type Request, type Response } from 'express';
import { createHmac, randomBytes, randomUUID, scryptSync, timingSafeEqual } from 'node:crypto';
import type { RespuestaAuth, Usuario } from '../app/models/usuario';
import { db } from './db';

/** Registro e inicio de sesión con JWT (HS256). Los usuarios se guardan en SQLite (ver db.ts). */

// Sin JWT_SECRET en el .env se usa una clave temporal: las sesiones se cierran al reiniciar el servidor
const SECRETO = process.env['JWT_SECRET'] || randomBytes(32).toString('hex');
if (!process.env['JWT_SECRET']) {
  console.warn('JWT_SECRET no está definido: se usa una clave temporal (ver .env.example).');
}

const DURACION_TOKEN_S = 7 * 24 * 60 * 60;
const EMAIL_VALIDO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface UsuarioGuardado extends Usuario {
  sal: string;
  hash: string;
  creado: string;
  foto: string | null;
  password_cambiada: number;
}

interface DatosToken {
  sub: string;
  nombre: string;
  email: string;
  iat: number;
  exp: number;
}

// ---------- Usuarios ----------

const buscarPorEmail = db.prepare('SELECT * FROM usuarios WHERE email = ?');
const buscarPorId = db.prepare('SELECT * FROM usuarios WHERE id = ?');
// SQLite devuelve filas genéricas: se tratan como usuarios guardados
const usuarioPorEmail = (email: string) => buscarPorEmail.get(email) as unknown as UsuarioGuardado | undefined;
const usuarioPorId = (id: string) => buscarPorId.get(id) as unknown as UsuarioGuardado | undefined;
const actualizarPassword = db.prepare('UPDATE usuarios SET sal = ?, hash = ?, password_cambiada = ? WHERE id = ?');
const actualizarFoto = db.prepare('UPDATE usuarios SET foto = ? WHERE id = ?');
const insertarUsuario = db.prepare(
  'INSERT INTO usuarios (id, nombre, email, sal, hash, creado) VALUES (?, ?, ?, ?, ?, ?)'
);

const cifrar = (password: string, sal: string) => scryptSync(password, sal, 64).toString('hex');

function passwordCorrecta(u: UsuarioGuardado, password: string): boolean {
  const esperado = Buffer.from(u.hash, 'hex');
  const recibido = Buffer.from(cifrar(password, u.sal), 'hex');
  return esperado.length === recibido.length && timingSafeEqual(esperado, recibido);
}

const publico = ({ id, nombre, email, foto, creado }: UsuarioGuardado): Usuario => ({
  id,
  nombre,
  email,
  foto: foto ?? null,
  creado
});

// Foto de perfil: JPEG, PNG o WebP en base64; el navegador la manda ya reducida a 256 px
const FOTO_VALIDA = /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/]+=*$/;
const MAXIMO_FOTO = 400_000;

// ---------- JWT ----------

const base64url = (texto: string | Buffer) => Buffer.from(texto).toString('base64url');
const firmar = (contenido: string) => createHmac('sha256', SECRETO).update(contenido).digest('base64url');

function crearToken(u: Usuario): string {
  const ahora = Math.floor(Date.now() / 1000);
  const datos: DatosToken = { sub: u.id, nombre: u.nombre, email: u.email, iat: ahora, exp: ahora + DURACION_TOKEN_S };
  const contenido = `${base64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))}.${base64url(JSON.stringify(datos))}`;
  return `${contenido}.${firmar(contenido)}`;
}

/** Devuelve los datos del token si la firma es válida y no venció; si no, null. */
function verificarToken(token: string): DatosToken | null {
  const [cabecera, cuerpo, firma] = token.split('.');
  if (!cabecera || !cuerpo || !firma) return null;

  const esperada = Buffer.from(firmar(`${cabecera}.${cuerpo}`));
  const recibida = Buffer.from(firma);
  if (esperada.length !== recibida.length || !timingSafeEqual(esperada, recibida)) return null;

  try {
    const datos = JSON.parse(Buffer.from(cuerpo, 'base64url').toString()) as DatosToken;
    return datos.exp > Date.now() / 1000 ? datos : null;
  } catch {
    return null;
  }
}

/** Usuario de la petición según el encabezado Authorization: Bearer <token>. */
export function usuarioDePeticion(req: Request): DatosToken | null {
  const [tipo, token] = (req.headers.authorization ?? '').split(' ');
  return tipo === 'Bearer' && token ? verificarToken(token) : null;
}

/**
 * Usuario dueño del token de la petición, o undefined si el token no es válido, si la cuenta ya no
 * existe o si el token es anterior al último cambio de contraseña.
 */
function usuarioConSesion(req: Request): UsuarioGuardado | undefined {
  const datos = usuarioDePeticion(req);
  const usuario = datos && usuarioPorId(datos.sub);
  return usuario && datos.iat >= usuario.password_cambiada ? usuario : undefined;
}

/** Middleware: deja pasar solo con sesión válida y guarda el id del usuario en res.locals.usuarioId. */
export function requiereSesion(req: Request, res: Response, next: NextFunction): void {
  const usuario = usuarioConSesion(req);
  if (!usuario) {
    res.status(401).json({ error: 'Inicia sesión para continuar.' });
    return;
  }
  res.locals['usuarioId'] = usuario.id;
  next();
}

// ---------- Límite de intentos ----------

// Tras 5 intentos fallidos con el mismo correo (o desde la misma IP), se bloquea 15 minutos
const MAX_INTENTOS = 5;
const VENTANA_MS = 15 * 60 * 1000;
const intentos = new Map<string, { cantidad: number; desde: number }>();

function claves(req: Request, email: string): string[] {
  return [`ip:${req.ip}`, `email:${email}`];
}

/** Minutos que faltan para poder reintentar, o 0 si no está bloqueado. */
function minutosBloqueado(req: Request, email: string): number {
  const ahora = Date.now();
  let resta = 0;
  for (const clave of claves(req, email)) {
    const registro = intentos.get(clave);
    if (!registro) continue;
    if (ahora - registro.desde > VENTANA_MS) intentos.delete(clave);
    else if (registro.cantidad >= MAX_INTENTOS) resta = Math.max(resta, VENTANA_MS - (ahora - registro.desde));
  }
  return Math.ceil(resta / 60000);
}

function anotarFallo(req: Request, email: string): void {
  const ahora = Date.now();
  for (const clave of claves(req, email)) {
    const registro = intentos.get(clave);
    if (!registro || ahora - registro.desde > VENTANA_MS) intentos.set(clave, { cantidad: 1, desde: ahora });
    else registro.cantidad++;
  }
}

function limpiarFallos(req: Request, email: string): void {
  for (const clave of claves(req, email)) intentos.delete(clave);
}

// Limpieza periódica para que el mapa no crezca sin límite
setInterval(() => {
  const ahora = Date.now();
  for (const [clave, registro] of intentos) if (ahora - registro.desde > VENTANA_MS) intentos.delete(clave);
}, VENTANA_MS).unref();

// ---------- Rutas ----------

export const rutasAuth = Router();

rutasAuth.post('/registro', (req, res) => {
  const nombre = String(req.body?.nombre ?? '').trim().slice(0, 60);
  const email = String(req.body?.email ?? '').trim().toLowerCase();
  const password = String(req.body?.password ?? '');

  const espera = minutosBloqueado(req, email);
  if (espera) return void res.status(429).json({ error: `Demasiados intentos. Espera ${espera} min.` });

  if (!nombre) return void res.status(400).json({ error: 'Escribe tu nombre.' });
  if (!EMAIL_VALIDO.test(email)) return void res.status(400).json({ error: 'El correo no es válido.' });
  if (password.length < 6) return void res.status(400).json({ error: 'La contraseña debe tener al menos 6 caracteres.' });

  if (usuarioPorEmail(email)) {
    // Cuenta como intento fallido: evita usar el registro para averiguar qué correos existen
    anotarFallo(req, email);
    return void res.status(409).json({ error: 'Ya existe una cuenta con ese correo.' });
  }

  const sal = randomBytes(16).toString('hex');
  const nuevo: UsuarioGuardado = {
    id: randomUUID(),
    nombre,
    email,
    sal,
    hash: cifrar(password, sal),
    creado: new Date().toISOString(),
    foto: null,
    password_cambiada: 0
  };
  insertarUsuario.run(nuevo.id, nuevo.nombre, nuevo.email, nuevo.sal, nuevo.hash, nuevo.creado);

  const respuesta: RespuestaAuth = { token: crearToken(nuevo), usuario: publico(nuevo) };
  res.status(201).json(respuesta);
});

rutasAuth.post('/login', (req, res) => {
  const email = String(req.body?.email ?? '').trim().toLowerCase();
  const password = String(req.body?.password ?? '');

  const espera = minutosBloqueado(req, email);
  if (espera) return void res.status(429).json({ error: `Demasiados intentos. Espera ${espera} min.` });

  const usuario = usuarioPorEmail(email);
  // Mismo mensaje si no existe el correo o si la contraseña está mal
  if (!usuario || !passwordCorrecta(usuario, password)) {
    anotarFallo(req, email);
    return void res.status(401).json({ error: 'Correo o contraseña incorrectos.' });
  }

  limpiarFallos(req, email);
  const respuesta: RespuestaAuth = { token: crearToken(usuario), usuario: publico(usuario) };
  res.json(respuesta);
});

rutasAuth.get('/yo', (req, res) => {
  const usuario = usuarioConSesion(req);
  if (!usuario) return void res.status(401).json({ error: 'La sesión no es válida o ya venció.' });
  res.json(publico(usuario));
});

// Cambia la contraseña y cierra las demás sesiones; responde con un token nuevo para esta
rutasAuth.post('/password', requiereSesion, (req, res) => {
  const usuario = usuarioPorId(res.locals['usuarioId'])!;
  const actual = String(req.body?.actual ?? '');
  const nueva = String(req.body?.nueva ?? '');

  const espera = minutosBloqueado(req, usuario.email);
  if (espera) return void res.status(429).json({ error: `Demasiados intentos. Espera ${espera} min.` });

  if (!passwordCorrecta(usuario, actual)) {
    anotarFallo(req, usuario.email);
    return void res.status(400).json({ error: 'La contraseña actual no es correcta.' });
  }
  if (nueva.length < 6) return void res.status(400).json({ error: 'La nueva contraseña debe tener al menos 6 caracteres.' });
  if (nueva === actual) return void res.status(400).json({ error: 'La nueva contraseña debe ser distinta de la actual.' });

  limpiarFallos(req, usuario.email);
  const sal = randomBytes(16).toString('hex');
  actualizarPassword.run(sal, cifrar(nueva, sal), Math.floor(Date.now() / 1000), usuario.id);

  const respuesta: RespuestaAuth = { token: crearToken(usuario), usuario: publico(usuario) };
  res.json(respuesta);
});

rutasAuth.put('/foto', requiereSesion, (req, res) => {
  const foto = String(req.body?.foto ?? '');
  if (foto.length > MAXIMO_FOTO || !FOTO_VALIDA.test(foto)) {
    return void res.status(400).json({ error: 'La imagen no es válida o es demasiado grande.' });
  }
  actualizarFoto.run(foto, res.locals['usuarioId']);
  res.json(publico(usuarioPorId(res.locals['usuarioId'])!));
});

rutasAuth.delete('/foto', requiereSesion, (_req, res) => {
  actualizarFoto.run(null, res.locals['usuarioId']);
  res.json(publico(usuarioPorId(res.locals['usuarioId'])!));
});
