export interface Usuario {
  id: string;
  nombre: string;
  email: string;
}

/** Respuesta del servidor al registrarse o iniciar sesión. */
export interface RespuestaAuth {
  token: string;
  usuario: Usuario;
}
