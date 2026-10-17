import { Component, computed, input } from '@angular/core';
import { Ubicacion } from '../../models/cielo';
import {
  NOMBRE_EVENTO,
  NombreEstacion,
  alturaSolMediodia,
  duracionDiaMinutos,
  estadoEstacion,
  eventosDelAnio
} from '../../services/astronomia';
import { formatoDuracion, formatoFechaLarga, formatoHora, tiempoRelativo } from '../../utils/formato';

const COLOR_ESTACION: Record<NombreEstacion, string> = {
  Primavera: '#7ed99a',
  Verano: '#ffd166',
  Otoño: '#ff9f5a',
  Invierno: '#8fd3ff'
};

const ICONO_ESTACION: Record<NombreEstacion, string> = {
  Primavera: '🌱',
  Verano: '☀️',
  Otoño: '🍂',
  Invierno: '❄️'
};

const MESES = ['E', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'];
const RADIO_RUEDA = 40;

@Component({
  selector: 'app-estaciones',
  standalone: true,
  templateUrl: './estaciones.html',
  styleUrl: './estaciones.css'
})
export class EstacionesComponent {
  ubicacion = input.required<Ubicacion>();
  ahora = input.required<Date>();
  /** Zona horaria IANA del lugar; sin ella se usa la del navegador */
  zona = input<string | undefined>(undefined);

  readonly radio = RADIO_RUEDA;

  estado = computed(() => {
    const e = estadoEstacion(this.ahora(), this.ubicacion().lat);
    return {
      ...e,
      icono: ICONO_ESTACION[e.actual.estacion],
      color: COLOR_ESTACION[e.actual.estacion],
      porcentaje: Math.round(e.progreso * 100),
      dias: Math.ceil(e.diasRestantes),
      desde: formatoFechaLarga(e.actual.fecha, this.zona())
    };
  });

  // Los próximos 4 equinoccios/solsticios a partir de hoy
  proximosEventos = computed(() => {
    const ahora = this.ahora();
    const lat = this.ubicacion().lat;
    const anio = ahora.getFullYear();
    return [anio, anio + 1]
      .flatMap((a) => eventosDelAnio(a, lat))
      .filter((e) => e.fecha > ahora)
      .slice(0, 4)
      .map((e) => ({
        nombre: NOMBRE_EVENTO[e.tipo],
        esEquinoccio: e.tipo.startsWith('equinoccio'),
        estacion: e.estacion,
        icono: ICONO_ESTACION[e.estacion],
        color: COLOR_ESTACION[e.estacion],
        fecha: formatoFechaLarga(e.fecha, this.zona()),
        hora: formatoHora(e.fecha, this.zona()),
        falta: tiempoRelativo(e.fecha, ahora)
      }));
  });

  // Rueda del año: un arco por estación desde el 1 de enero hasta el 31 de diciembre
  rueda = computed(() => {
    const ahora = this.ahora();
    const lat = this.ubicacion().lat;
    const anio = ahora.getFullYear();
    const inicio = new Date(anio, 0, 1).valueOf();
    const fin = new Date(anio + 1, 0, 1).valueOf();
    const enPorcentaje = (t: number) => ((t - inicio) / (fin - inicio)) * 100;

    const eventos = eventosDelAnio(anio, lat);
    // Del 1 de enero al equinoccio de marzo sigue la estación del solsticio de diciembre
    const tramos = [
      { estacion: eventos[3].estacion, desde: 0, hasta: enPorcentaje(eventos[0].fecha.valueOf()) },
      ...eventos.map((e, i) => ({
        estacion: e.estacion,
        desde: enPorcentaje(e.fecha.valueOf()),
        hasta: i < 3 ? enPorcentaje(eventos[i + 1].fecha.valueOf()) : 100
      }))
    ];

    const punto = (porcentaje: number, radio: number) => {
      const angulo = (porcentaje / 100) * 2 * Math.PI - Math.PI / 2;
      return { x: radio * Math.cos(angulo), y: radio * Math.sin(angulo) };
    };

    return {
      arcos: tramos.map((t) => ({
        color: COLOR_ESTACION[t.estacion],
        // pathLength=100 en el círculo: el trazo se mide en porcentaje del año
        dash: `${Math.max(0, t.hasta - t.desde - 0.6)} 100`,
        offset: -t.desde
      })),
      hoy: punto(enPorcentaje(ahora.valueOf()), RADIO_RUEDA),
      meses: MESES.map((letra, i) => ({
        letra,
        ...punto(enPorcentaje(new Date(anio, i, 15).valueOf()), RADIO_RUEDA + 13)
      }))
    };
  });

  sol = computed(() => {
    const ahora = this.ahora();
    const { lat, lon } = this.ubicacion();
    const hoy = duracionDiaMinutos(ahora, lat, lon);
    const manana = duracionDiaMinutos(new Date(ahora.valueOf() + 86400000), lat, lon);
    const diferencia = Math.round(manana - hoy);
    return {
      duracion: formatoDuracion(hoy),
      tendencia:
        diferencia === 0 ? 'igual que mañana' : `mañana ${diferencia > 0 ? '+' : '−'}${Math.abs(diferencia)} min`,
      altura: Math.round(alturaSolMediodia(ahora, lat))
    };
  });
}
