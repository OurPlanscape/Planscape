import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ReviewTreatmentPlanDialogComponent } from './review-treatment-plan-dialog.component';

describe('ReviewTreatmentPlanDialogComponent', () => {
  let component: ReviewTreatmentPlanDialogComponent;
  let fixture: ComponentFixture<ReviewTreatmentPlanDialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ReviewTreatmentPlanDialogComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(ReviewTreatmentPlanDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
