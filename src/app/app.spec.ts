import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { App } from './app';

describe('App', () => {
  beforeEach(async () => {
    localStorage.clear();
    document.documentElement.removeAttribute('data-sidebar');
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])]
    }).compileComponents();
  });

  it('muestra el nombre de la app', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    expect((fixture.nativeElement as HTMLElement).querySelector('h1')?.textContent).toContain('Tu Clima');
  });

  it('el sidebar tiene las secciones con su nombre', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const textos = [...(fixture.nativeElement as HTMLElement).querySelectorAll('.navegacion .texto')].map((e) =>
      e.textContent?.trim()
    );
    expect(textos).toEqual(['Inicio', 'Comparar', 'Quiz', 'Mapas', 'Automático', 'Iniciar sesión']);
  });

  it('la barra superior enlaza a las páginas de información', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const enlaces = [...(fixture.nativeElement as HTMLElement).querySelectorAll('.barra-superior a')];
    expect(enlaces.map((a) => [a.textContent?.trim(), a.getAttribute('href')])).toEqual([
      ['Quiénes somos', '/nosotros'],
      ['A qué nos dedicamos', '/que-hacemos'],
      ['Servicios', '/servicios'],
      ['Entretenimiento', '/entretenimiento'],
      ['Contacto', '/contacto']
    ]);
  });

  it('cerrar el sidebar lo recuerda y marca el <html>', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const boton = (fixture.nativeElement as HTMLElement).querySelector<HTMLButtonElement>('.btn-retraer')!;

    boton.click();
    await fixture.whenStable();
    expect(document.documentElement.getAttribute('data-sidebar')).toBe('cerrado');
    expect(localStorage.getItem('buscador-paises:sidebar')).toBe('cerrado');
    expect(boton.getAttribute('aria-expanded')).toBe('false');
  });

  it('"Cerrar sesión" solo aparece con sesión iniciada', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const raiz = fixture.nativeElement as HTMLElement;
    expect(raiz.querySelector('.btn-salir')).toBeNull();

    fixture.componentInstance['auth'].usuario.set({ id: 'u1', nombre: 'Ana', email: 'ana@correo.com' });
    await fixture.whenStable();
    expect(raiz.querySelector('.btn-salir')).not.toBeNull();
    expect(raiz.querySelector('.cuenta .texto')?.textContent).toContain('Ana');
    expect(raiz.querySelector('.cuenta')?.getAttribute('href')).toBe('/perfil');
  });

  it('con foto de perfil, el sidebar la muestra en lugar del icono', async () => {
    const fixture = TestBed.createComponent(App);
    const foto = 'data:image/jpeg;base64,AAAA';
    fixture.componentInstance['auth'].usuario.set({ id: 'u1', nombre: 'Ana', email: 'ana@correo.com', foto });
    await fixture.whenStable();
    const cuenta = (fixture.nativeElement as HTMLElement).querySelector('.cuenta')!;
    expect(cuenta.querySelector('img.avatar')?.getAttribute('src')).toBe(foto);
    expect(cuenta.querySelector('svg')).toBeNull();
  });
});
