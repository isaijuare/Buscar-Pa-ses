import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { Carta, JuegoMemoriaComponent, crearMazo } from './juego-memoria';
import { RecordsJuegosService } from '../../../services/records-juegos';

describe('Memoria de las estaciones', () => {
  it('el mazo tiene 16 cartas: cada símbolo dos veces y dos símbolos por estación', () => {
    const mazo = crearMazo();
    expect(mazo).toHaveLength(16);
    const contar = (clave: (c: Carta) => string) =>
      mazo.reduce<Record<string, number>>((cuenta, c) => ({ ...cuenta, [clave(c)]: (cuenta[clave(c)] ?? 0) + 1 }), {});

    expect(Object.values(contar((c) => c.icono)).every((n) => n === 2)).toBe(true);
    expect(contar((c) => c.estacion)).toEqual({ Primavera: 4, Verano: 4, Otoño: 4, Invierno: 4 });
  });

  describe('JuegoMemoriaComponent', () => {
    let fixture: ComponentFixture<JuegoMemoriaComponent>;
    let juego: JuegoMemoriaComponent;

    beforeEach(async () => {
      localStorage.clear();
      vi.useFakeTimers();
      await TestBed.configureTestingModule({
        imports: [JuegoMemoriaComponent],
        providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])]
      }).compileComponents();
      fixture = TestBed.createComponent(JuegoMemoriaComponent);
      juego = fixture.componentInstance;
    });

    afterEach(() => vi.useRealTimers());

    const pareja = (icono: string) => juego.cartas().filter((c) => c.icono === icono);
    const distintas = (): [Carta, Carta] => {
      const [a] = juego.cartas().filter((c) => c.boca === 'abajo');
      const b = juego.cartas().find((c) => c.boca === 'abajo' && c.icono !== a.icono)!;
      return [a, b];
    };
    const estado = (id: number) => juego.cartas().find((c) => c.id === id)!.boca;

    it('dos cartas iguales quedan encontradas y cuentan un movimiento', () => {
      const [a, b] = pareja('🌸');
      juego.voltear(a);
      juego.voltear(b);
      expect([estado(a.id), estado(b.id)]).toEqual(['encontrada', 'encontrada']);
      expect(juego.movimientos()).toBe(1);
      expect(juego.ultimoPar()?.estacion).toBe('Primavera');
    });

    it('dos cartas distintas se dan vuelta otra vez después de un momento', () => {
      const [a, b] = distintas();
      juego.voltear(a);
      juego.voltear(b);
      expect([estado(a.id), estado(b.id)]).toEqual(['arriba', 'arriba']);

      // Mientras se muestran, no se puede voltear una tercera
      const tercera = juego.cartas().find((c) => c.boca === 'abajo')!;
      juego.voltear(tercera);
      expect(estado(tercera.id)).toBe('abajo');

      vi.advanceTimersByTime(1000);
      expect([estado(a.id), estado(b.id)]).toEqual(['abajo', 'abajo']);
      expect(juego.movimientos()).toBe(1);
    });

    it('al encontrar todos los pares termina y guarda el récord de movimientos', () => {
      for (const icono of new Set(juego.cartas().map((c) => c.icono))) {
        const [a, b] = pareja(icono);
        juego.voltear(a);
        juego.voltear(b);
      }
      expect(juego.terminado()).toBe(true);
      expect(juego.movimientos()).toBe(8);
      expect(juego.nuevoRecord()).toBe(true);
      expect(TestBed.inject(RecordsJuegosService).propios().memoria).toBe(8);
    });

    it('el reloj corre desde la primera carta y se detiene al reiniciar', () => {
      juego.voltear(juego.cartas()[0]);
      vi.advanceTimersByTime(3000);
      expect(juego.tiempo()).toBe('0:03');
      juego.reiniciar();
      vi.advanceTimersByTime(3000);
      expect(juego.tiempo()).toBe('0:00');
    });
  });
});
