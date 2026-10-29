import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { FavoritosService } from './favoritos';
import { AuthService } from './auth';

const JAPON = { code: 'JP', nombre: 'Japón' };
const MEXICO = { code: 'MX', nombre: 'México' };
const PERU = { code: 'PE', nombre: 'Perú' };
const USUARIO = { id: 'u1', nombre: 'Ana', email: 'ana@correo.com' };

describe('FavoritosService', () => {
  let favoritos: FavoritosService;
  let auth: AuthService;
  let http: HttpTestingController;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    favoritos = TestBed.inject(FavoritosService);
    auth = TestBed.inject(AuthService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  function iniciarSesion(): void {
    auth.usuario.set(USUARIO);
    auth.token.set('abc');
    TestBed.tick();
  }

  it('sin sesión guarda en el navegador y no llama al servidor', () => {
    favoritos.cargar();
    favoritos.alternarFavorito(JAPON);
    TestBed.tick();

    expect(JSON.parse(localStorage.getItem('buscador-paises:favoritos')!)).toEqual([JAPON]);
    http.expectNone(() => true);
  });

  it('al iniciar sesión junta las listas del navegador con las de la cuenta y sube el resultado', () => {
    favoritos.cargar();
    favoritos.alternarFavorito(JAPON);
    favoritos.alternarFavorito(MEXICO);
    TestBed.tick();

    iniciarSesion();
    http.expectOne('/api/usuario/listas').flush({ favoritos: [MEXICO, PERU], recientes: [] });
    TestBed.tick();

    // Los de la cuenta primero, sin repetir México
    expect(favoritos.favoritos()).toEqual([MEXICO, PERU, JAPON]);
    const subida = http.expectOne('/api/usuario/listas/favoritos');
    expect(subida.request.method).toBe('PUT');
    expect(subida.request.body).toEqual([MEXICO, PERU, JAPON]);
    subida.flush(null);
    http.expectOne('/api/usuario/listas/recientes').flush(null);
  });

  it('con sesión, cada cambio se guarda en la cuenta', () => {
    favoritos.cargar();
    iniciarSesion();
    http.expectOne('/api/usuario/listas').flush({ favoritos: [], recientes: [] });
    TestBed.tick();
    http.match(() => true).forEach((r) => r.flush(null));

    favoritos.alternarFavorito(PERU);
    TestBed.tick();
    expect(http.expectOne('/api/usuario/listas/favoritos').request.body).toEqual([PERU]);
  });

  it('al cerrar sesión vacía las listas', () => {
    favoritos.cargar();
    iniciarSesion();
    http.expectOne('/api/usuario/listas').flush({ favoritos: [JAPON], recientes: [MEXICO] });
    TestBed.tick();
    http.match(() => true).forEach((r) => r.flush(null));

    auth.cerrarSesion();
    TestBed.tick();
    expect(favoritos.favoritos()).toEqual([]);
    expect(favoritos.recientes()).toEqual([]);
    expect(localStorage.getItem('buscador-paises:favoritos')).toBe('[]');
    // Vaciar al salir no debe borrar lo que hay en la cuenta
    http.expectNone(() => true);
  });
});
