export const ASUNTOS_CONTACTO = ['Pregunta', 'Sugerencia', 'Reportar un problema', 'Colaboración', 'Otro'] as const;

export interface MensajeContacto {
  nombre: string;
  email: string;
  asunto: (typeof ASUNTOS_CONTACTO)[number];
  mensaje: string;
}
