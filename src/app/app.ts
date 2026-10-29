import { Component, DOCUMENT, afterNextRender, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { filter, map } from 'rxjs';
import { LugaresTuristicosComponent } from './components/lugares-turisticos/lugares-turisticos';
import { FondoCieloComponent } from './components/fondo-cielo/fondo-cielo';
import { PieComponent } from './components/pie/pie';
import { UbicacionService } from './services/ubicacion';
import { TemaService } from './services/tema';
import { FavoritosService } from './services/favoritos';
import { AuthService } from './services/auth';

const CLAVE_SIDEBAR = 'buscador-paises:sidebar';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, LugaresTuristicosComponent, FondoCieloComponent, PieComponent],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  private router = inject(Router);
  private ruta = inject(ActivatedRoute);
  protected tema = inject(TemaService);
  protected auth = inject(AuthService);
  private documento = inject(DOCUMENT);

  /**
   * Sidebar abierto (iconos con nombre) o cerrado (solo iconos). Se recuerda entre visitas.
   * Lo que se ve depende del atributo data-sidebar del <html>: index.html lo pone antes de pintar,
   * así el sidebar no aparece abierto un instante si estaba cerrado.
   */
  protected sidebarAbierto = signal(true);

  protected alternarSidebar(): void {
    this.sidebarAbierto.update((abierto) => !abierto);
    this.documento.documentElement.setAttribute('data-sidebar', this.sidebarAbierto() ? 'abierto' : 'cerrado');
    try {
      localStorage.setItem(CLAVE_SIDEBAR, this.sidebarAbierto() ? 'abierto' : 'cerrado');
    } catch {
      // Almacenamiento bloqueado: la preferencia vale solo para esta visita
    }
  }

  protected cerrarSesion(): void {
    this.auth.cerrarSesion();
    // El perfil no tiene sentido sin sesión
    if (this.router.url.startsWith('/perfil')) this.router.navigateByUrl('/');
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
      this.sidebarAbierto.set(this.documento.documentElement.getAttribute('data-sidebar') !== 'cerrado');

      // En pantallas angostas la barra superior se desliza: se lleva a la vista la página activa
      this.router.events.pipe(filter((e) => e instanceof NavigationEnd)).subscribe(() =>
        setTimeout(() =>
          this.documento
            .querySelector('.barra-superior a.activo')
            ?.scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'smooth' })
        )
      );
    });
  }
}
