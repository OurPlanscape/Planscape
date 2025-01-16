import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { TreatmentPlanNotesComponent } from './treatment-plan-notes.component';
import { MatDialogModule } from '@angular/material/dialog';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { TreatmentsState } from '../treatments.state';
import { MockProvider } from 'ng-mocks';
import { BehaviorSubject } from 'rxjs';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';

describe('TreatmentPlanNotesComponent', () => {
  let component: TreatmentPlanNotesComponent;
  let fixture: ComponentFixture<TreatmentPlanNotesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        BrowserAnimationsModule,
        TreatmentPlanNotesComponent,
        HttpClientTestingModule,
        MatDialogModule,
        MatSnackBarModule,
      ],
      providers: [
        MockProvider(TreatmentsState, {
          treatmentPlan$: new BehaviorSubject(null),
        }),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(TreatmentPlanNotesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
