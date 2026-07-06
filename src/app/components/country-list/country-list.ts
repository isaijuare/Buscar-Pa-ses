import { Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { SearchBarComponent } from '../search-bar/search-bar';
import { CountryCardComponent } from '../country-card/country-card';
import { CountryService } from '../../services/country';
import { Country } from '../../models/country';

@Component({
  selector: 'app-country-list',
  standalone: true,
  imports: [SearchBarComponent, CountryCardComponent],
  templateUrl: './country-list.html',
  styleUrl: './country-list.css'
})
export class CountryListComponent {
  private countryService = inject(CountryService);
  private router = inject(Router);

  textoBusqueda = this.countryService.textoBusqueda;
  paises = this.countryService.resultadosBusqueda;

  cargando = signal(false);

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
    this.router.navigate(['/demografia'], { queryParams: { pais: pais.code } });
  }

  onVerClima(pais: Country): void {
    this.router.navigate(['/clima'], {
      queryParams: { lat: pais.lat, lon: pais.lon, nombre: pais.name }
    });
  }
}