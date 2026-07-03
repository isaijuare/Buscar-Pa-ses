import { Routes } from '@angular/router';
import { ClimaComponent } from './components/clima/clima';
import { DemografiaComponent } from './components/demografia/demografia';
import { CountryListComponent } from './components/country-list/country-list';




export const routes: Routes = [

   { path: '', component: CountryListComponent },
  { path: 'demografia', component: DemografiaComponent },
  { path: 'clima', component: ClimaComponent },

{ 
  path: 'search',
  loadComponent: () => import('./components/search-bar/search-bar').then(m => m.SearchBarComponent)
},

{
  path: 'country-card',
  loadComponent: () => import('./components/country-card/country-card').then(m => m.CountryCardComponent)
}

];
