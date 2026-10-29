import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth';
import { formatoFechaLarga } from '../../utils/formato';

// La foto se guarda como un cuadrado de este tamaño (suficiente para el avatar, unos 20-40 KB)
const LADO_FOTO = 256;
const MAXIMO_ARCHIVO_MB = 10;

@Component({
  selector: 'app-perfil',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './perfil.html',
  styleUrl: './perfil.css'
})
export class PerfilComponent {
  protected auth = inject(AuthService);
  private router = inject(Router);

  usuario = this.auth.usuario;
  iniciales = computed(() =>
    (this.usuario()?.nombre ?? '')
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0].toUpperCase())
      .join('')
  );
  miembroDesde = computed(() => {
    const creado = this.usuario()?.creado;
    return creado ? formatoFechaLarga(new Date(creado)) : null;
  });

  // ---------- Foto ----------
  subiendoFoto = signal(false);
  errorFoto = signal<string | null>(null);

  async elegirFoto(evento: Event): Promise<void> {
    const entrada = evento.target as HTMLInputElement;
    const archivo = entrada.files?.[0];
    entrada.value = ''; // permite volver a elegir el mismo archivo
    if (!archivo) return;

    this.errorFoto.set(null);
    if (!archivo.type.startsWith('image/')) return this.errorFoto.set('Elige un archivo de imagen.');
    if (archivo.size > MAXIMO_ARCHIVO_MB * 1024 * 1024) {
      return this.errorFoto.set(`La imagen pesa más de ${MAXIMO_ARCHIVO_MB} MB.`);
    }

    this.subiendoFoto.set(true);
    try {
      this.enviarFoto(await recortarCuadrado(archivo, LADO_FOTO));
    } catch {
      this.subiendoFoto.set(false);
      this.errorFoto.set('No se pudo leer la imagen. Prueba con otra.');
    }
  }

  quitarFoto(): void {
    this.errorFoto.set(null);
    this.subiendoFoto.set(true);
    this.enviarFoto(null);
  }

  private enviarFoto(foto: string | null): void {
    this.auth.cambiarFoto(foto).subscribe({
      next: () => this.subiendoFoto.set(false),
      error: (e: Error) => {
        this.subiendoFoto.set(false);
        this.errorFoto.set(e.message);
      }
    });
  }

  // ---------- Contraseña ----------
  actual = '';
  nueva = '';
  confirmacion = '';
  verPasswords = signal(false);
  cambiando = signal(false);
  errorPassword = signal<string | null>(null);
  passwordCambiada = signal(false);

  cambiarPassword(): void {
    if (this.cambiando()) return;
    this.errorPassword.set(null);
    this.passwordCambiada.set(false);

    if (this.nueva !== this.confirmacion) {
      this.errorPassword.set('La nueva contraseña y su confirmación no coinciden.');
      return;
    }

    this.cambiando.set(true);
    this.auth.cambiarPassword(this.actual, this.nueva).subscribe({
      next: () => {
        this.cambiando.set(false);
        this.passwordCambiada.set(true);
        this.actual = this.nueva = this.confirmacion = '';
      },
      error: (e: Error) => {
        this.cambiando.set(false);
        this.errorPassword.set(e.message);
      }
    });
  }

  // ---------- Sesión ----------
  cerrarSesion(): void {
    this.auth.cerrarSesion();
    this.router.navigateByUrl('/');
  }
}

/** Recorta la imagen al cuadrado central y la reduce a `lado` px, como JPEG. */
async function recortarCuadrado(archivo: File, lado: number): Promise<string> {
  const imagen = await createImageBitmap(archivo);
  const corte = Math.min(imagen.width, imagen.height);
  const lienzo = document.createElement('canvas');
  lienzo.width = lienzo.height = lado;
  const ctx = lienzo.getContext('2d')!;
  // Fondo blanco: las PNG con transparencia no quedan negras al pasar a JPEG
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, lado, lado);
  ctx.drawImage(imagen, (imagen.width - corte) / 2, (imagen.height - corte) / 2, corte, corte, 0, 0, lado, lado);
  imagen.close();
  return lienzo.toDataURL('image/jpeg', 0.85);
}
