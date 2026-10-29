import { Component, afterNextRender, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { filter, map } from 'rxjs';
import { LugaresTuristicosComponent } from './components/lugares-turisticos/lugares-turisticos';
import { FondoCieloComponent } from './components/fondo-cielo/fondo-cielo';
import { UbicacionService } from './services/ubicacion';
import { TemaService } from './services/tema';
import { FavoritosService } from './services/favoritos';
import { AuthService } from './services/auth';

const CLAVE_SIDEBAR = 'buscador-paises:sidebar';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, LugaresTuristicosComponent, FondoCieloComponent],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  private router = inject(Router);
  private ruta = inject(ActivatedRoute);
  protected tema = inject(TemaService);
  protected auth = inject(AuthService);

  /** Sidebar abierto (iconos con nombre) o cerrado (solo iconos). Se recuerda entre visitas. */
  protected sidebarAbierto = signal(true);

  protected alternarSidebar(): void {
    this.sidebarAbierto.update((abierto) => !abierto);
    try {
      localStorage.setItem(CLAVE_SIDEBAR, this.sidebarAbierto() ? 'abierto' : 'cerrado');
    } catch {
      // Almacenamiento bloqueado: la preferencia vale solo para esta visita
    }
  }

  protected textoTema = computed(() => {
    switch (this.tema.modo()) {
      case 'auto':
        return { texto: 'Automático', siguiente: 'tema claro' };
      case 'claro':
        return { texto: 'Claro', siguiente: 'tema oscuro' };
      default:
        return { texto: 'Oscuro', siguiente: 'tema automático (según el cielo)' };
    }
  });

  // Las páginas pueden ocultar la barra de lugares con data: { barraLateral: false }
  protected mostrarBarra = toSignal(
    this.router.events.pipe(
      filter((e) => e instanceof NavigationEnd),
      map(() => {
        let r = this.ruta;
        while (r.firstChild) r = r.firstChild;
        return r.snapshot.data['barraLateral'] !== false;
      })
    ),
    { initialValue: true }
  );

  constructor() {
    const ubicacion = inject(UbicacionService);
    const favoritos = inject(FavoritosService);
    afterNextRender(() => {
      // La ubicación del usuario la comparten el panel del cielo y la barra de lugares
      ubicacion.iniciar();
      favoritos.cargar();
      this.auth.cargar();
      try {
        if (localStorage.getItem(CLAVE_SIDEBAR) === 'cerrado') this.sidebarAbierto.set(false);
      } catch {
        // Sin acceso al almacenamiento: queda abierto
      }
    });
  }
}
