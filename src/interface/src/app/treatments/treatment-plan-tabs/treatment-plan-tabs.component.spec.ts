import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TreatmentPlanTabsComponent } from './treatment-plan-tabs.component';
import { TreatmentsState } from '../treatments.state';
import { MockDeclarations, MockProvider } from 'ng-mocks';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { ProjectAreasTabComponent } from '../project-areas-tab/project-areas-tab.component';
import { MapBaseLayerComponent } from '../map-base-layer/map-base-layer.component';
import { MatDialogModule } from '@angular/material/dialog';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { BehaviorSubject } from 'rxjs';

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
      declarations: [
        MockDeclarations(ProjectAreasTabComponent, MapBaseLayerComponent),
      ],
      providers: [
        MockProvider(TreatmentsState, {
          treatmentPlan$: new BehaviorSubject(null),
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
