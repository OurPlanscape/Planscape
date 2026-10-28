import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AllTreatableStandsToggleComponent } from './all-treatable-stands-toggle.component';

describe('AllTreatableStandsToggleComponent', () => {
  let component: AllTreatableStandsToggleComponent;
  let fixture: ComponentFixture<AllTreatableStandsToggleComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AllTreatableStandsToggleComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(AllTreatableStandsToggleComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
