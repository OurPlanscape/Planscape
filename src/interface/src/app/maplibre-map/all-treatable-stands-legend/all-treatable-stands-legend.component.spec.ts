import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AllTreatableStandsLegendComponent } from './all-treatable-stands-legend.component';

describe('AllTreatableStandsLegendComponent', () => {
  let component: AllTreatableStandsLegendComponent;
  let fixture: ComponentFixture<AllTreatableStandsLegendComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AllTreatableStandsLegendComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(AllTreatableStandsLegendComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
