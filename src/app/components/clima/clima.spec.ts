import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { ClimaComponent } from './clima';

describe('ClimaComponent', () => {
  let fixture: ComponentFixture<ClimaComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ClimaComponent],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])]
    }).compileComponents();

    fixture = TestBed.createComponent(ClimaComponent);
    await fixture.whenStable();
  });

  it('se crea', () => {
    expect(fixture.componentInstance).toBeTruthy();
  });
});
