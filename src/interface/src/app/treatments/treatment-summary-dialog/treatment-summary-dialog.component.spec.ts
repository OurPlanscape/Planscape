import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TreatmentSummaryDialogComponent } from './treatment-summary-dialog.component';

describe('TreatmentSummaryDialogComponent', () => {
  let component: TreatmentSummaryDialogComponent;
  let fixture: ComponentFixture<TreatmentSummaryDialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TreatmentSummaryDialogComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(TreatmentSummaryDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
