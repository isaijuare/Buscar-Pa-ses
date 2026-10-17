import { Component, computed, input } from '@angular/core';

let contador = 0;

@Component({
  selector: 'app-dibujo-luna',
  standalone: true,
  template: `
    <svg
      [attr.width]="tamano()"
      [attr.height]="tamano()"
      viewBox="-50 -50 100 100"
      role="img"
      [attr.aria-label]="'Luna ' + porcentaje() + '% iluminada'"
    >
      <defs>
        <clipPath [attr.id]="idRecorte">
          <path [attr.d]="trazo()" [attr.transform]="espejo()" />
        </clipPath>
      </defs>
      <circle r="48" class="sombra" />
      <path [attr.d]="trazo()" [attr.transform]="espejo()" class="luz" />
      <!-- Los cráteres solo se ven sobre la parte iluminada -->
      <g [attr.clip-path]="'url(#' + idRecorte + ')'">
        <circle cx="-14" cy="-16" r="9" class="crater" />
        <circle cx="18" cy="8" r="12" class="crater" />
        <circle cx="-6" cy="22" r="6" class="crater" />
        <circle cx="20" cy="-22" r="5" class="crater" />
      </g>
    </svg>
  `,
  styles: `
    :host { display: inline-flex; }
    svg { overflow: visible; filter: drop-shadow(0 0 10px rgba(255, 244, 214, 0.25)); }
    /* La parte oscura se puede ajustar desde afuera (en el cielo del fondo es casi transparente) */
    .sombra { fill: var(--sombra-luna, #26324d); stroke: var(--borde-luna, rgba(255, 255, 255, 0.25)); stroke-width: 1.5; }
    .luz { fill: #f6f1dc; }
    .crater { fill: rgba(60, 60, 80, 0.14); }
  `
})
export class DibujoLunaComponent {
  /** Fracción iluminada, de 0 a 1 */
  iluminacion = input.required<number>();
  creciente = input(true);
  // En el hemisferio sur la Luna se ve "al revés"
  hemisferioSur = input(false);
  tamano = input(100);

  // Cada dibujo necesita su propio id de recorte dentro de la página
  readonly idRecorte = `luna-recorte-${++contador}`;

  porcentaje = computed(() => Math.round(this.iluminacion() * 100));

  // Mitad iluminada (semicírculo) + terminador (media elipse)
  trazo = computed(() => {
    const f = this.iluminacion();
    const radioX = 48 * Math.abs(2 * f - 1);
    const gibosa = f > 0.5 ? 1 : 0;
    return `M 0 -48 A 48 48 0 0 1 0 48 A ${radioX} 48 0 0 ${gibosa} 0 -48 Z`;
  });

  // El dibujo base tiene la luz a la derecha (creciente vista desde el norte)
  espejo = computed(() => (this.creciente() !== this.hemisferioSur() ? null : 'scale(-1 1)'));
}
