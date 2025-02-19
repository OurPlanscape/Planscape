import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TreatmentSummaryButtonComponent } from './treatment-summary-button.component';
import { MatDialogModule } from '@angular/material/dialog';
import { MockProvider } from 'ng-mocks';
import { TreatmentsState } from '../treatments.state';
import { BehaviorSubject } from 'rxjs';

describe('TreatmentSummaryButtonComponent', () => {
  let component: TreatmentSummaryButtonComponent;
  let fixture: ComponentFixture<TreatmentSummaryButtonComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TreatmentSummaryButtonComponent, MatDialogModule],
      providers: [
        MockProvider(TreatmentsState, {
          summary$: new BehaviorSubject(null),
        }),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(TreatmentSummaryButtonComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
