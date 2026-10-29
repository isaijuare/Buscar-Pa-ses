import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth';

type Pestana = 'entrar' | 'registro';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './login.html',
  styleUrl: './login.css'
})
export class LoginComponent {
  private auth = inject(AuthService);
  private router = inject(Router);

  pestana = signal<Pestana>('entrar');
  enviando = signal(false);
  error = signal<string | null>(null);

  nombre = '';
  email = '';
  password = '';
  verPassword = signal(false);

  cambiarPestana(pestana: Pestana): void {
    this.pestana.set(pestana);
    this.error.set(null);
  }

  enviar(): void {
    if (this.enviando()) return;
    this.error.set(null);
    this.enviando.set(true);

    const peticion =
      this.pestana() === 'registro'
        ? this.auth.registrar(this.nombre, this.email, this.password)
        : this.auth.iniciarSesion(this.email, this.password);

    peticion.subscribe({
      next: () => {
        this.enviando.set(false);
        this.password = '';
        this.router.navigateByUrl('/');
      },
      error: (e: Error) => {
        this.enviando.set(false);
        this.error.set(e.message);
      }
    });
  }
}
