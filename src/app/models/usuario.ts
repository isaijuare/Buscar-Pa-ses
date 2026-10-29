export interface Usuario {
  id: string;
  nombre: string;
  email: string;
  /** Foto de perfil (data URL) o null si no subió ninguna */
  foto?: string | null;
  /** Fecha de registro (ISO) */
  creado?: string;
}

/** Respuesta del servidor al registrarse o iniciar sesión. */
export interface RespuestaAuth {
  token: string;
  usuario: Usuario;
}

/** Lo mínimo para mostrar un país en una lista sin descargar todos los datos. */
export interface PaisGuardado {
  code: string;
  nombre: string;
  banderaUrl?: string;
}

/** Favoritos y vistos recientemente guardados en la cuenta. */
export interface ListasUsuario {
  favoritos: PaisGuardado[];
  recientes: PaisGuardado[];
}

export type ModoQuiz = 'bandera' | 'capital';
/** Todos los juegos con récord: los dos modos del quiz y los juegos de Entretenimiento */
export type ModoJuego = ModoQuiz | 'estaciones' | 'memoria';

/** Reglas de puntaje de cada juego (las usa el servidor para validar y ordenar el ranking). */
export const REGLAS_JUEGOS: Record<ModoJuego, { minimo: number; maximo: number; menorEsMejor: boolean }> = {
  bandera: { minimo: 0, maximo: 10, menorEsMejor: false },
  capital: { minimo: 0, maximo: 10, menorEsMejor: false },
  estaciones: { minimo: 0, maximo: 10, menorEsMejor: false },
  // Movimientos para encontrar los 8 pares: 8 es el mínimo posible
  memoria: { minimo: 8, maximo: 500, menorEsMejor: true }
};

export interface PuestoRanking {
  nombre: string;
  puntaje: number;
  /** true si es el usuario que hizo la petición */
  propio: boolean;
}

/**
 * Récords: los del usuario (si inició sesión; null en un juego sin récord todavía,
 * o 0 en los modos del quiz) y los mejores de todos en cada juego.
 */
export interface RecordsQuiz {
  propios: Record<ModoJuego, number | null> | null;
  ranking: Record<ModoJuego, PuestoRanking[]>;
}
