import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ContactoComponent } from './contacto';
import { AuthService } from '../../services/auth';

describe('ContactoComponent', () => {
  let fixture: ComponentFixture<ContactoComponent>;
  let contacto: ContactoComponent;
  let http: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ContactoComponent],
      providers: [provideHttpClient(), provideHttpClientTesting()]
    }).compileComponents();
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(ContactoComponent);
    contacto = fixture.componentInstance;
    await fixture.whenStable();
  });

  afterEach(() => http.verify());

  function llenar(): void {
    contacto.nombre.set('Ana');
    contacto.email.set('ana@correo.com');
    contacto.asunto.set('Sugerencia');
    contacto.mensaje.set('Me gustaría ver el pronóstico de 7 días.');
  }

  it('con sesión iniciada llena el nombre y el correo', async () => {
    TestBed.inject(AuthService).usuario.set({ id: 'u1', nombre: 'Ana', email: 'ana@correo.com' });
    await fixture.whenStable();
    expect([contacto.nombre(), contacto.email()]).toEqual(['Ana', 'ana@correo.com']);
  });

  it('envía el mensaje, avisa y limpia asunto y mensaje', async () => {
    llenar();
    contacto.enviar();
    const peticion = http.expectOne('/api/contacto');
    expect(peticion.request.body).toEqual({
      nombre: 'Ana',
      email: 'ana@correo.com',
      asunto: 'Sugerencia',
      mensaje: 'Me gustaría ver el pronóstico de 7 días.'
    });
    peticion.flush({ ok: true }, { status: 201, statusText: 'Created' });
    await fixture.whenStable();

    expect(contacto.enviado()).toBe(true);
    expect((fixture.nativeElement as HTMLElement).querySelector('.exito')?.textContent).toContain('ana@correo.com');
    expect([contacto.asunto(), contacto.mensaje()]).toEqual(['', '']);
  });

  it('muestra el error del servidor', () => {
    llenar();
    contacto.enviar();
    http
      .expectOne('/api/contacto')
      .flush({ error: 'Ya recibimos varios mensajes tuyos.' }, { status: 429, statusText: 'Too Many Requests' });
    expect(contacto.error()).toBe('Ya recibimos varios mensajes tuyos.');
    expect(contacto.enviado()).toBe(false);
  });
});
