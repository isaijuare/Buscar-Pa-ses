import { Router, type Request } from 'express';
import { createHmac, randomBytes, randomUUID, scryptSync, timingSafeEqual } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import type { RespuestaAuth, Usuario } from '../app/models/usuario';

/**
 * Registro e inicio de sesión con JWT (HS256).
 * Por ahora sin base de datos: los usuarios se guardan en datos/usuarios.json.
 */

// Sin JWT_SECRET en el .env se usa una clave temporal: las sesiones se cierran al reiniciar el servidor
const SECRETO = process.env['JWT_SECRET'] || randomBytes(32).toString('hex');
if (!process.env['JWT_SECRET']) {
  console.warn('JWT_SECRET no está definido: se usa una clave temporal (ver .env.example).');
}

const DURACION_TOKEN_S = 7 * 24 * 60 * 60;
const ARCHIVO_USUARIOS = join(process.cwd(), 'datos', 'usuarios.json');
const EMAIL_VALIDO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface UsuarioGuardado extends Usuario {
  sal: string;
  hash: string;
  creado: string;
}

interface DatosToken {
  sub: string;
  nombre: string;
  email: string;
  iat: number;
  exp: number;
}

// ---------- Usuarios ----------

let usuarios: UsuarioGuardado[] | null = null;

function leerUsuarios(): UsuarioGuardado[] {
  if (!usuarios) {
    try {
      usuarios = existsSync(ARCHIVO_USUARIOS) ? JSON.parse(readFileSync(ARCHIVO_USUARIOS, 'utf8')) : [];
    } catch (error) {
      console.error('No se pudo leer datos/usuarios.json:', error);
      usuarios = [];
    }
  }
  return usuarios!;
}

function guardarUsuarios(): void {
  mkdirSync(dirname(ARCHIVO_USUARIOS), { recursive: true });
  writeFileSync(ARCHIVO_USUARIOS, JSON.stringify(usuarios, null, 2));
}

const cifrar = (password: string, sal: string) => scryptSync(password, sal, 64).toString('hex');

function passwordCorrecta(u: UsuarioGuardado, password: string): boolean {
  const esperado = Buffer.from(u.hash, 'hex');
  const recibido = Buffer.from(cifrar(password, u.sal), 'hex');
  return esperado.length === recibido.length && timingSafeEqual(esperado, recibido);
}

const publico = ({ id, nombre, email }: UsuarioGuardado): Usuario => ({ id, nombre, email });

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

// ---------- Rutas ----------

export const rutasAuth = Router();

rutasAuth.post('/registro', (req, res) => {
  const nombre = String(req.body?.nombre ?? '').trim();
  const email = String(req.body?.email ?? '').trim().toLowerCase();
  const password = String(req.body?.password ?? '');

  if (!nombre) return void res.status(400).json({ error: 'Escribe tu nombre.' });
  if (!EMAIL_VALIDO.test(email)) return void res.status(400).json({ error: 'El correo no es válido.' });
  if (password.length < 6) return void res.status(400).json({ error: 'La contraseña debe tener al menos 6 caracteres.' });

  const lista = leerUsuarios();
  if (lista.some((u) => u.email === email)) {
    return void res.status(409).json({ error: 'Ya existe una cuenta con ese correo.' });
  }

  const sal = randomBytes(16).toString('hex');
  const nuevo: UsuarioGuardado = {
    id: randomUUID(),
    nombre,
    email,
    sal,
    hash: cifrar(password, sal),
    creado: new Date().toISOString()
  };
  lista.push(nuevo);
  guardarUsuarios();

  const respuesta: RespuestaAuth = { token: crearToken(nuevo), usuario: publico(nuevo) };
  res.status(201).json(respuesta);
});

rutasAuth.post('/login', (req, res) => {
  const email = String(req.body?.email ?? '').trim().toLowerCase();
  const password = String(req.body?.password ?? '');

  const usuario = leerUsuarios().find((u) => u.email === email);
  // Mismo mensaje si no existe el correo o si la contraseña está mal
  if (!usuario || !passwordCorrecta(usuario, password)) {
    return void res.status(401).json({ error: 'Correo o contraseña incorrectos.' });
  }

  const respuesta: RespuestaAuth = { token: crearToken(usuario), usuario: publico(usuario) };
  res.json(respuesta);
});

rutasAuth.get('/yo', (req, res) => {
  const datos = usuarioDePeticion(req);
  const usuario = datos && leerUsuarios().find((u) => u.id === datos.sub);
  if (!usuario) return void res.status(401).json({ error: 'La sesión no es válida o ya venció.' });
  res.json(publico(usuario));
});
