import { Routes } from '@angular/router';
import { CountryListComponent } from './components/country-list/country-list';

// Demografía, clima y la tarjeta de país se muestran dentro de la pantalla principal
// (modal y tarjetas), no como páginas propias: necesitan datos que les pasa el padre.
export const routes: Routes = [
  { path: '', component: CountryListComponent, title: 'Buscador de Países' },
  {
    path: 'pais/:codigo',
    loadComponent: () => import('./components/pais-detalle/pais-detalle').then((m) => m.PaisDetalleComponent)
  },
  {
    path: 'comparar',
    loadComponent: () => import('./components/comparador/comparador').then((m) => m.ComparadorComponent),
    title: 'Comparar países · Buscador de Países',
    data: { barraLateral: false }
  },
  {
    path: 'quiz',
    loadComponent: () => import('./components/quiz/quiz').then((m) => m.QuizComponent),
    title: 'Quiz de banderas y capitales · Buscador de Países',
    data: { barraLateral: false }
  },
  {
    path: 'login',
    loadComponent: () => import('./components/login/login').then((m) => m.LoginComponent),
    title: 'Iniciar sesión · Tu Clima',
    data: { barraLateral: false }
  },
  { path: '**', redirectTo: '' }
];
