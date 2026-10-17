import { Component, DestroyRef, computed, effect, inject, input, signal, untracked } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { CountryApiResponse } from '../../models/country';
import { TiempoService } from '../../services/tiempo';
import { Feriado, TiposDeCambio, ViajeService, convertir } from '../../services/viaje';
import { desfaseMinutos, textoDesfase } from '../../utils/zona-horaria';
import { formatoFechaLarga, formatoNumero, tiempoRelativo } from '../../utils/formato';

@Component({
  selector: 'app-datos-viaje',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './datos-viaje.html',
  styleUrl: './datos-viaje.css'
})
export class DatosViajeComponent {
  private viajeService = inject(ViajeService);
  private tiempoService = inject(TiempoService);

  pais = input.required<CountryApiResponse>();
  lat = input.required<number>();
  lon = input.required<number>();

  ahora = signal(new Date());
  zona = signal<string | null>(null);
  cambio = signal<TiposDeCambio | null>(null);
  errorCambio = signal(false);
  feriados = signal<Feriado[] | null>(null);
  errorFeriados = signal(false);

  // Conversor
  monto = signal(100);
  origen = signal('USD');
  destino = signal('');

  private suscripciones: Subscription[] = [];

  // ---------- Hora local ----------
  horaLocal = computed(() => {
    const zona = this.zona();
    if (!zona) return null;
    const ahora = this.ahora();
    const delLugar = desfaseMinutos(ahora, zona);
    const diferencia = delLugar - desfaseMinutos(ahora);
    const horas = Math.abs(diferencia) / 60;
    const textoHoras = Number.isInteger(horas) ? String(horas) : horas.toFixed(1);
    return {
      hora: new Intl.DateTimeFormat('es', { timeZone: zona, hour: '2-digit', minute: '2-digit' }).format(ahora),
      fecha: new Intl.DateTimeFormat('es', { timeZone: zona, weekday: 'long', day: 'numeric', month: 'long' }).format(ahora),
      desfase: textoDesfase(delLugar),
      zona: zona.replace(/_/g, ' '),
      diferencia:
        diferencia === 0
          ? 'Misma hora que tú'
          : `${textoHoras} h ${diferencia > 0 ? 'más' : 'menos'} que tu hora`
    };
  });

  // ---------- Moneda ----------
  monedasPais = computed(() => this.pais().currencies ?? []);
  codigosDisponibles = computed(() => Object.keys(this.cambio()?.porDolar ?? {}).sort());

  conversion = computed(() => {
    const cambio = this.cambio();
    const destino = this.destino();
    if (!cambio || !destino) return null;
    const resultado = convertir(this.monto() || 0, this.origen(), destino, cambio);
    const inverso = convertir(1, destino, this.origen(), cambio);
    if (resultado === null || inverso === null) return null;
    return {
      resultado: formatoNumero(resultado, 2),
      inverso: formatoNumero(inverso, inverso < 0.01 ? 6 : 4),
      actualizado: formatoFechaLarga(cambio.actualizado)
    };
  });

  monedaSinDatos = computed(() => {
    const cambio = this.cambio();
    return !!cambio && !!this.destino() && !cambio.porDolar[this.destino()];
  });

  // ---------- Feriados ----------
  proximosFeriados = computed(() => {
    const lista = this.feriados();
    if (!lista) return null;
    const ahora = this.ahora();
    return lista.slice(0, 5).map((f) => {
      // La fecha llega como "2026-11-03": se interpreta como día local, sin hora
      const [a, m, d] = f.fecha.split('-').map(Number);
      const fecha = new Date(a, m - 1, d, 12);
      return {
        clave: f.fecha + f.nombre,
        fecha: formatoFechaLarga(fecha),
        nombre: f.nombreLocal,
        traduccion: f.nombre !== f.nombreLocal ? f.nombre : null,
        falta: tiempoRelativo(fecha, ahora)
      };
    });
  });

  // ---------- Datos prácticos ----------
  practicos = computed(() => {
    const p = this.pais();
    return [
      { etiqueta: 'Prefijo telefónico', valor: p.calling_codes?.length ? p.calling_codes.map((c) => '+' + c).join(', ') : '—' },
      { etiqueta: 'Dominio de internet', valor: p.tlds?.join(', ') || '—' },
      {
        etiqueta: 'Se conduce por la',
        valor: p.driving_side === 'left' ? 'izquierda' : p.driving_side === 'right' ? 'derecha' : '—'
      },
      { etiqueta: 'Salida al mar', valor: p.landlocked === undefined ? '—' : p.landlocked ? 'No' : 'Sí' }
    ];
  });

  constructor() {
    const reloj = setInterval(() => this.ahora.set(new Date()), 30000);

    effect(() => {
      const lat = this.lat();
      const lon = this.lon();
      const codigo = this.pais().codes.alpha_2;
      const monedas = this.monedasPais();
      untracked(() => this.cargar(lat, lon, codigo, monedas.map((m) => m.code)));
    });

    inject(DestroyRef).onDestroy(() => {
      clearInterval(reloj);
      this.suscripciones.forEach((s) => s.unsubscribe());
    });
  }

  private cargar(lat: number, lon: number, codigo: string, monedas: string[]): void {
    this.suscripciones.forEach((s) => s.unsubscribe());
    this.zona.set(null);
    this.feriados.set(null);
    this.errorFeriados.set(false);
    this.destino.set(monedas[0] ?? '');
    // Si el país usa dólares, se compara contra el euro
    this.origen.set(monedas[0] === 'USD' ? 'EUR' : 'USD');

    this.suscripciones = [
      this.tiempoService.obtenerZonaHoraria(lat, lon).subscribe((zona) => this.zona.set(zona)),
      this.viajeService.tiposDeCambio().subscribe({
        next: (c) => this.cambio.set(c),
        error: () => this.errorCambio.set(true)
      }),
      this.viajeService.proximosFeriados(codigo).subscribe({
        next: (f) => this.feriados.set(f),
        error: () => this.errorFeriados.set(true)
      })
    ];
  }
}
