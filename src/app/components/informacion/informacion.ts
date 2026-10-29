import { Component, computed, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ClavePagina, PAGINAS } from '../../models/contenido-info';

/** Páginas informativas (Quiénes somos, A qué nos dedicamos, Servicios): el texto sale de contenido-info.ts. */
@Component({
  selector: 'app-informacion',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './informacion.html',
  styleUrl: './informacion.css'
})
export class InformacionComponent {
  /** Llega desde data de la ruta (withComponentInputBinding) */
  pagina = input.required<ClavePagina>();

  contenido = computed(() => PAGINAS[this.pagina()]);
}
