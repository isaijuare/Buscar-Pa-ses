import { Component, DestroyRef, computed, effect, inject, signal } from '@angular/core';
import { Subscription } from 'rxjs';
import { LugaresService, RADIO_BUSQUEDA_KM } from '../../services/lugares';
import { UbicacionService } from '../../services/ubicacion';
import { CategoriaLugar, INFO_CATEGORIA, LugarTuristico, ZonaLugares } from '../../models/lugares';

@Component({
  selector: 'app-lugares-turisticos',
  standalone: true,
  templateUrl: './lugares-turisticos.html',
  styleUrl: './lugares-turisticos.css'
})
export class LugaresTuristicosComponent {
  private lugaresService = inject(LugaresService);

  readonly radioKm = RADIO_BUSQUEDA_KM;
  readonly infoCategoria = INFO_CATEGORIA;

  private ubicacion = inject(UbicacionService).actual;

  // Capital del país elegido o, si no hay ninguno, la ubicación del usuario
  zona = computed<ZonaLugares | null>(() => {
    const pais = this.lugaresService.zonaPais();
    if (pais) return pais;
    const u = this.ubicacion();
    return u ? { lat: u.lat, lon: u.lon, nombre: u.nombre, esPais: false } : null;
  });

  lugares = signal<LugarTuristico[]>([]);
  cargando = signal(false);
  error = signal<string | null>(null);
  filtro = signal<CategoriaLugar | null>(null);

  private peticion?: Subscription;

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
    effect(() => {
      const z = this.zona();
      if (z) this.cargar(z.lat, z.lon);
    });
    inject(DestroyRef).onDestroy(() => this.peticion?.unsubscribe());
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

  private cargar(lat: number, lon: number): void {
    this.peticion?.unsubscribe();
    this.cargando.set(true);
    this.error.set(null);
    this.filtro.set(null);

    this.peticion = this.lugaresService.buscarCerca(lat, lon).subscribe({
      next: (lugares) => {
        this.lugares.set(lugares);
        this.cargando.set(false);
      },
      error: () => {
        this.error.set('No se pudieron cargar los lugares turísticos.');
        this.cargando.set(false);
      }
    });
  }
}
