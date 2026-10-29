import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Router, provideRouter } from '@angular/router';
import { routes } from './app.routes';

const SESION = {
  token: `cabecera.${btoa(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 3600 })).replace(/=+$/, '')}.firma`,
  usuario: { id: 'u1', nombre: 'Ana', email: 'ana@correo.com' }
};

describe('Rutas con sesión', () => {
  let router: Router;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter(routes)] });
    router = TestBed.inject(Router);
  });

  it('sin sesión, /perfil lleva al login', async () => {
    await router.navigateByUrl('/perfil');
    expect(router.url).toBe('/login');
  });

  it('con sesión, /login lleva al perfil', async () => {
    localStorage.setItem('buscador-paises:sesion', JSON.stringify(SESION));
    await router.navigateByUrl('/login');
    expect(router.url).toBe('/perfil');
    TestBed.inject(HttpTestingController).match('/api/auth/yo');
  });

  it('con sesión, /perfil se abre', async () => {
    localStorage.setItem('buscador-paises:sesion', JSON.stringify(SESION));
    await router.navigateByUrl('/perfil');
    expect(router.url).toBe('/perfil');
    TestBed.inject(HttpTestingController).match('/api/auth/yo');
  });
});
