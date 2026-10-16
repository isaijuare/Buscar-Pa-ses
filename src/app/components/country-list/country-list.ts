import { Component, ElementRef, inject, signal, viewChild } from '@angular/core';
import { SearchBarComponent } from '../search-bar/search-bar';
import { CountryCardComponent } from '../country-card/country-card';
import {
  PaisDetalleModalComponent,
  TipoModal
} from '../modal/modal';
import { PanelCieloComponent } from '../panel-cielo/panel-cielo';
import { LugaresTuristicosComponent } from '../lugares-turisticos/lugares-turisticos';
import { CountryService } from '../../services/country';
import { LugaresService } from '../../services/lugares';
import { Country } from '../../models/country';

@Component({
  selector: 'app-country-list',
  standalone: true,
  imports: [SearchBarComponent, CountryCardComponent, PaisDetalleModalComponent, PanelCieloComponent, LugaresTuristicosComponent],
  templateUrl: './country-list.html',
  styleUrl: './country-list.css'
})
export class CountryListComponent {
  private countryService = inject(CountryService);
  private lugaresService = inject(LugaresService);

  private barraLugares = viewChild(LugaresTuristicosComponent, { read: ElementRef });

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

  onVerLugares(pais: Country): void {
    this.lugaresService.mostrarPais(pais);

    // En pantallas angostas la barra está debajo de todo: se lleva al usuario hasta ella
    if (window.matchMedia('(max-width: 1000px)').matches) {
      this.barraLugares()?.nativeElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  cerrarModal(): void {
    this.modalAbierto.set(false);
  }
}