import { Router } from 'express';
import { ASUNTOS_CONTACTO, type MensajeContacto } from '../app/models/contacto';
import { usuarioDePeticion } from './auth';
import { db } from './db';

/** Formulario de contacto: los mensajes se guardan en la tabla `mensajes` de la base de datos. */

const EMAIL_VALIDO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const LARGO_MAXIMO = 2000;

// Contra el spam: como máximo 3 mensajes cada 10 minutos desde la misma IP
const MAX_MENSAJES = 3;
const VENTANA_MS = 10 * 60 * 1000;
const enviosPorIp = new Map<string, number[]>();

const guardarMensaje = db.prepare(
  'INSERT INTO mensajes (nombre, email, asunto, mensaje, usuario_id, fecha) VALUES (?, ?, ?, ?, ?, ?)'
);

export const rutasContacto = Router();

rutasContacto.post('/', (req, res) => {
  const ahora = Date.now();
  const ip = req.ip ?? 'desconocida';
  const recientes = (enviosPorIp.get(ip) ?? []).filter((t) => ahora - t < VENTANA_MS);
  if (recientes.length >= MAX_MENSAJES) {
    return void res.status(429).json({ error: 'Ya recibimos varios mensajes tuyos. Intenta de nuevo en unos minutos.' });
  }

  const cuerpo = (req.body ?? {}) as Partial<MensajeContacto>;
  const nombre = String(cuerpo.nombre ?? '').trim().slice(0, 80);
  const email = String(cuerpo.email ?? '').trim().toLowerCase();
  const asunto = String(cuerpo.asunto ?? '');
  const mensaje = String(cuerpo.mensaje ?? '').trim();

  if (!nombre) return void res.status(400).json({ error: 'Escribe tu nombre.' });
  if (!EMAIL_VALIDO.test(email)) return void res.status(400).json({ error: 'El correo no es válido.' });
  if (!ASUNTOS_CONTACTO.includes(asunto as MensajeContacto['asunto'])) {
    return void res.status(400).json({ error: 'Elige un asunto.' });
  }
  if (mensaje.length < 10) return void res.status(400).json({ error: 'El mensaje es muy corto (mínimo 10 caracteres).' });
  if (mensaje.length > LARGO_MAXIMO) {
    return void res.status(400).json({ error: `El mensaje es muy largo (máximo ${LARGO_MAXIMO} caracteres).` });
  }

  guardarMensaje.run(nombre, email, asunto, mensaje, usuarioDePeticion(req)?.sub ?? null, new Date().toISOString());
  enviosPorIp.set(ip, [...recientes, ahora]);
  res.status(201).json({ ok: true });
});

// Limpieza periódica para que el mapa no crezca sin límite
setInterval(() => {
  const ahora = Date.now();
  for (const [ip, tiempos] of enviosPorIp) {
    if (tiempos.every((t) => ahora - t >= VENTANA_MS)) enviosPorIp.delete(ip);
  }
}, VENTANA_MS).unref();
