import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { CountryListComponent } from './country-list';

describe('CountryListComponent', () => {
  let fixture: ComponentFixture<CountryListComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CountryListComponent],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])]
    }).compileComponents();

    fixture = TestBed.createComponent(CountryListComponent);
    await fixture.whenStable();
  });

  it('se crea', () => {
    expect(fixture.componentInstance).toBeTruthy();
  });
});
