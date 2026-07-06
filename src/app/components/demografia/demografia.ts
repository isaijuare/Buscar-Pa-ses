import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { CountryService } from '../../services/country';
import { CountryApiResponse } from '../../models/country';

@Component({
  selector: 'app-demografia',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './demografia.html',
  styleUrl: './demografia.css'
})
export class DemografiaComponent {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private countryService = inject(CountryService);

  codigoPais = signal<string | null>(null);
  datos = signal<CountryApiResponse | null>(null);
  cargando = signal(false);
  error = signal<string | null>(null);

  constructor() {
    this.route.queryParamMap.subscribe((params) => {
      const pais = params.get('pais');
      this.codigoPais.set(pais);

      if (pais) {
        this.cargarDatos(pais);
      } else {
        this.error.set('No se especificó ningún país.');
      }
    });
  }

  /** Regresa a la pantalla de búsqueda sin salir de la pantalla principal, como en el clima */
  volver(): void {
    this.router.navigate(['/']);
  }

  getNombresIdiomas(): string {
    return this.datos()?.languages?.map((l) => l.name).join(', ') ?? '';
  }

  getNombresMonedas(): string {
    return (
      this.datos()
        ?.currencies?.map((c) => `${c.name} (${c.symbol})`)
        .join(', ') ?? ''
    );
  }

  private cargarDatos(codigoPais: string): void {
    this.cargando.set(true);
    this.error.set(null);

    this.countryService.obtenerDatosDemograficos(codigoPais).subscribe({
      next: (respuesta) => {
        this.datos.set(respuesta);
        this.cargando.set(false);
      },
      error: () => {
        this.error.set('No se pudieron cargar los datos demográficos.');
        this.cargando.set(false);
      }
    });
  }
}