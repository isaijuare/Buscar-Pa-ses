import { Component, effect, inject, input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
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
  private countryService = inject(CountryService);

  // Ya no viene de la URL: quien use este componente (el modal)
  // le pasa el código del país directamente.
  codigoPais = input<string | null>(null);

  // Avisa al padre que debe cerrarse (el padre decide cómo: oculta el modal, etc.)
  cerrar = output<void>();

  datos = signal<CountryApiResponse | null>(null);
  cargando = signal(false);
  error = signal<string | null>(null);

  constructor() {
    // Cada vez que codigoPais cambie (nuevo país seleccionado), recargamos.
    effect(() => {
      const codigo = this.codigoPais();
      if (codigo) {
        this.cargarDatos(codigo);
      }
    });
  }

  onCerrar(): void {
    this.cerrar.emit();
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

    this.countryService.obtenerPorCodigo(codigoPais).subscribe({
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