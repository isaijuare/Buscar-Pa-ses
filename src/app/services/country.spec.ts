import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { firstValueFrom } from 'rxjs';
import { CountryService } from './country';
import { CountryApiResponse } from '../models/country';

function pais(comun: string, espanol: string, a2: string, a3: string, population: number): CountryApiResponse {
  return {
    names: { common: comun, official: comun, translations: { spa: { common: espanol, official: espanol } } },
    codes: { alpha_2: a2, alpha_3: a3 },
    flag: { emoji: '', url_svg: '', url_png: '' },
    population
  } as unknown as CountryApiResponse;
}

const PAISES = [
  pais('Japan', 'Japón', 'JP', 'JPN', 125_000_000),
  pais('United States', 'Estados Unidos', 'US', 'USA', 330_000_000),
  pais('Mexico', 'México', 'MX', 'MEX', 128_000_000),
  pais('South Africa', 'Sudáfrica', 'ZA', 'ZAF', 60_000_000),
  pais('Malta', 'Malta', 'MT', 'MLT', 500_000)
];

describe('CountryService', () => {
  let servicio: CountryService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    servicio = TestBed.inject(CountryService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  async function buscar(texto: string): Promise<string[]> {
    const resultado = firstValueFrom(servicio.buscarPaises(texto));
    http.match('/api/paises').forEach((r) => r.flush(PAISES));
    return (await resultado).map((p) => p.code);
  }

  it('encuentra por código de 2 o 3 letras', async () => {
    expect(await buscar('jp')).toEqual(['JP']);
    expect(await buscar('usa')).toEqual(['US']);
  });

  it('ignora tildes y mayúsculas', async () => {
    expect(await buscar('MEXICO')).toEqual(['MX']);
    expect(await buscar('japon')).toEqual(['JP']);
  });

  it('pone primero los que empiezan con el texto y luego los que lo contienen', async () => {
    // "Malta" y "México" empiezan con "m"; "Estados Unidos" no tiene ninguna palabra que empiece con "m"
    expect(await buscar('ma')).toEqual(['MT']);
    // "Sudáfrica" contiene "afri" en medio de la palabra; "South Africa" tiene una palabra que empieza con "afri"
    expect(await buscar('afri')).toEqual(['ZA']);
  });

  it('a igual coincidencia ordena por población', async () => {
    expect(await buscar('m')).toEqual(['MX', 'MT']);
  });

  it('devuelve una lista vacía si no se escribe nada', async () => {
    expect(await buscar('   ')).toEqual([]);
  });

  it('descarga la lista de países una sola vez', async () => {
    await buscar('jp');
    const segunda = firstValueFrom(servicio.buscarPaises('mx'));
    http.expectNone('/api/paises');
    expect((await segunda).map((p) => p.code)).toEqual(['MX']);
  });
});
