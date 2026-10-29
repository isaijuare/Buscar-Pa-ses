import { crearPregunta } from './juego-estaciones';
import { eventosDelAnio } from '../../../services/astronomia';
import { CountryApiResponse } from '../../../models/country';

const pais = {} as CountryApiResponse;
const SANTIAGO = { pais, ciudad: 'Santiago', lat: -33.45 };
const MADRID = { pais, ciudad: 'Madrid', lat: 40.42 };

/** Generador que siempre da el día `dia` del año (0 = 1 de enero) */
const enDia = (dia: number) => () => (dia + 0.5) / 365;

describe('crearPregunta (¿Qué estación es?)', () => {
  it('el 15 de julio es verano en el norte e invierno en el sur', () => {
    const dia = 195; // 15 de julio
    expect(crearPregunta(MADRID, 2026, enDia(dia)).correcta).toBe('Verano');
    expect(crearPregunta(SANTIAGO, 2026, enDia(dia)).correcta).toBe('Invierno');
  });

  it('el 15 de enero es invierno en el norte y verano en el sur', () => {
    expect(crearPregunta(MADRID, 2026, enDia(14)).correcta).toBe('Invierno');
    expect(crearPregunta(SANTIAGO, 2026, enDia(14)).correcta).toBe('Verano');
  });

  it('abril es primavera en el norte y otoño en el sur', () => {
    expect(crearPregunta(MADRID, 2026, enDia(105)).correcta).toBe('Primavera');
    expect(crearPregunta(SANTIAGO, 2026, enDia(105)).correcta).toBe('Otoño');
    expect(crearPregunta(SANTIAGO, 2026, enDia(105)).hemisferio).toBe('sur');
  });

  it('la fecha pedida queda entre el inicio y el fin de la estación', () => {
    const p = crearPregunta(SANTIAGO, 2026, enDia(300));
    expect(p.desde.valueOf()).toBeLessThan(p.fecha.valueOf());
    expect(p.fecha.valueOf()).toBeLessThan(p.hasta.valueOf());
  });

  it('nunca pregunta por fechas a menos de 5 días de un cambio de estación', () => {
    const cambios = eventosDelAnio(2026, MADRID.lat).map((e) => e.fecha.valueOf());
    for (let i = 0; i < 300; i++) {
      const { fecha } = crearPregunta(MADRID, 2026);
      const distancia = Math.min(...cambios.map((c) => Math.abs(c - fecha.valueOf())));
      expect(distancia).toBeGreaterThanOrEqual(5 * 86_400_000);
    }
  });
});
