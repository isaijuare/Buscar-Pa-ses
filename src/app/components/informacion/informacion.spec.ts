import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { InformacionComponent } from './informacion';
import { PAGINAS } from '../../models/contenido-info';

describe('InformacionComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [InformacionComponent], providers: [provideRouter([])] }).compileComponents();
  });

  for (const clave of ['nosotros', 'dedicamos', 'servicios'] as const) {
    it(`arma la página "${PAGINAS[clave].titulo}" con todos sus bloques`, async () => {
      const fixture = TestBed.createComponent(InformacionComponent);
      fixture.componentRef.setInput('pagina', clave);
      await fixture.whenStable();
      const raiz = fixture.nativeElement as HTMLElement;

      expect(raiz.querySelector('h2')?.textContent).toBe(PAGINAS[clave].titulo);
      expect([...raiz.querySelectorAll('.bloque h3')].map((h) => h.textContent)).toEqual(
        PAGINAS[clave].bloques.map((b) => b.titulo)
      );
    });
  }

  it('solo muestra el enlace a contacto si la página tiene cierre', async () => {
    const fixture = TestBed.createComponent(InformacionComponent);
    fixture.componentRef.setInput('pagina', 'servicios');
    await fixture.whenStable();
    expect((fixture.nativeElement as HTMLElement).querySelector('.cierre a')?.getAttribute('href')).toBe('/contacto');

    fixture.componentRef.setInput('pagina', 'nosotros');
    await fixture.whenStable();
    expect((fixture.nativeElement as HTMLElement).querySelector('.cierre')).toBeNull();
  });
});
