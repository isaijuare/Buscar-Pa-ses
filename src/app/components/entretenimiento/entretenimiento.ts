import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

interface Juego {
  icono: string;
  titulo: string;
  texto: string;
  /** Ruta del juego; sin ruta se muestra como "Próximamente" */
  ruta?: string;
}

const JUEGOS: Juego[] = [
  {
    icono: '🏳️',
    titulo: 'Quiz de geografía',
    texto: 'Adivina países por su bandera o sus capitales. ¡Entra al ranking de mejores puntajes!',
    ruta: '/quiz'
  },
  {
    icono: '🌸',
    titulo: '¿Qué estación es?',
    texto: 'Un lugar del mundo y una fecha: adivina la estación. ¡En el hemisferio sur van al revés!',
    ruta: '/juegos/estaciones'
  },
  {
    icono: '🃏',
    titulo: 'Memoria de las estaciones',
    texto: 'Encuentra los 8 pares de primavera, verano, otoño e invierno en la menor cantidad de movimientos.',
    ruta: '/juegos/memoria'
  },
  {
    icono: '💎',
    titulo: 'Piedras y minerales',
    texto: 'Descubre de dónde vienen el cuarzo, el diamante o la turquesa, cómo se forman y qué los hace únicos.',
    ruta: '/minerales'
  },
  {
    icono: '🗺️',
    titulo: 'Mapas de países',
    texto: 'Mira la forma de cualquier país y descarga su mapa como imagen.',
    ruta: '/mapas'
  }
];

@Component({
  selector: 'app-entretenimiento',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './entretenimiento.html',
  styleUrl: './entretenimiento.css'
})
export class EntretenimientoComponent {
  readonly juegos = JUEGOS;
}
