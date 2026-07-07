import { Component, input, output } from '@angular/core';
import { DemografiaComponent } from '../demografia/demografia';
import { ClimaComponent } from '../clima/clima';
import { Country } from '../../models/country';

export type TipoModal = 'demografia' | 'clima' | null;

@Component({
  selector: 'app-pais-detalle-modal',
  standalone: true,
  
  imports: [DemografiaComponent, ClimaComponent],
  templateUrl: './modal.html',
  styleUrl: './modal.css'
})
export class PaisDetalleModalComponent {
  abierto = input<boolean>(false);
  tipo = input<TipoModal>(null);
  pais = input<Country | null>(null);

  cerrar = output<void>();

  onCerrar(): void {
    this.cerrar.emit();
  }
}