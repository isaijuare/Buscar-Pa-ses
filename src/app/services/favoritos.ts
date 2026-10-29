import { Injectable, PLATFORM_ID, effect, inject, signal, untracked } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { ListasUsuario, PaisGuardado } from '../models/usuario';
import { AuthService } from './auth';

export type { PaisGuardado } from '../models/usuario';

const CLAVE_FAVORITOS = 'buscador-paises:favoritos';
const CLAVE_RECIENTES = 'buscador-paises:recientes';
const MAXIMO_RECIENTES = 8;

/**
 * Favoritos y vistos recientemente. Sin sesión se guardan en el navegador; con sesión, además,
 * en la cuenta (así se ven en cualquier dispositivo).
 */
@Injectable({ providedIn: 'root' })
export class FavoritosService {
  private enNavegador = isPlatformBrowser(inject(PLATFORM_ID));
  private http = inject(HttpClient);
  private auth = inject(AuthService);

  // Empiezan vacías (igual que en el HTML prerenderizado) y se leen tras el primer render
  favoritos = signal<PaisGuardado[]>([]);
  recientes = signal<PaisGuardado[]>([]);
  private cargado = signal(false);
  /** Id del usuario cuyas listas ya se trajeron del servidor; hasta entonces no se le sube nada. */
  private sincronizado = signal<string | null>(null);
  private usuarioAnterior: string | null = null;

  constructor() {
    // No se guarda nada hasta haber leído lo existente, para no pisarlo con listas vacías
    effect(() => {
      if (this.cargado()) this.guardar('favoritos', CLAVE_FAVORITOS, this.favoritos());
    });
    effect(() => {
      if (this.cargado()) this.guardar('recientes', CLAVE_RECIENTES, this.recientes());
    });

    // Al iniciar sesión se juntan las listas del navegador con las de la cuenta; al cerrarla se borran
    effect(() => {
      const id = this.auth.usuario()?.id ?? null;
      if (!this.cargado() || id === this.usuarioAnterior) return;
      const anterior = this.usuarioAnterior;
      this.usuarioAnterior = id;
      untracked(() => (id ? this.traerDeLaCuenta(id) : anterior && this.vaciar()));
    });
  }

  /** Lee las listas guardadas. Llamar en el navegador después del primer render. */
  cargar(): void {
    if (this.cargado()) return;
    this.favoritos.set(this.leer(CLAVE_FAVORITOS));
    this.recientes.set(this.leer(CLAVE_RECIENTES));
    this.cargado.set(true);
  }

  esFavorito(code: string): boolean {
    return this.favoritos().some((p) => p.code === code);
  }

  alternarFavorito(pais: PaisGuardado): void {
    this.favoritos.update((lista) =>
      lista.some((p) => p.code === pais.code) ? lista.filter((p) => p.code !== pais.code) : [...lista, pais]
    );
  }

  /** Registra que el usuario abrió la ficha de un país (el más reciente queda primero). */
  registrarVisita(pais: PaisGuardado): void {
    this.cargar();
    this.recientes.update((lista) => [pais, ...lista.filter((p) => p.code !== pais.code)].slice(0, MAXIMO_RECIENTES));
  }

  borrarRecientes(): void {
    this.recientes.set([]);
  }

  private traerDeLaCuenta(id: string): void {
    this.http.get<ListasUsuario>('/api/usuario/listas').subscribe({
      next: (cuenta) => {
        // Si cambió de cuenta mientras tanto, se descarta la respuesta
        if (this.auth.usuario()?.id !== id) return;
        this.favoritos.set(juntar(cuenta.favoritos, this.favoritos()));
        this.recientes.set(juntar(this.recientes(), cuenta.recientes).slice(0, MAXIMO_RECIENTES));
        this.sincronizado.set(id);
      },
      error: () => {
        // Sin conexión con el servidor: se sigue con las listas del navegador
      }
    });
  }

  /** Al cerrar sesión, las listas de esa cuenta no quedan a la vista del siguiente que use el equipo. */
  private vaciar(): void {
    this.sincronizado.set(null);
    this.favoritos.set([]);
    this.recientes.set([]);
  }

  private leer(clave: string): PaisGuardado[] {
    if (!this.enNavegador) return [];
    try {
      const valor = JSON.parse(localStorage.getItem(clave) ?? '[]');
      return Array.isArray(valor) ? valor : [];
    } catch {
      return [];
    }
  }

  private guardar(tipo: keyof ListasUsuario, clave: string, lista: PaisGuardado[]): void {
    if (!this.enNavegador) return;
    try {
      localStorage.setItem(clave, JSON.stringify(lista));
    } catch {
      // Almacenamiento lleno o bloqueado: la lista vale solo para esta visita
    }

    const id = untracked(() => this.sincronizado());
    if (id && id === untracked(() => this.auth.usuario()?.id)) {
      this.http.put(`/api/usuario/listas/${tipo}`, lista).subscribe({ error: () => {} });
    }
  }
}

/** Une dos listas sin repetir países; los de la primera van primero. */
function juntar(primera: PaisGuardado[], segunda: PaisGuardado[]): PaisGuardado[] {
  const codigos = new Set(primera.map((p) => p.code));
  return [...primera, ...segunda.filter((p) => !codigos.has(p.code))];
}
