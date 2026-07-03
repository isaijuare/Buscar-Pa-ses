import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Demografia } from './demografia';

describe('Demografia', () => {
  let component: Demografia;
  let fixture: ComponentFixture<Demografia>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Demografia],
    }).compileComponents();

    fixture = TestBed.createComponent(Demografia);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
