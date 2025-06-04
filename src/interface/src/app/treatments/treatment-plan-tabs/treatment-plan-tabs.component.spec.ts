import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TreatmentPlanTabsComponent } from './treatment-plan-tabs.component';
import { TreatmentsState } from '../treatments.state';
import { MockDeclarations, MockProvider } from 'ng-mocks';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { ProjectAreasTabComponent } from '../project-areas-tab/project-areas-tab.component';
import { MatDialogModule } from '@angular/material/dialog';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { BehaviorSubject, of } from 'rxjs';
import { DataLayersStateService } from 'src/app/data-layers/data-layers.state.service';

describe('TreatmentPlanTabsComponent', () => {
  let component: TreatmentPlanTabsComponent;
  let fixture: ComponentFixture<TreatmentPlanTabsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        HttpClientTestingModule,
        MatDialogModule,
        MatSnackBarModule,
        TreatmentPlanTabsComponent,
        BrowserAnimationsModule,
      ],
      declarations: [MockDeclarations(ProjectAreasTabComponent)],
      providers: [
        MockProvider(TreatmentsState, {
          treatmentPlan$: new BehaviorSubject(null),
        }),
        MockProvider(DataLayersStateService, {
          paths$: of([]),
        }),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(TreatmentPlanTabsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
