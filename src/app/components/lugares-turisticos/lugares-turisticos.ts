import { Component, ElementRef, computed, effect, inject, signal, untracked } from '@angular/core';
import { LugaresService, RADIO_BUSQUEDA_KM } from '../../services/lugares';
import { CategoriaLugar, INFO_CATEGORIA } from '../../models/lugares';

@Component({
  selector: 'app-lugares-turisticos',
  standalone: true,
  templateUrl: './lugares-turisticos.html',
  styleUrl: './lugares-turisticos.css'
})
export class LugaresTuristicosComponent {
  private lugaresService = inject(LugaresService);
  private elemento = inject(ElementRef<HTMLElement>);

  readonly radioKm = RADIO_BUSQUEDA_KM;
  readonly infoCategoria = INFO_CATEGORIA;

  // El estado vive en el servicio: el mapa muestra los mismos lugares como marcadores
  zona = this.lugaresService.zona;
  lugares = this.lugaresService.lugares;
  cargando = this.lugaresService.cargando;
  error = this.lugaresService.error;
  filtro = signal<CategoriaLugar | null>(null);

  // Solo se muestran los filtros de las categorías que tienen resultados
  categorias = computed(() => {
    const conteo = new Map<CategoriaLugar, number>();
    for (const l of this.lugares()) conteo.set(l.categoria, (conteo.get(l.categoria) ?? 0) + 1);
    return [...conteo.entries()].map(([id, cantidad]) => ({ id, cantidad, ...INFO_CATEGORIA[id] }));
  });

  visibles = computed(() => {
    const filtro = this.filtro();
    return filtro ? this.lugares().filter((l) => l.categoria === filtro) : this.lugares();
  });

  constructor() {
    // Al cambiar de zona se quita el filtro de categoría
    effect(() => {
      this.zona();
      untracked(() => this.filtro.set(null));
    });

    // En pantallas angostas la barra está debajo de todo: se lleva al usuario hasta ella
    effect(() => {
      if (this.lugaresService.pedidoDesplazamiento() === 0) return;
      if (window.matchMedia('(max-width: 1000px)').matches) {
        this.elemento.nativeElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  }

  volverACercaDeTi(): void {
    this.lugaresService.volverACercaDeTi();
  }

  elegirFiltro(categoria: CategoriaLugar | null): void {
    this.filtro.set(categoria);
  }

  formatoDistancia(km: number): string {
    return km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(1)} km`;
  }
}
