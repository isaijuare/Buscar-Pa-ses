import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { MineralesComponent, densidadNumerica, textoDureza } from './minerales';
import { ESCALA_MOHS, MINERALES } from '../../models/minerales';

describe('Datos de los minerales', () => {
  it('cada mineral tiene un id único y una dureza válida en la escala de Mohs', () => {
    expect(new Set(MINERALES.map((m) => m.id)).size).toBe(MINERALES.length);
    for (const m of MINERALES) {
      const [min, max] = m.dureza;
      expect(min).toBeGreaterThanOrEqual(1);
      expect(max).toBeLessThanOrEqual(10);
      expect(min).toBeLessThanOrEqual(max);
    }
  });

  it('todos tienen formación, origen, países y un dato curioso', () => {
    for (const m of MINERALES) {
      expect(m.formacion.length).toBeGreaterThan(40);
      expect(m.origen.length).toBeGreaterThan(40);
      expect(m.dato.length).toBeGreaterThan(30);
      expect(m.paises.length).toBeGreaterThan(0);
      expect(m.paises.every((p) => /^[A-Z]{2}$/.test(p.codigo))).toBe(true);
    }
  });

  it('los minerales de referencia de Mohs están en su escalón', () => {
    for (const nombre of ['Yeso', 'Calcita', 'Fluorita', 'Cuarzo', 'Corindón', 'Diamante']) {
      const m = MINERALES.find((x) => x.nombre === nombre)!;
      expect(ESCALA_MOHS[m.dureza[0] - 1]).toBe(nombre);
    }
  });
});

describe('Formato', () => {
  it('muestra la dureza como número o como rango', () => {
    expect(textoDureza([7, 7])).toBe('7');
    expect(textoDureza([6, 6.5])).toBe('6 a 6,5');
  });

  it('toma el primer número de la densidad', () => {
    expect(densidadNumerica('19,3')).toBe(19.3);
    expect(densidadNumerica('2,6 a 2,9')).toBe(2.6);
  });
});

describe('MineralesComponent', () => {
  let fixture: ComponentFixture<MineralesComponent>;
  let pagina: MineralesComponent;
  let http: HttpTestingController;
  const nombres = () => pagina.visibles().map((m) => m.nombre);

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MineralesComponent],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])]
    }).compileComponents();
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(MineralesComponent);
    pagina = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('pide todas las fotos a Wikipedia en una sola consulta y las asigna aunque cambie el título', async () => {
    const peticiones = http.match((r) => r.url.startsWith('https://es.wikipedia.org/w/api.php'));
    expect(peticiones).toHaveLength(1);
    // El yeso toma la foto del artículo "Yeso"
    expect(peticiones[0].request.url).toContain(encodeURIComponent('Yeso') + '%7C');

    peticiones[0].flush({
      query: {
        normalized: [{ from: 'Corindón', to: 'Corindón' }],
        redirects: [{ from: 'Halita', to: 'Sal gema' }],
        pages: [
          { title: 'Cuarzo', thumbnail: { source: 'https://foto/cuarzo.jpg' } },
          { title: 'Sal gema', thumbnail: { source: 'https://foto/halita.jpg' } },
          { title: 'Yeso', thumbnail: { source: 'https://foto/yeso.jpg' } },
          { title: 'Oro' }
        ]
      }
    });
    await fixture.whenStable();

    expect(pagina.fotos()).toEqual({
      cuarzo: 'https://foto/cuarzo.jpg',
      halita: 'https://foto/halita.jpg',
      yeso: 'https://foto/yeso.jpg'
    });
    // Sin foto se dibuja la gema
    const tarjetaOro = [...(fixture.nativeElement as HTMLElement).querySelectorAll('.tarjeta')].find((t) =>
      t.textContent?.includes('Oro')
    )!;
    expect(tarjetaOro.querySelector('.gema')).not.toBeNull();
  });

  it('filtra por tipo y por texto, sin importar las tildes', () => {
    pagina.categoria.set('Metálico');
    expect(nombres()).toEqual(['Magnetita', 'Oro', 'Pirita']);

    pagina.categoria.set('Todas');
    pagina.busqueda.set('corindon');
    expect(nombres()).toEqual(['Corindón']);

    pagina.busqueda.set('NaCl');
    expect(nombres()).toEqual(['Halita']);
  });

  it('ordena por dureza y por densidad, de mayor a menor', () => {
    pagina.orden.set('dureza');
    expect(nombres().slice(0, 3)).toEqual(['Diamante', 'Corindón', 'Cuarzo']);
    expect(nombres().at(-1)).toBe('Grafito');

    pagina.orden.set('densidad');
    expect(nombres()[0]).toBe('Oro');
  });

  it('ubica cada mineral en los escalones de Mohs que toca su dureza', () => {
    const escalon = (n: number) => pagina.enEscala()[n - 1].map((m) => m.nombre);
    expect(escalon(10)).toEqual(['Diamante']);
    expect(escalon(7)).toContain('Cuarzo');
    // La pirita (6 a 6,5) está en el 6, no en el 7
    expect(escalon(6)).toContain('Pirita');
    expect(escalon(7)).not.toContain('Pirita');
  });

  it('abre la ficha completa con propiedades, origen y enlaces a los países', async () => {
    // jsdom no implementa los diálogos modales: se simulan abrir y cerrar
    HTMLDialogElement.prototype.showModal ??= function (this: HTMLDialogElement) {
      this.setAttribute('open', '');
    };
    HTMLDialogElement.prototype.close ??= function (this: HTMLDialogElement) {
      this.removeAttribute('open');
    };

    pagina.abrir(MINERALES.find((m) => m.id === 'turquesa')!);
    await fixture.whenStable();
    const ficha = (fixture.nativeElement as HTMLElement).querySelector('dialog.ficha')!;

    expect(ficha.querySelector('h2')?.textContent).toBe('Turquesa');
    expect(ficha.textContent).toContain('Triclínico');
    expect(ficha.textContent).toContain('Irán');
    expect([...ficha.querySelectorAll('.paises a')].map((a) => a.getAttribute('href'))).toContain('/pais/ir');

    pagina.cerrar();
    await fixture.whenStable();
    expect(ficha.querySelector('h2')).toBeNull();
  });
});
