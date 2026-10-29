import { Component, effect, inject, signal, untracked } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { AuthService } from '../../services/auth';
import { ASUNTOS_CONTACTO, MensajeContacto } from '../../models/contacto';

const LARGO_MAXIMO = 2000;

@Component({
  selector: 'app-contacto',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './contacto.html',
  styleUrl: './contacto.css'
})
export class ContactoComponent {
  private http = inject(HttpClient);
  private auth = inject(AuthService);

  readonly asuntos = ASUNTOS_CONTACTO;
  readonly largoMaximo = LARGO_MAXIMO;

  // Signals: el nombre y el correo pueden llegar después del primer render (al cargar la sesión)
  nombre = signal('');
  email = signal('');
  asunto = signal<MensajeContacto['asunto'] | ''>('');
  mensaje = signal('');

  enviando = signal(false);
  error = signal<string | null>(null);
  enviado = signal(false);

  constructor() {
    // Con sesión iniciada, nombre y correo se llenan solos (se pueden cambiar)
    effect(() => {
      const u = this.auth.usuario();
      if (!u) return;
      untracked(() => {
        if (!this.nombre()) this.nombre.set(u.nombre);
        if (!this.email()) this.email.set(u.email);
      });
    });
  }

  enviar(): void {
    if (this.enviando()) return;
    this.error.set(null);
    this.enviando.set(true);

    const cuerpo = { nombre: this.nombre(), email: this.email(), asunto: this.asunto(), mensaje: this.mensaje() };
    this.http.post('/api/contacto', cuerpo).subscribe({
      next: () => {
        this.enviando.set(false);
        this.enviado.set(true);
        this.asunto.set('');
        this.mensaje.set('');
      },
      error: (e: HttpErrorResponse) => {
        this.enviando.set(false);
        this.error.set(e.error?.error ?? 'No se pudo enviar el mensaje. Intenta de nuevo.');
      }
    });
  }

  escribirOtro(): void {
    this.enviado.set(false);
  }
}
