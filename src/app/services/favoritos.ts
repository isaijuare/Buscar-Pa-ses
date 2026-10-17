import { Injectable, PLATFORM_ID, effect, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

/** Lo mínimo para mostrar un país en una lista sin descargar todos los datos. */
export interface PaisGuardado {
  code: string;
  nombre: string;
  banderaUrl?: string;
}

const CLAVE_FAVORITOS = 'buscador-paises:favoritos';
const CLAVE_RECIENTES = 'buscador-paises:recientes';
const MAXIMO_RECIENTES = 8;

@Injectable({ providedIn: 'root' })
export class FavoritosService {
  private enNavegador = isPlatformBrowser(inject(PLATFORM_ID));

  // Empiezan vacías (igual que en el HTML prerenderizado) y se leen tras el primer render
  favoritos = signal<PaisGuardado[]>([]);
  recientes = signal<PaisGuardado[]>([]);
  private cargado = signal(false);

  constructor() {
    // No se guarda nada hasta haber leído lo existente, para no pisarlo con listas vacías
    effect(() => {
      if (this.cargado()) this.guardar(CLAVE_FAVORITOS, this.favoritos());
    });
    effect(() => {
      if (this.cargado()) this.guardar(CLAVE_RECIENTES, this.recientes());
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

  private leer(clave: string): PaisGuardado[] {
    if (!this.enNavegador) return [];
    try {
      const valor = JSON.parse(localStorage.getItem(clave) ?? '[]');
      return Array.isArray(valor) ? valor : [];
    } catch {
      return [];
    }
  }

  private guardar(clave: string, lista: PaisGuardado[]): void {
    if (!this.enNavegador) return;
    try {
      localStorage.setItem(clave, JSON.stringify(lista));
    } catch {
      // Almacenamiento lleno o bloqueado: la lista vale solo para esta visita
    }
  }
}
