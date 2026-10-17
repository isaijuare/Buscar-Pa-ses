import { Component, computed, input } from '@angular/core';
import { Ubicacion } from '../../models/cielo';
import { posicionSol, tiemposSol } from '../../services/astronomia';
import { formatoHora } from '../../utils/formato';

@Component({
  selector: 'app-horas-sol',
  standalone: true,
  templateUrl: './horas-sol.html',
  styleUrl: './horas-sol.css'
})
export class HorasSolComponent {
  ubicacion = input.required<Ubicacion>();
  ahora = input.required<Date>();
  /** Zona horaria IANA del lugar; sin ella se usa la del navegador */
  zona = input<string | undefined>(undefined);

  datos = computed(() => {
    const { lat, lon } = this.ubicacion();
    const ahora = this.ahora();
    const zona = this.zona();
    const t = tiemposSol(ahora, lat, lon, zona);
    const hora = (d?: Date) => (d ? formatoHora(d, zona) : '—');
    const tramo = (r?: [Date, Date]) => (r ? `${hora(r[0])} – ${hora(r[1])}` : 'No ocurre hoy');
    const sol = posicionSol(ahora, lat, lon);

    // Si ahora mismo es hora dorada o azul, se destaca
    const dentro = (r?: [Date, Date]) => !!r && ahora >= r[0] && ahora <= r[1];
    let momento: string | null = null;
    if (dentro(t.doradaManana) || dentro(t.doradaTarde)) momento = '✨ Ahora mismo es hora dorada';
    else if (dentro(t.azulManana) || dentro(t.azulTarde)) momento = '💙 Ahora mismo es hora azul';

    return {
      amanecer: hora(t.amanecer),
      atardecer: hora(t.atardecer),
      mediodia: hora(t.mediodia),
      doradaManana: tramo(t.doradaManana),
      doradaTarde: tramo(t.doradaTarde),
      azulManana: tramo(t.azulManana),
      azulTarde: tramo(t.azulTarde),
      alturaSol: Math.round(sol.altitud),
      momento
    };
  });
}
