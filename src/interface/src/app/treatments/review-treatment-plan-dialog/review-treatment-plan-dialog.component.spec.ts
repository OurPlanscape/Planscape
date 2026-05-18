import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ReviewTreatmentPlanDialogComponent } from './review-treatment-plan-dialog.component';
import { MatDialogRef } from '@angular/material/dialog';
import { MockProvider } from 'ng-mocks';
import { TreatmentsState } from '../treatments.state';
import { RouterTestingModule } from '@angular/router/testing';
import { of } from 'rxjs';
import { MOCK_SUMMARY } from '../mocks';
import { FEATURES_JSON } from '@app/features/features-config';

describe('ReviewTreatmentPlanDialogComponent', () => {
  let component: ReviewTreatmentPlanDialogComponent;
  let fixture: ComponentFixture<ReviewTreatmentPlanDialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ReviewTreatmentPlanDialogComponent, RouterTestingModule],
      providers: [
        { provide: FEATURES_JSON, useValue: { valid: true } },
        { provide: MatDialogRef, useValue: {} },
        MockProvider(TreatmentsState, {
          summary$: of(MOCK_SUMMARY),
        }),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ReviewTreatmentPlanDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
