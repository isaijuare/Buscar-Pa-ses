import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CountryCard } from './country-card';

describe('CountryCard', () => {
  let component: CountryCard;
  let fixture: ComponentFixture<CountryCard>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CountryCard],
    }).compileComponents();

    fixture = TestBed.createComponent(CountryCard);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
