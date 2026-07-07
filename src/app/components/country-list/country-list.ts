import { Component, inject, signal } from '@angular/core';
import { SearchBarComponent } from '../search-bar/search-bar';
import { CountryCardComponent } from '../country-card/country-card';
import {
  PaisDetalleModalComponent,
  TipoModal
} from '../modal/modal';
import { CountryService } from '../../services/country';
import { Country } from '../../models/country';

@Component({
  selector: 'app-country-list',
  standalone: true,
  imports: [SearchBarComponent, CountryCardComponent, PaisDetalleModalComponent],
  templateUrl: './country-list.html',
  styleUrl: './country-list.css'
})
export class CountryListComponent {
  private countryService = inject(CountryService);

  textoBusqueda = this.countryService.textoBusqueda;
  paises = this.countryService.resultadosBusqueda;

  cargando = signal(false);

  // Estado del modal: qué país y qué tipo de info mostrar
  modalAbierto = signal(false);
  modalTipo = signal<TipoModal>(null);
  paisSeleccionado = signal<Country | null>(null);

  onBuscar(query: string): void {
    this.countryService.textoBusqueda.set(query);

    if (!query.trim()) {
      this.countryService.resultadosBusqueda.set([]);
      return;
    }

    this.cargando.set(true);
    this.countryService.buscarPaises(query).subscribe({
      next: (resultados) => {
        this.countryService.resultadosBusqueda.set(resultados.slice(0, 3));
        this.cargando.set(false);
      },
      error: () => this.cargando.set(false)
    });
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

  cerrarModal(): void {
    this.modalAbierto.set(false);
  }
}