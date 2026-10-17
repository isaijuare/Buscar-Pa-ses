import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SearchBarComponent } from '../search-bar/search-bar';
import { CountryCardComponent } from '../country-card/country-card';
import {
  PaisDetalleModalComponent,
  TipoModal
} from '../modal/modal';
import { PanelCieloComponent } from '../panel-cielo/panel-cielo';
import { CountryService } from '../../services/country';
import { LugaresService } from '../../services/lugares';
import { UbicacionService } from '../../services/ubicacion';
import { FavoritosService } from '../../services/favoritos';
import { Country } from '../../models/country';

// Cuántas tarjetas se muestran por tanda de resultados
const TANDA = 3;

@Component({
  selector: 'app-country-list',
  standalone: true,
  imports: [SearchBarComponent, CountryCardComponent, PaisDetalleModalComponent, PanelCieloComponent, RouterLink],
  templateUrl: './country-list.html',
  styleUrl: './country-list.css'
})
export class CountryListComponent {
  private countryService = inject(CountryService);
  private lugaresService = inject(LugaresService);
  private ubicacionService = inject(UbicacionService);
  protected favoritosService = inject(FavoritosService);

  textoBusqueda = this.countryService.textoBusqueda;
  todosLosResultados = this.countryService.resultadosBusqueda;
  limite = signal(TANDA);

  paises = computed(() => this.todosLosResultados().slice(0, this.limite()));
  restantes = computed(() => this.todosLosResultados().length - this.paises().length);

  cargando = signal(false);
  errorBusqueda = signal<string | null>(null);

  // Estado del modal: qué país y qué tipo de info mostrar
  modalAbierto = signal(false);
  modalTipo = signal<TipoModal>(null);
  paisSeleccionado = signal<Country | null>(null);

  onBuscar(query: string): void {
    this.countryService.textoBusqueda.set(query);
    this.limite.set(TANDA);
    this.errorBusqueda.set(null);

    if (!query.trim()) {
      this.countryService.resultadosBusqueda.set([]);
      return;
    }

    this.cargando.set(true);
    this.countryService.buscarPaises(query).subscribe({
      next: (resultados) => {
        // Si el usuario siguió escribiendo, se ignora la respuesta vieja
        if (query !== this.countryService.textoBusqueda()) return;
        this.countryService.resultadosBusqueda.set(resultados);
        this.cargando.set(false);
      },
      error: () => {
        this.cargando.set(false);
        this.errorBusqueda.set('No se pudo cargar la lista de países. Intenta de nuevo en unos segundos.');
      }
    });
  }

  mostrarMas(): void {
    this.limite.update((n) => n + TANDA * 2);
  }

  onVerDemografia(pais: Country): void {
    this.paisSeleccionado.set(pais);
    this.modalTipo.set('demografia');
    this.modalAbierto.set(true);
  }

  onVerClima(pais: Country): void {
    this.paisSeleccionado.set(pais);
    this.modalTipo.set('clima');
    this.modalAbierto.set(true);
  }

  onVerLugares(pais: Country): void {
    this.lugaresService.mostrarPais(pais, true);
  }

  // Clic en el mapa del panel: el clima, la Luna, las estaciones y los lugares pasan a ese punto
  onPuntoElegido(punto: { lat: number; lon: number }): void {
    this.lugaresService.volverACercaDeTi();
    this.ubicacionService.elegirPunto(punto.lat, punto.lon);
  }

  cerrarModal(): void {
    this.modalAbierto.set(false);
  }
}
