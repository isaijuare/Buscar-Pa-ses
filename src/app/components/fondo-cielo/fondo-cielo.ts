import { Component, DestroyRef, afterNextRender, computed, effect, inject, signal, untracked } from '@angular/core';
import { Subscription } from 'rxjs';
import { DibujoLunaComponent } from '../dibujo-luna/dibujo-luna';
import { UbicacionService } from '../../services/ubicacion';
import { TiempoService } from '../../services/tiempo';
import { TemaService } from '../../services/tema';
import { estadoLuna, posicionLuna, posicionSol } from '../../services/astronomia';
import { formatoHora } from '../../utils/formato';

type Rgb = [number, number, number];

// Colores del cielo (arriba, medio, horizonte) según la altura del Sol en grados
const PALETA: [number, Rgb, Rgb, Rgb][] = [
  [-18, [4, 8, 24], [9, 18, 44], [18, 32, 70]],
  [-12, [6, 14, 38], [15, 30, 72], [36, 56, 104]],
  [-6, [18, 38, 88], [58, 74, 132], [196, 112, 128]],
  [-2, [38, 74, 140], [120, 122, 180], [246, 150, 104]],
  [3, [56, 112, 186], [150, 180, 216], [255, 196, 140]],
  [10, [52, 132, 222], [132, 192, 240], [214, 236, 252]],
  [30, [38, 118, 222], [104, 174, 238], [196, 228, 250]]
];

const mezclar = (a: Rgb, b: Rgb, t: number): Rgb => [0, 1, 2].map((i) => a[i] + (b[i] - a[i]) * t) as Rgb;
const css = (c: Rgb) => `rgb(${c.map((v) => Math.round(v)).join(' ')})`;
const limitar = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

function coloresCielo(alturaSol: number): [Rgb, Rgb, Rgb] {
  if (alturaSol <= PALETA[0][0]) return [PALETA[0][1], PALETA[0][2], PALETA[0][3]];
  for (let i = 1; i < PALETA.length; i++) {
    const [h, ...c] = PALETA[i];
    if (alturaSol <= h) {
      const [h0, ...c0] = PALETA[i - 1];
      const t = (alturaSol - h0) / (h - h0);
      return [mezclar(c0[0], c[0], t), mezclar(c0[1], c[1], t), mezclar(c0[2], c[2], t)];
    }
  }
  const ultimo = PALETA[PALETA.length - 1];
  return [ultimo[1], ultimo[2], ultimo[3]];
}

// Estrellas fijas (siempre las mismas posiciones): generador pseudoaleatorio con semilla
function crearEstrellas(cantidad: number) {
  let semilla = 7;
  const azar = () => ((semilla = (semilla * 16807) % 2147483647) - 1) / 2147483646;
  return Array.from({ length: cantidad }, (_, i) => ({
    id: i,
    x: azar() * 100,
    // Más estrellas arriba que cerca del horizonte
    y: Math.pow(azar(), 1.6) * 78,
    tam: azar() < 0.12 ? 2.6 : azar() < 0.5 ? 1.8 : 1.2,
    brillo: 0.45 + azar() * 0.55,
    retraso: -azar() * 6,
    duracion: 2.5 + azar() * 4
  }));
}

@Component({
  selector: 'app-fondo-cielo',
  standalone: true,
  imports: [DibujoLunaComponent],
  templateUrl: './fondo-cielo.html',
  styleUrl: './fondo-cielo.css'
})
export class FondoCieloComponent {
  private ubicacionService = inject(UbicacionService);
  private tiempoService = inject(TiempoService);
  private temaService = inject(TemaService);

  /** El fondo solo se dibuja en el navegador (en el servidor no se sabe la hora ni el lugar) */
  montado = signal(false);
  ahora = signal(new Date());
  nubosidad = signal(0);
  lluvia = signal(false);

  readonly estrellas = crearEstrellas(140);

  lugar = computed(() => this.ubicacionService.fondo() ?? this.ubicacionService.actual());

  sol = computed(() => {
    const l = this.lugar();
    if (l) return posicionSol(this.ahora(), l.lat, l.lon);
    // Mientras se resuelve la ubicación: estimación con la hora local
    const h = this.ahora().getHours() + this.ahora().getMinutes() / 60;
    return { altitud: 65 * Math.sin((Math.PI * (h - 6)) / 12), azimut: 90 + ((h - 6) / 12) * 180 };
  });

  luna = computed(() => {
    const l = this.lugar();
    if (!l) return null;
    const pos = posicionLuna(this.ahora(), l.lat, l.lon);
    const estado = estadoLuna(this.ahora(), l.lat, l.lon, 1);
    return { ...pos, iluminacion: estado.iluminacion, creciente: estado.creciente, sur: l.lat < 0 };
  });

  /** Oscuridad del cielo: 0 de día, 1 en plena noche */
  oscuridad = computed(() => limitar((-this.sol().altitud - 2) / 14, 0, 1));

  colores = computed(() => {
    let [arriba, medio, horizonte] = coloresCielo(this.sol().altitud);
    // Cielo nublado: los colores se vuelven grises
    const gris = this.nubosidad() / 100 * (this.lluvia() ? 0.75 : 0.55);
    if (gris > 0) {
      const tonoGris: Rgb = this.oscuridad() > 0.5 ? [30, 36, 50] : [140, 150, 164];
      [arriba, medio, horizonte] = [arriba, medio, horizonte].map((c) => mezclar(c, tonoGris, gris)) as [Rgb, Rgb, Rgb];
    }
    return { arriba: css(arriba), medio: css(medio), horizonte: css(horizonte), montana: css(mezclar(horizonte, [10, 16, 32], 0.55)) };
  });

  opacidadEstrellas = computed(() => this.oscuridad() * (1 - (this.nubosidad() / 100) * 0.85));

  // Resplandor del amanecer/atardecer: máximo con el Sol cerca del horizonte
  resplandor = computed(() => {
    const h = this.sol().altitud;
    const fuerza = limitar(1 - Math.abs(h - 1) / 9, 0, 1) * (1 - this.nubosidad() / 140);
    const pos = this.posicionEnPantalla(this.sol().azimut, Math.max(0, h));
    return { opacidad: fuerza, x: pos.x, y: pos.y };
  });

  posSol = computed(() => {
    const s = this.sol();
    if (s.altitud < -3) return null;
    // El Sol se ve más anaranjado cerca del horizonte
    const calido = limitar(1 - s.altitud / 20, 0, 1);
    return { ...this.posicionEnPantalla(s.azimut, s.altitud), calido, opacidad: 1 - (this.nubosidad() / 100) * 0.6 };
  });

  posLuna = computed(() => {
    const l = this.luna();
    if (!l || l.altitud < -2) return null;
    // De día la Luna se ve tenue; de noche, brillante
    const opacidad = (0.35 + this.oscuridad() * 0.65) * (1 - (this.nubosidad() / 100) * 0.5);
    // La parte no iluminada deja ver el cielo: de día no se ve; de noche, apenas más oscura
    const sombra = `rgba(4 8 20 / ${(this.oscuridad() * 0.35).toFixed(2)})`;
    return { ...this.posicionEnPantalla(l.azimut, l.altitud), ...l, opacidad, sombra };
  });

  nubes = computed(() => {
    const cobertura = this.nubosidad();
    // Pocas nubes sueltas; con el cielo cubierto se suma el velo gris uniforme
    const cantidad = cobertura < 8 ? 0 : Math.round(1 + (cobertura / 100) * 5);
    const noche = this.oscuridad();
    const color = this.lluvia()
      ? `rgba(${noche > 0.5 ? '70 78 96' : '170 176 188'} / 0.85)`
      : noche > 0.5
        ? 'rgba(120 136 176 / 0.18)'
        : 'rgba(255 255 255 / 0.55)';
    return Array.from({ length: cantidad }, (_, i) => ({
      id: i,
      top: 6 + ((i * 37) % 50),
      escala: 0.45 + ((i * 53) % 10) / 16,
      duracion: 70 + ((i * 29) % 60),
      retraso: -((i * 47) % 120),
      color
    }));
  });

  veloNublado = computed(() => limitar((this.nubosidad() - 50) / 60, 0, 0.5));

  etiqueta = computed(() => {
    const l = this.lugar();
    if (!l) return null;
    const momento =
      this.sol().altitud > 6 ? 'De día' : this.sol().altitud > -6 ? (this.sol().azimut < 180 ? 'Amanecer' : 'Atardecer') : 'De noche';
    return `${momento} en ${l.nombre} · ${formatoHora(this.ahora(), this.zona())}`;
  });

  /** Zona horaria del lugar, para mostrar su hora local en la etiqueta */
  private zona = signal<string | undefined>(undefined);
  private peticion?: Subscription;
  private peticionZona?: Subscription;

  constructor() {
    afterNextRender(() => {
      this.ahora.set(new Date());
      this.montado.set(true);
      this.reloj = setInterval(() => this.ahora.set(new Date()), 60000);
    });

    // Avisa al tema automático si es de noche
    effect(() => {
      const noche = this.sol().altitud < -4;
      untracked(() => this.temaService.esDeNoche.set(noche));
    });

    // Nubosidad real del lugar
    effect(() => {
      const l = this.lugar();
      if (!l) return;
      untracked(() => {
        this.peticion?.unsubscribe();
        this.peticion = this.tiempoService.obtenerPronostico(l.lat, l.lon).subscribe({
          next: (r) => {
            const codigo = r.current.weather_code;
            this.nubosidad.set(r.current.cloud_cover ?? 0);
            this.lluvia.set((codigo >= 51 && codigo <= 67) || (codigo >= 80 && codigo <= 82) || codigo >= 95);
          },
          error: () => this.nubosidad.set(0)
        });
        this.peticionZona?.unsubscribe();
        this.zona.set(undefined);
        this.peticionZona = this.tiempoService.obtenerZonaHoraria(l.lat, l.lon).subscribe({
          next: (zona) => this.zona.set(zona),
          error: () => this.zona.set(undefined)
        });
      });
    });

    inject(DestroyRef).onDestroy(() => {
      clearInterval(this.reloj);
      this.peticion?.unsubscribe();
      this.peticionZona?.unsubscribe();
    });
  }

  private reloj?: ReturnType<typeof setInterval>;

  /**
   * Horizontal: la pantalla mira hacia el ecuador, al sur en el hemisferio norte (el Sol sale por la
   * izquierda) y al norte en el hemisferio sur (sale por la derecha), como se ve desde allí.
   * Vertical: el Sol y la Luna se dibujan en la franja superior, que es la parte del cielo que no
   * tapan las tarjetas; cuanto más altos están en el cielo real, más arriba aparecen.
   */
  private posicionEnPantalla(azimut: number, altitud: number): { x: number; y: number } {
    const haciaEcuador = (this.lugar()?.lat ?? 1) >= 0 ? 180 : 0;
    // Grados a la derecha (+) o a la izquierda (−) de la dirección en que se mira
    const desvio = ((((azimut - haciaEcuador) % 360) + 540) % 360) - 180;
    // y en píxeles: 34 px en el cenit, 150 px en el horizonte
    const y = 150 - (limitar(altitud, 0, 90) / 90) * 116;
    return { x: limitar(50 + (desvio / 180) * 100, 5, 95), y };
  }
}
