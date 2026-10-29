import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { PieComponent } from './pie';
import { UbicacionService } from '../../services/ubicacion';

describe('PieComponent', () => {
  let fixture: ComponentFixture<PieComponent>;
  let http: HttpTestingController;
  let raiz: HTMLElement;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PieComponent],
      providers: [provideHttpClient(), provideHttpClientTesting()]
    }).compileComponents();

    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(PieComponent);
    raiz = fixture.nativeElement as HTMLElement;
    await fixture.whenStable();
  });

  it('tiene las redes sociales y se abren en otra pestaña de forma segura', () => {
    const enlaces = [...raiz.querySelectorAll<HTMLAnchorElement>('.redes a')];
    expect(enlaces.map((a) => a.title)).toEqual(['Facebook', 'Instagram', 'X', 'YouTube', 'TikTok']);
    for (const a of enlaces) {
      expect(a.target).toBe('_blank');
      expect(a.rel).toContain('noopener');
      expect(a.getAttribute('aria-label')).toContain(a.title);
    }
  });

  it('mientras no hay ubicación muestra un mensaje de espera', () => {
    expect(raiz.querySelector('.estado')?.textContent).toContain('Mirando el cielo');
    expect(raiz.querySelector('.temperatura')).toBeNull();
  });

  it('muestra el clima del lugar actual', async () => {
    TestBed.inject(UbicacionService).actual.set({ lat: 15.5, lon: -88.03, nombre: 'San Pedro Sula, Honduras', fuente: 'ip' });
    await fixture.whenStable();

    http
      .expectOne((r) => r.url.startsWith('https://api.open-meteo.com/v1/forecast'))
      .flush({ current: { temperature_2m: 27.6, weather_code: 0, is_day: 1 } });
    await fixture.whenStable();

    expect(raiz.querySelector('.temperatura')?.textContent).toBe('28°');
    expect(raiz.querySelector('.estado')?.textContent).toBe('Despejado');
    expect(raiz.querySelector('.icono-clima')?.textContent).toBe('☀️');
    // Solo la ciudad, sin el país
    expect(raiz.querySelector('.lugar')?.textContent).toContain('San Pedro Sula');
    expect(raiz.querySelector('.lugar')?.textContent).not.toContain('Honduras');
  });
});
