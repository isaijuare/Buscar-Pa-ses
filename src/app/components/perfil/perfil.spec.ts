import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Router, provideRouter } from '@angular/router';
import { PerfilComponent } from './perfil';
import { AuthService } from '../../services/auth';

describe('PerfilComponent', () => {
  let fixture: ComponentFixture<PerfilComponent>;
  let auth: AuthService;
  let http: HttpTestingController;
  let raiz: HTMLElement;

  beforeEach(async () => {
    localStorage.clear();
    await TestBed.configureTestingModule({
      imports: [PerfilComponent],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])]
    }).compileComponents();

    auth = TestBed.inject(AuthService);
    http = TestBed.inject(HttpTestingController);
    auth.token.set('abc');
    auth.usuario.set({ id: 'u1', nombre: 'Ana López', email: 'ana@correo.com', creado: '2026-03-15T12:00:00.000Z' });

    fixture = TestBed.createComponent(PerfilComponent);
    raiz = fixture.nativeElement as HTMLElement;
    await fixture.whenStable();
  });

  afterEach(() => http.verify());

  it('muestra nombre, correo y fecha de registro', () => {
    expect(raiz.querySelector('.nombre')?.textContent).toContain('Ana López');
    expect(raiz.querySelector('dl')?.textContent).toContain('ana@correo.com');
    expect(raiz.querySelector('dl')?.textContent).toContain('2026');
  });

  it('sin foto muestra las iniciales', () => {
    expect(raiz.querySelector('.iniciales')?.textContent).toBe('AL');
    expect(raiz.querySelector('.foto img')).toBeNull();
  });

  it('con foto la muestra y ofrece quitarla', async () => {
    auth.usuario.update((u) => ({ ...u!, foto: 'data:image/jpeg;base64,AAAA' }));
    await fixture.whenStable();
    expect(raiz.querySelector('.foto img')?.getAttribute('src')).toBe('data:image/jpeg;base64,AAAA');

    raiz.querySelector<HTMLButtonElement>('.btn-texto')!.click();
    http.expectOne('/api/auth/foto').flush({ ...auth.usuario(), foto: null });
    await fixture.whenStable();
    expect(raiz.querySelector('.iniciales')).not.toBeNull();
  });

  it('no envía el cambio si la confirmación no coincide', () => {
    const perfil = fixture.componentInstance;
    perfil.actual = 'secreto1';
    perfil.nueva = 'nueva123';
    perfil.confirmacion = 'otra123';
    perfil.cambiarPassword();

    expect(perfil.errorPassword()).toContain('no coinciden');
    http.expectNone('/api/auth/password');
  });

  it('cambia la contraseña, avisa y limpia el formulario', () => {
    const perfil = fixture.componentInstance;
    perfil.actual = 'secreto1';
    perfil.nueva = perfil.confirmacion = 'nueva123';
    perfil.cambiarPassword();

    http.expectOne('/api/auth/password').flush({ token: 'nuevo', usuario: auth.usuario() });
    expect(perfil.passwordCambiada()).toBe(true);
    expect([perfil.actual, perfil.nueva, perfil.confirmacion]).toEqual(['', '', '']);
  });

  it('muestra el error del servidor al cambiar la contraseña', () => {
    const perfil = fixture.componentInstance;
    perfil.actual = 'mala';
    perfil.nueva = perfil.confirmacion = 'nueva123';
    perfil.cambiarPassword();

    http
      .expectOne('/api/auth/password')
      .flush({ error: 'La contraseña actual no es correcta.' }, { status: 400, statusText: 'Bad Request' });
    expect(perfil.errorPassword()).toBe('La contraseña actual no es correcta.');
    expect(perfil.passwordCambiada()).toBe(false);
  });

  it('cerrar sesión borra la sesión y vuelve al inicio', async () => {
    const navegar = vi.spyOn(TestBed.inject(Router), 'navigateByUrl');
    raiz.querySelector<HTMLButtonElement>('.sesion .btn-salir')!.click();
    expect(auth.conectado()).toBe(false);
    expect(navegar).toHaveBeenCalledWith('/');
  });
});
