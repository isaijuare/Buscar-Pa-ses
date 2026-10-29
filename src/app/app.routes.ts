import { inject } from '@angular/core';
import { CanActivateFn, Router, Routes } from '@angular/router';
import { AuthService } from './services/auth';
import { CountryListComponent } from './components/country-list/country-list';

// Demografía, clima y la tarjeta de país se muestran dentro de la pantalla principal
// (modal y tarjetas), no como páginas propias: necesitan datos que les pasa el padre.
// La sesión vive en el navegador: estas rutas se arman solo ahí (ver app.routes.server.ts)
const soloConSesion: CanActivateFn = () => {
  const auth = inject(AuthService);
  auth.cargar();
  return auth.conectado() || inject(Router).createUrlTree(['/login']);
};

const soloSinSesion: CanActivateFn = () => {
  const auth = inject(AuthService);
  auth.cargar();
  return !auth.conectado() || inject(Router).createUrlTree(['/perfil']);
};

export const routes: Routes = [
  { path: '', component: CountryListComponent, title: 'Tu Clima' },
  {
    path: 'pais/:codigo',
    loadComponent: () => import('./components/pais-detalle/pais-detalle').then((m) => m.PaisDetalleComponent)
  },
  {
    path: 'comparar',
    loadComponent: () => import('./components/comparador/comparador').then((m) => m.ComparadorComponent),
    title: 'Comparar países · Tu Clima',
    data: { barraLateral: false }
  },
  {
    path: 'quiz',
    loadComponent: () => import('./components/quiz/quiz').then((m) => m.QuizComponent),
    title: 'Quiz de banderas y capitales · Tu Clima',
    data: { barraLateral: false }
  },
  {
    path: 'login',
    loadComponent: () => import('./components/login/login').then((m) => m.LoginComponent),
    canActivate: [soloSinSesion],
    title: 'Iniciar sesión · Tu Clima',
    data: { barraLateral: false }
  },
  {
    path: 'perfil',
    loadComponent: () => import('./components/perfil/perfil').then((m) => m.PerfilComponent),
    canActivate: [soloConSesion],
    title: 'Tu perfil · Tu Clima',
    data: { barraLateral: false }
  },
  // Páginas de la barra superior (el texto de las tres primeras está en models/contenido-info.ts)
  {
    path: 'nosotros',
    loadComponent: () => import('./components/informacion/informacion').then((m) => m.InformacionComponent),
    title: 'Quiénes somos · Tu Clima',
    data: { pagina: 'nosotros', barraLateral: false }
  },
  {
    path: 'que-hacemos',
    loadComponent: () => import('./components/informacion/informacion').then((m) => m.InformacionComponent),
    title: 'A qué nos dedicamos · Tu Clima',
    data: { pagina: 'dedicamos', barraLateral: false }
  },
  {
    path: 'servicios',
    loadComponent: () => import('./components/informacion/informacion').then((m) => m.InformacionComponent),
    title: 'Servicios · Tu Clima',
    data: { pagina: 'servicios', barraLateral: false }
  },
  {
    path: 'entretenimiento',
    loadComponent: () => import('./components/entretenimiento/entretenimiento').then((m) => m.EntretenimientoComponent),
    title: 'Entretenimiento · Tu Clima',
    data: { barraLateral: false }
  },
  {
    path: 'juegos/estaciones',
    loadComponent: () =>
      import('./components/juegos/estaciones/juego-estaciones').then((m) => m.JuegoEstacionesComponent),
    title: '¿Qué estación es? · Tu Clima',
    data: { barraLateral: false }
  },
  {
    path: 'juegos/memoria',
    loadComponent: () => import('./components/juegos/memoria/juego-memoria').then((m) => m.JuegoMemoriaComponent),
    title: 'Memoria de las estaciones · Tu Clima',
    data: { barraLateral: false }
  },
  {
    path: 'minerales',
    loadComponent: () => import('./components/minerales/minerales').then((m) => m.MineralesComponent),
    title: 'Piedras y minerales · Tu Clima',
    data: { barraLateral: false }
  },
  {
    // /mapas sin país muestra el buscador; /mapas/hn, el mapa de Honduras
    path: 'mapas',
    loadComponent: () => import('./components/mapas/mapas').then((m) => m.MapasComponent),
    title: 'Mapas de países · Tu Clima',
    data: { barraLateral: false }
  },
  {
    path: 'mapas/:codigo',
    loadComponent: () => import('./components/mapas/mapas').then((m) => m.MapasComponent),
    title: 'Mapas de países · Tu Clima',
    data: { barraLateral: false }
  },
  {
    path: 'contacto',
    loadComponent: () => import('./components/contacto/contacto').then((m) => m.ContactoComponent),
    title: 'Contacto · Tu Clima',
    data: { barraLateral: false }
  },
  { path: '**', redirectTo: '' }
];
