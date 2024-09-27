import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TreatmentLegendComponent } from './treatment-legend.component';

describe('TreatmentLegendComponent', () => {
  let component: TreatmentLegendComponent;
  let fixture: ComponentFixture<TreatmentLegendComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TreatmentLegendComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(TreatmentLegendComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
