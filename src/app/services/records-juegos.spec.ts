import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { RecordsJuegosService, esMejor } from './records-juegos';
import { AuthService } from './auth';
import { RecordsQuiz } from '../models/usuario';

const SIN_RANKING: RecordsQuiz['ranking'] = { bandera: [], capital: [], estaciones: [], memoria: [] };

describe('esMejor', () => {
  it('en Memoria gana el que usa menos movimientos', () => {
    expect(esMejor('memoria', 10, 12)).toBe(true);
    expect(esMejor('memoria', 14, 12)).toBe(false);
  });

  it('en los juegos de aciertos gana el mayor', () => {
    expect(esMejor('estaciones', 8, 7)).toBe(true);
    expect(esMejor('estaciones', 7, 7)).toBe(false);
  });

  it('cualquier puntaje es récord si todavía no había uno', () => {
    expect(esMejor('memoria', 40, undefined)).toBe(true);
    expect(esMejor('estaciones', 0, null)).toBe(true);
  });
});

describe('RecordsJuegosService', () => {
  let records: RecordsJuegosService;
  let http: HttpTestingController;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    records = TestBed.inject(RecordsJuegosService);
    http = TestBed.inject(HttpTestingController);
    TestBed.tick();
    http.expectOne('/api/usuario/records').flush({ propios: null, ranking: SIN_RANKING });
  });

  afterEach(() => http.verify());

  it('sin sesión guarda el récord en el navegador y no llama al servidor', () => {
    expect(records.registrar('memoria', 20)).toBe(true);
    expect(records.registrar('memoria', 25)).toBe(false);
    expect(records.registrar('memoria', 15)).toBe(true);
    expect(JSON.parse(localStorage.getItem('buscador-paises:records-juegos')!)).toEqual({ memoria: 15 });
    http.expectNone('/api/usuario/records');
  });

  it('al iniciar sesión junta los récords y sube los que mejoran los de la cuenta', () => {
    records.registrar('memoria', 12);
    records.registrar('estaciones', 6);

    TestBed.inject(AuthService).usuario.set({ id: 'u1', nombre: 'Ana', email: 'ana@correo.com' });
    TestBed.tick();
    http.expectOne('/api/usuario/records').flush({
      propios: { bandera: 0, capital: 0, estaciones: 9, memoria: 20 },
      ranking: SIN_RANKING
    });

    // Se queda con lo mejor de cada lado
    expect(records.propios()).toEqual({ memoria: 12, estaciones: 9 });
    // Solo se sube el de Memoria, que mejora el de la cuenta
    const subidas = http.match('/api/usuario/records');
    expect(subidas.map((r) => r.request.body)).toEqual([{ modo: 'memoria', puntaje: 12 }]);
    subidas.forEach((r) => r.flush({ propios: null, ranking: SIN_RANKING }));
  });
});
