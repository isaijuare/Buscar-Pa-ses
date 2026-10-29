import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { PaisDetalleModalComponent } from './modal';

describe('PaisDetalleModalComponent', () => {
  let fixture: ComponentFixture<PaisDetalleModalComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PaisDetalleModalComponent],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])]
    }).compileComponents();

    fixture = TestBed.createComponent(PaisDetalleModalComponent);
    await fixture.whenStable();
  });

  it('se crea', () => {
    expect(fixture.componentInstance).toBeTruthy();
  });
});
