import { Component, DestroyRef, computed, effect, inject, signal, untracked } from '@angular/core';
import { Subscription } from 'rxjs';
import { PronosticoApiResponse } from '../../models/cielo';
import { UbicacionService } from '../../services/ubicacion';
import { TiempoService, describirCodigo } from '../../services/tiempo';

type Red = 'facebook' | 'instagram' | 'x' | 'youtube' | 'tiktok';

/** Perfiles de la app en redes sociales: cambia cada URL por la de tu cuenta. */
const REDES: { red: Red; nombre: string; url: string }[] = [
  { red: 'facebook', nombre: 'Facebook', url: 'https://www.facebook.com/' },
  { red: 'instagram', nombre: 'Instagram', url: 'https://www.instagram.com/' },
  { red: 'x', nombre: 'X', url: 'https://x.com/' },
  { red: 'youtube', nombre: 'YouTube', url: 'https://www.youtube.com/' },
  { red: 'tiktok', nombre: 'TikTok', url: 'https://www.tiktok.com/' }
];

@Component({
  selector: 'app-pie',
  standalone: true,
  templateUrl: './pie.html',
  styleUrl: './pie.css'
})
export class PieComponent {
  private ubicacion = inject(UbicacionService);
  private tiempo = inject(TiempoService);

  readonly redes = REDES;
  readonly anio = new Date().getFullYear();

  private datos = signal<PronosticoApiResponse | null>(null);
  private peticion?: Subscription;

  lugar = computed(() => this.ubicacion.actual());

  /** El tiempo de ahora en el lugar elegido (el mismo que usan el panel y el fondo) */
  clima = computed(() => {
    const d = this.datos();
    if (!d) return null;
    const c = d.current;
    return {
      ...describirCodigo(c.weather_code, c.is_day === 1),
      temperatura: Math.round(c.temperature_2m),
      lugar: this.lugar()?.nombre.split(',')[0] ?? ''
    };
  });

  constructor() {
    // La ubicación solo existe en el navegador; el pronóstico queda en caché 10 min (TiempoService)
    effect(() => {
      const l = this.lugar();
      if (!l) return;
      untracked(() => {
        this.peticion?.unsubscribe();
        this.peticion = this.tiempo.obtenerPronostico(l.lat, l.lon).subscribe({
          next: (d) => this.datos.set(d),
          error: () => this.datos.set(null)
        });
      });
    });
    inject(DestroyRef).onDestroy(() => this.peticion?.unsubscribe());
  }
}
