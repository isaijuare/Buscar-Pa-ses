import { Component, DestroyRef, afterNextRender, computed, effect, inject, input, output, signal, untracked } from '@angular/core';
import { Subscription } from 'rxjs';
import { TiempoActualComponent } from '../tiempo-actual/tiempo-actual';
import { FasesLunaComponent } from '../fases-luna/fases-luna';
import { EstacionesComponent } from '../estaciones/estaciones';
import { HorasSolComponent } from '../horas-sol/horas-sol';
import { CalidadAireComponent } from '../calidad-aire/calidad-aire';
import { CieloNocturnoComponent } from '../cielo-nocturno/cielo-nocturno';
import { MapaComponent, MarcadorMapa } from '../mapa/mapa';
import { UbicacionService } from '../../services/ubicacion';
import { LugaresService } from '../../services/lugares';
import { TiempoService } from '../../services/tiempo';
import { INFO_CATEGORIA } from '../../models/lugares';
import { Ubicacion } from '../../models/cielo';
import { desfaseMinutos, textoDesfase } from '../../utils/zona-horaria';

@Component({
  selector: 'app-panel-cielo',
  standalone: true,
  imports: [
    TiempoActualComponent,
    FasesLunaComponent,
    EstacionesComponent,
    HorasSolComponent,
    CalidadAireComponent,
    CieloNocturnoComponent,
    MapaComponent
  ],
  templateUrl: './panel-cielo.html',
  styleUrl: './panel-cielo.css'
})
export class PanelCieloComponent {
  private ubicacionService = inject(UbicacionService);
  private lugaresService = inject(LugaresService);
  private tiempoService = inject(TiempoService);

  /** Ubicación fija (p. ej. la capital en la ficha de un país). Sin ella se usa la del usuario. */
  ubicacionFija = input<Ubicacion | null>(null);
  titulo = input('Tu cielo ahora');

  /** Clic en el mapa: el padre decide qué hacer con el punto elegido */
  puntoElegido = output<{ lat: number; lon: number }>();

  ubicacion = computed(() => this.ubicacionFija() ?? this.ubicacionService.actual());
  esFija = computed(() => this.ubicacionFija() !== null);
  buscandoGps = this.ubicacionService.buscandoGps;
  avisoGps = this.ubicacionService.avisoGps;

  // Reloj que se actualiza cada minuto: la Luna, el Sol y los planetas se recalculan solos
  ahora = signal(new Date());

  /** Zona horaria del lugar (las horas se muestran en la hora local de allí) */
  zona = signal<string | undefined>(undefined);
  private peticionZona?: Subscription;

  // Aviso cuando la hora del lugar no es la del navegador
  textoZona = computed(() => {
    const zona = this.zona();
    if (!zona) return null;
    const ahora = this.ahora();
    const delLugar = desfaseMinutos(ahora, zona);
    if (delLugar === desfaseMinutos(ahora)) return null;
    return `Horas en hora local del lugar (${textoDesfase(delLugar)})`;
  });

  marcadores = computed<MarcadorMapa[]>(() =>
    this.lugaresService.lugares().map((l) => ({
      lat: l.lat,
      lon: l.lon,
      titulo: l.nombre,
      subtitulo: `${INFO_CATEGORIA[l.categoria].icono} ${INFO_CATEGORIA[l.categoria].nombre}`,
      url: l.urlWikipedia
    }))
  );

  private reloj?: ReturnType<typeof setInterval>;

  constructor() {
    // Solo en el navegador: en el prerender no hay reloj
    afterNextRender(() => {
      this.ahora.set(new Date());
      this.reloj = setInterval(() => this.ahora.set(new Date()), 60000);
    });

    effect(() => {
      const u = this.ubicacion();
      if (!u) return;
      untracked(() => {
        this.peticionZona?.unsubscribe();
        this.zona.set(undefined);
        this.peticionZona = this.tiempoService.obtenerZonaHoraria(u.lat, u.lon).subscribe({
          next: (zona) => this.zona.set(zona),
          // Sin zona se usa la del navegador
          error: () => this.zona.set(undefined)
        });
      });
    });

    inject(DestroyRef).onDestroy(() => {
      clearInterval(this.reloj);
      this.peticionZona?.unsubscribe();
    });
  }

  usarGps(): void {
    this.ubicacionService.usarGps();
  }

  volverAMiUbicacion(): void {
    this.ubicacionService.volverAMiUbicacion();
  }
}
