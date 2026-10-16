import { Component, DestroyRef, afterNextRender, inject, signal } from '@angular/core';
import { TiempoActualComponent } from '../tiempo-actual/tiempo-actual';
import { FasesLunaComponent } from '../fases-luna/fases-luna';
import { EstacionesComponent } from '../estaciones/estaciones';
import { UbicacionService } from '../../services/ubicacion';

@Component({
  selector: 'app-panel-cielo',
  standalone: true,
  imports: [TiempoActualComponent, FasesLunaComponent, EstacionesComponent],
  templateUrl: './panel-cielo.html',
  styleUrl: './panel-cielo.css'
})
export class PanelCieloComponent {
  private ubicacionService = inject(UbicacionService);

  ubicacion = this.ubicacionService.actual;
  buscandoGps = this.ubicacionService.buscandoGps;
  avisoGps = this.ubicacionService.avisoGps;
  // Reloj que se actualiza cada minuto: la Luna y las estaciones se recalculan solas
  ahora = signal(new Date());

  private reloj?: ReturnType<typeof setInterval>;

  constructor() {
    // Solo en el navegador: en el prerender no hay geolocalización ni reloj
    afterNextRender(() => {
      this.ahora.set(new Date());
      this.reloj = setInterval(() => this.ahora.set(new Date()), 60000);
      this.ubicacionService.iniciar();
    });
    inject(DestroyRef).onDestroy(() => clearInterval(this.reloj));
  }

  usarGps(): void {
    this.ubicacionService.usarGps();
  }
}
