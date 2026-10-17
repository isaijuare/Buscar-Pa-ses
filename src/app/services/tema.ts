import { DOCUMENT, Injectable, PLATFORM_ID, computed, effect, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

export type Tema = 'claro' | 'oscuro';
/** auto = las tarjetas se oscurecen cuando es de noche en el cielo del fondo */
export type ModoTema = 'auto' | Tema;
const CLAVE = 'buscador-paises:tema';
const SIGUIENTE: Record<ModoTema, ModoTema> = { auto: 'claro', claro: 'oscuro', oscuro: 'auto' };

@Injectable({ providedIn: 'root' })
export class TemaService {
  private documento = inject(DOCUMENT);
  private enNavegador = isPlatformBrowser(inject(PLATFORM_ID));

  modo = signal<ModoTema>(this.modoInicial());
  /** Lo informa el fondo del cielo: true cuando el Sol está bajo el horizonte */
  esDeNoche = signal(this.nocheInicial());

  tema = computed<Tema>(() => {
    const modo = this.modo();
    if (modo !== 'auto') return modo;
    return this.esDeNoche() ? 'oscuro' : 'claro';
  });

  constructor() {
    effect(() => {
      const tema = this.tema();
      if (!this.enNavegador) return;
      this.documento.documentElement.setAttribute('data-tema', tema);
      try {
        localStorage.setItem(CLAVE, this.modo());
      } catch {
        // Almacenamiento bloqueado: la preferencia vale solo para esta visita
      }
    });
  }

  /** Automático → Claro → Oscuro → Automático */
  alternar(): void {
    this.modo.update((m) => SIGUIENTE[m]);
  }

  private modoInicial(): ModoTema {
    if (!this.enNavegador) return 'auto';
    try {
      const guardado = localStorage.getItem(CLAVE);
      if (guardado === 'claro' || guardado === 'oscuro' || guardado === 'auto') return guardado;
    } catch {
      // Sin almacenamiento
    }
    return 'auto';
  }

  // index.html ya calculó un valor aproximado antes de cargar Angular (evita el parpadeo)
  private nocheInicial(): boolean {
    if (!this.enNavegador) return false;
    return this.documento.documentElement.getAttribute('data-noche') === 'si';
  }
}
