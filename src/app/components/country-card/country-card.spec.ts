import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { CountryCardComponent } from './country-card';

describe('CountryCardComponent', () => {
  let fixture: ComponentFixture<CountryCardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CountryCardComponent],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])]
    }).compileComponents();

    fixture = TestBed.createComponent(CountryCardComponent);
    fixture.componentRef.setInput('pais', { code: 'JP', name: 'Japan', nameEs: 'Japón' });
    await fixture.whenStable();
  });

  it('muestra el nombre en inglés y en español', () => {
    const tarjeta = fixture.nativeElement as HTMLElement;
    expect(tarjeta.querySelector('h3')?.textContent).toContain('Japan');
    expect(tarjeta.querySelector('.nombre-es')?.textContent).toContain('Japón');
  });

  it('enlaza a la ficha del país', () => {
    const enlace = (fixture.nativeElement as HTMLElement).querySelector('.btn-ficha');
    expect(enlace?.getAttribute('href')).toBe('/pais/jp');
  });
});
