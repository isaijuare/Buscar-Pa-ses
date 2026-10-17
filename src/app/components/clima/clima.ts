import { Component, computed, input, output } from '@angular/core';
import { TiempoActualComponent } from '../tiempo-actual/tiempo-actual';
import { Ubicacion } from '../../models/cielo';

@Component({
  selector: 'app-clima',
  standalone: true,
  imports: [TiempoActualComponent],
  templateUrl: './clima.html',
  styleUrl: './clima.css'
})
export class ClimaComponent {
  // Ya no viene de la URL: el modal se lo pasa directo.
  lat = input<number | null>(null);
  lon = input<number | null>(null);
  nombrePais = input<string | null>(null);

  cerrar = output<void>();

  // Reutiliza la tarjeta del clima del panel: temperatura actual real y próximas horas
  ubicacion = computed<Ubicacion | null>(() => {
    const lat = this.lat();
    const lon = this.lon();
    if (lat == null || lon == null) return null;
    return { lat, lon, nombre: this.nombrePais() ?? '', fuente: 'pais' };
  });

  onCerrar(): void {
    this.cerrar.emit();
  }
}
