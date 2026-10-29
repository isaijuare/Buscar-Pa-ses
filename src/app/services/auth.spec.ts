import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { firstValueFrom } from 'rxjs';
import { AuthService } from './auth';

const CLAVE = 'buscador-paises:sesion';
const USUARIO = { id: 'u1', nombre: 'Ana', email: 'ana@correo.com' };

/** Token con la forma de un JWT; el cliente solo lee la fecha de vencimiento. */
function token(venceEnSegundos: number): string {
  const datos = btoa(JSON.stringify({ sub: 'u1', exp: Math.floor(Date.now() / 1000) + venceEnSegundos }));
  return `cabecera.${datos.replace(/=+$/, '')}.firma`;
}

describe('AuthService', () => {
  let auth: AuthService;
  let http: HttpTestingController;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    auth = TestBed.inject(AuthService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('al iniciar sesión guarda el usuario y el token', async () => {
    const respuesta = firstValueFrom(auth.iniciarSesion('ana@correo.com', 'secreto1'));
    const peticion = http.expectOne('/api/auth/login');
    expect(peticion.request.body).toEqual({ email: 'ana@correo.com', password: 'secreto1' });
    peticion.flush({ token: 'abc', usuario: USUARIO });
    await respuesta;

    expect(auth.conectado()).toBe(true);
    expect(auth.token()).toBe('abc');
    expect(JSON.parse(localStorage.getItem(CLAVE)!).usuario).toEqual(USUARIO);
  });

  it('muestra el mensaje de error que manda el servidor', async () => {
    const respuesta = firstValueFrom(auth.iniciarSesion('ana@correo.com', 'mala'));
    http
      .expectOne('/api/auth/login')
      .flush({ error: 'Correo o contraseña incorrectos.' }, { status: 401, statusText: 'Unauthorized' });

    await expect(respuesta).rejects.toThrow('Correo o contraseña incorrectos.');
    expect(auth.conectado()).toBe(false);
  });

  it('al cerrar sesión borra todo', () => {
    localStorage.setItem(CLAVE, JSON.stringify({ token: token(3600), usuario: USUARIO }));
    auth.cargar();
    http.expectOne('/api/auth/yo').flush(USUARIO);

    auth.cerrarSesion();
    expect(auth.usuario()).toBeNull();
    expect(auth.token()).toBeNull();
    expect(localStorage.getItem(CLAVE)).toBeNull();
  });

  it('recupera la sesión guardada y la confirma con el servidor', () => {
    localStorage.setItem(CLAVE, JSON.stringify({ token: token(3600), usuario: USUARIO }));
    auth.cargar();
    expect(auth.usuario()).toEqual(USUARIO);
    http.expectOne('/api/auth/yo').flush(USUARIO);
    expect(auth.conectado()).toBe(true);
  });

  it('cierra la sesión si el servidor ya no la acepta', () => {
    localStorage.setItem(CLAVE, JSON.stringify({ token: token(3600), usuario: USUARIO }));
    auth.cargar();
    http.expectOne('/api/auth/yo').flush({ error: 'Vencida' }, { status: 401, statusText: 'Unauthorized' });
    expect(auth.conectado()).toBe(false);
  });

  it('al cambiar la contraseña se queda con el token nuevo', async () => {
    auth.token.set('viejo');
    auth.usuario.set(USUARIO);
    const cambio = firstValueFrom(auth.cambiarPassword('secreto1', 'nueva123'));
    const peticion = http.expectOne('/api/auth/password');
    expect(peticion.request.body).toEqual({ actual: 'secreto1', nueva: 'nueva123' });
    peticion.flush({ token: 'nuevo', usuario: USUARIO });
    await cambio;

    expect(auth.token()).toBe('nuevo');
    expect(JSON.parse(localStorage.getItem(CLAVE)!).token).toBe('nuevo');
  });

  it('al cambiar la foto actualiza el usuario guardado sin perder el token', async () => {
    auth.token.set('abc');
    auth.usuario.set(USUARIO);
    const foto = 'data:image/jpeg;base64,AAAA';

    const subida = firstValueFrom(auth.cambiarFoto(foto));
    const peticion = http.expectOne('/api/auth/foto');
    expect(peticion.request.method).toBe('PUT');
    peticion.flush({ ...USUARIO, foto });
    await subida;
    expect(auth.usuario()?.foto).toBe(foto);
    expect(JSON.parse(localStorage.getItem(CLAVE)!)).toEqual({ token: 'abc', usuario: { ...USUARIO, foto } });

    const quitada = firstValueFrom(auth.cambiarFoto(null));
    const borrado = http.expectOne('/api/auth/foto');
    expect(borrado.request.method).toBe('DELETE');
    borrado.flush({ ...USUARIO, foto: null });
    await quitada;
    expect(auth.usuario()?.foto).toBeNull();
  });

  it('descarta un token vencido sin preguntar al servidor', () => {
    localStorage.setItem(CLAVE, JSON.stringify({ token: token(-60), usuario: USUARIO }));
    auth.cargar();
    http.expectNone('/api/auth/yo');
    expect(auth.conectado()).toBe(false);
    expect(localStorage.getItem(CLAVE)).toBeNull();
  });
});
