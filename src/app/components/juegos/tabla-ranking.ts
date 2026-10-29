import { Component, computed, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth';
import { JuegoEntretenimiento, RecordsJuegosService } from '../../services/records-juegos';

/** Mejores puntajes de un juego de Entretenimiento. */
@Component({
  selector: 'app-tabla-ranking',
  standalone: true,
  imports: [RouterLink],
  template: `
    <section class="tarjeta-noche ranking" [attr.aria-label]="'Mejores puntajes'">
      <h3 class="titulo-seccion">Mejores puntajes</h3>
      @if (puestos(); as lista) {
        @if (lista.length) {
          <ol class="puestos">
            @for (p of lista; track $index) {
              <li [class.propio]="p.propio">
                <span class="lugar">{{ $index + 1 }}</span>
                <span class="jugador">{{ p.nombre }}@if (p.propio) { <small>(tú)</small> }</span>
                <span class="puntos">{{ formato()(p.puntaje) }}</span>
              </li>
            }
          </ol>
        } @else {
          <p class="mensaje">Nadie ha jugado todavía. ¡Sé el primero!</p>
        }
      } @else {
        <p class="mensaje">No se pudo cargar el ranking.</p>
      }
      @if (!auth.conectado()) {
        <p class="aviso"><a routerLink="/login">Inicia sesión</a> para guardar tus récords y aparecer aquí.</p>
      }
    </section>
  `,
  styles: `
    .ranking { font-family: system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif; }
    .puestos { list-style: none; margin: 0; padding: 0; }
    .puestos li { display: flex; align-items: center; gap: 10px; padding: 7px 10px; border-radius: 8px; }
    .puestos li:nth-child(odd) { background: var(--superficie-2); }
    .puestos li.propio { background: var(--acento-fondo); }
    .lugar { width: 1.4em; color: var(--texto-2); font-variant-numeric: tabular-nums; }
    .puestos li:first-child .lugar { color: var(--acento); font-weight: 700; }
    .jugador { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .jugador small { color: var(--texto-2); }
    .puntos { font-weight: 600; font-variant-numeric: tabular-nums; }
    .aviso { margin: 14px 0 0; font-size: 0.85rem; color: var(--texto-2); }
    .aviso a { color: var(--acento); }
  `
})
export class TablaRankingComponent {
  protected auth = inject(AuthService);
  private records = inject(RecordsJuegosService);

  juego = input.required<JuegoEntretenimiento>();
  /** Cómo mostrar el puntaje (p. ej. "7/10" o "12 movimientos") */
  formato = input<(puntaje: number) => string>((p) => String(p));

  puestos = computed(() => this.records.ranking()?.[this.juego()] ?? null);
}
