import { Component, computed, input } from '@angular/core';
import { DibujoLunaComponent } from '../dibujo-luna/dibujo-luna';
import { Ubicacion } from '../../models/cielo';
import { NOMBRE_FASE, TipoFase, estadoLuna, horarioLuna } from '../../services/astronomia';
import { formatoFechaCorta, formatoHora, tiempoRelativo } from '../../utils/formato';

// Cómo se dibuja cada fase principal en la lista de próximas fases
const DIBUJO_FASE: Record<TipoFase, { iluminacion: number; creciente: boolean }> = {
  nueva: { iluminacion: 0, creciente: true },
  'cuarto-creciente': { iluminacion: 0.5, creciente: true },
  llena: { iluminacion: 1, creciente: true },
  'cuarto-menguante': { iluminacion: 0.5, creciente: false }
};

@Component({
  selector: 'app-fases-luna',
  standalone: true,
  imports: [DibujoLunaComponent],
  templateUrl: './fases-luna.html',
  styleUrl: './fases-luna.css'
})
export class FasesLunaComponent {
  ubicacion = input.required<Ubicacion>();
  ahora = input.required<Date>();

  hemisferioSur = computed(() => this.ubicacion().lat < 0);

  luna = computed(() => {
    const { lat, lon } = this.ubicacion();
    return estadoLuna(this.ahora(), lat, lon);
  });

  horario = computed(() => {
    const { lat, lon } = this.ubicacion();
    const h = horarioLuna(this.ahora(), lat, lon);
    const texto = (fecha?: Date) => (fecha ? formatoHora(fecha) : '—');
    return {
      salida: h.siempreArriba ? 'Visible todo el día' : texto(h.salida),
      puesta: h.siempreAbajo ? 'No sale hoy' : texto(h.puesta)
    };
  });

  proximas = computed(() =>
    this.luna().proximas.map((fase) => ({
      ...DIBUJO_FASE[fase.tipo],
      nombre: NOMBRE_FASE[fase.tipo],
      fecha: formatoFechaCorta(fase.fecha),
      hora: formatoHora(fase.fecha),
      falta: tiempoRelativo(fase.fecha, this.ahora())
    }))
  );
}
