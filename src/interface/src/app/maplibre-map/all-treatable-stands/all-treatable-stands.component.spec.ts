import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AllTreatableStandsComponent } from './all-treatable-stands.component';

describe('AllTreatableStandsComponent', () => {
  let component: AllTreatableStandsComponent;
  let fixture: ComponentFixture<AllTreatableStandsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AllTreatableStandsComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(AllTreatableStandsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
