import { Component, input, output } from '@angular/core';
import { Country } from '../../models/country';
 
@Component({
  selector: 'app-country-card',
  standalone: true,
  templateUrl: './country-card.html',
  styleUrl: './country-card.css'
})
export class CountryCardComponent {
  
  pais = input.required<Country>();
 
 
  verDemografia = output<Country>();
  verClima = output<Country>();
 
  onVerDemografia(): void {
    this.verDemografia.emit(this.pais());
  }
 
  onVerClima(): void {
    this.verClima.emit(this.pais());
  }
}
 
