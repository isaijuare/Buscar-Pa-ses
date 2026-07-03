import { Component, output, OnDestroy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';

@Component({
  selector: 'app-search-bar',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './search-bar.html',
  styleUrl: './search-bar.css'
})
export class SearchBarComponent implements OnDestroy {
  texto = '';

  
  buscar = output<string>();

  private input$ = new Subject<string>();

  constructor() {
    this.input$
      .pipe(
        debounceTime(300),        
        distinctUntilChanged()    
      )
      .subscribe((valor) => this.buscar.emit(valor));
  }

  onInput(): void {
    this.input$.next(this.texto);
  }

  ngOnDestroy(): void {
    this.input$.complete();
  }
}