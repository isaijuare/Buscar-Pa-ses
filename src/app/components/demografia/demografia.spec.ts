import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { DemografiaComponent } from './demografia';

describe('DemografiaComponent', () => {
  let fixture: ComponentFixture<DemografiaComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DemografiaComponent],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])]
    }).compileComponents();

    fixture = TestBed.createComponent(DemografiaComponent);
    await fixture.whenStable();
  });

  it('se crea', () => {
    expect(fixture.componentInstance).toBeTruthy();
  });
});
