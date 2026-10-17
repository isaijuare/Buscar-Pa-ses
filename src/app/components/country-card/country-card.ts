import { Component, computed, inject, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Country } from '../../models/country';
import { FavoritosService } from '../../services/favoritos';

@Component({
  selector: 'app-country-card',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './country-card.html',
  styleUrl: './country-card.css'
})
export class CountryCardComponent {
  private favoritosService = inject(FavoritosService);

  pais = input.required<Country>();

  verDemografia = output<Country>();
  verClima = output<Country>();
  verLugares = output<Country>();

  esFavorito = computed(() => this.favoritosService.favoritos().some((p) => p.code === this.pais().code));

  onVerDemografia(): void {
    this.verDemografia.emit(this.pais());
  }

  onVerClima(): void {
    this.verClima.emit(this.pais());
  }

  onVerLugares(): void {
    this.verLugares.emit(this.pais());
  }

  onAlternarFavorito(): void {
    const p = this.pais();
    this.favoritosService.alternarFavorito({ code: p.code, nombre: p.nameEs ?? p.name, banderaUrl: p.flagUrl });
  }
}
