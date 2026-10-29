import { Injectable, PLATFORM_ID, computed, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, catchError, tap, throwError } from 'rxjs';
import { RespuestaAuth, Usuario } from '../models/usuario';

const CLAVE = 'buscador-paises:sesion';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);
  private enNavegador = isPlatformBrowser(inject(PLATFORM_ID));
  private baseUrl = '/api/auth';

  /** Token JWT de la sesión actual (null = sin sesión). */
  token = signal<string | null>(null);
  usuario = signal<Usuario | null>(null);
  conectado = computed(() => this.usuario() !== null);

  /** Recupera la sesión guardada. Llamar solo en el navegador. */
  cargar(): void {
    if (!this.enNavegador) return;
    try {
      const guardada = localStorage.getItem(CLAVE);
      if (!guardada) return;
      const sesion = JSON.parse(guardada) as RespuestaAuth;
      if (this.vencido(sesion.token)) {
        localStorage.removeItem(CLAVE);
        return;
      }
      this.token.set(sesion.token);
      this.usuario.set(sesion.usuario);

      // El servidor confirma que el token sigue siendo válido (p. ej. tras reiniciarse)
      this.http.get<Usuario>(`${this.baseUrl}/yo`).subscribe({
        next: (usuario) => this.usuario.set(usuario),
        error: (e: HttpErrorResponse) => {
          if (e.status === 401) this.cerrarSesion();
        }
      });
    } catch {
      // Almacenamiento bloqueado o datos corruptos: se empieza sin sesión
    }
  }

  registrar(nombre: string, email: string, password: string): Observable<RespuestaAuth> {
    return this.http
      .post<RespuestaAuth>(`${this.baseUrl}/registro`, { nombre, email, password })
      .pipe(tap((r) => this.guardar(r)), catchError(this.mensajeError));
  }

  iniciarSesion(email: string, password: string): Observable<RespuestaAuth> {
    return this.http
      .post<RespuestaAuth>(`${this.baseUrl}/login`, { email, password })
      .pipe(tap((r) => this.guardar(r)), catchError(this.mensajeError));
  }

  cerrarSesion(): void {
    this.token.set(null);
    this.usuario.set(null);
    try {
      localStorage.removeItem(CLAVE);
    } catch {
      // Nada que borrar
    }
  }

  private guardar(respuesta: RespuestaAuth): void {
    this.token.set(respuesta.token);
    this.usuario.set(respuesta.usuario);
    try {
      localStorage.setItem(CLAVE, JSON.stringify(respuesta));
    } catch {
      // Almacenamiento bloqueado: la sesión dura solo esta visita
    }
  }

  // Convierte el error HTTP en un mensaje para mostrar en el formulario
  private mensajeError = (e: HttpErrorResponse) =>
    throwError(() => new Error(e.error?.error ?? 'No se pudo conectar con el servidor. Intenta de nuevo.'));

  private vencido(token: string): boolean {
    try {
      const datos = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
      return typeof datos.exp !== 'number' || datos.exp * 1000 <= Date.now();
    } catch {
      return true;
    }
  }
}
