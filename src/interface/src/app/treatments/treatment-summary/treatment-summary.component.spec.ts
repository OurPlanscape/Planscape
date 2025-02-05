import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TreatmentSummaryComponent } from './treatment-summary.component';

describe('TreatmentSummaryComponent', () => {
  let component: TreatmentSummaryComponent;
  let fixture: ComponentFixture<TreatmentSummaryComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TreatmentSummaryComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(TreatmentSummaryComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
