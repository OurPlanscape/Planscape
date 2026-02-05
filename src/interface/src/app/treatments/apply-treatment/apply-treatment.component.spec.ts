import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ApplyTreatmentComponent } from '@app/treatments/apply-treatment/apply-treatment.component';
import { MockProvider } from 'ng-mocks';
import { TreatmentsState } from '@app/treatments/treatments.state';
import { SelectedStandsState } from '@app/treatments/treatment-map/selected-stands.state';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { TreatedStandsState } from '@app/treatments/treatment-map/treated-stands.state';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { of } from 'rxjs';
import { FeatureService } from '@app/features/feature.service';

describe('ApplyTreatmentComponent', () => {
  let component: ApplyTreatmentComponent;
  let fixture: ComponentFixture<ApplyTreatmentComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        ApplyTreatmentComponent,
        NoopAnimationsModule,
        MatSnackBarModule,
      ],
      providers: [
        MockProvider(SelectedStandsState, {
          hasSelectedStands$: of(false),
        }),
        MockProvider(TreatedStandsState, {
          treatedStands$: of([]),
        }),
        MockProvider(TreatmentsState, {
          activeProjectArea$: of(undefined),
        }),
        MockProvider(FeatureService),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ApplyTreatmentComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
