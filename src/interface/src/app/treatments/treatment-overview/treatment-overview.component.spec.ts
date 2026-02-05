import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { TreatmentOverviewComponent } from '@app/treatments/treatment-overview/treatment-overview.component';
import {
  MockComponent,
  MockDeclarations,
  MockProvider,
  MockProviders,
} from 'ng-mocks';
import { RouterTestingModule } from '@angular/router/testing';
import { TreatmentsState } from '@app/treatments/treatments.state';
import { TreatedStandsState } from '@app/treatments/treatment-map/treated-stands.state';
import { ProjectAreasTabComponent } from '@app/treatments/project-areas-tab/project-areas-tab.component';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { MapConfigState } from '@app/maplibre-map/map-config.state';
import { TreatmentPlanTabsComponent } from '@app/treatments/treatment-plan-tabs/treatment-plan-tabs.component';
import { AcresTreatedComponent } from '@app/treatments/acres-treated/acres-treated.component';
import { TreatmentSummaryButtonComponent } from '@app/treatments/treatment-summary-button/treatment-summary-button.component';
import { DataLayersComponent } from '@app/data-layers/data-layers/data-layers.component';
import { TreatmentPlanNotesComponent } from '@app/treatments/treatment-plan-notes/treatment-plan-notes.component';

describe('TreatmentOverviewComponent', () => {
  let component: TreatmentOverviewComponent;
  let fixture: ComponentFixture<TreatmentOverviewComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        HttpClientTestingModule,
        TreatmentOverviewComponent,

        RouterTestingModule,
        BrowserAnimationsModule,
        MockComponent(TreatmentSummaryButtonComponent),
      ],
      declarations: [
        MockDeclarations(
          ProjectAreasTabComponent,
          TreatmentPlanTabsComponent,
          AcresTreatedComponent,
          DataLayersComponent,
          TreatmentPlanNotesComponent
        ),
      ],
      providers: [
        MockProviders(MapConfigState, TreatedStandsState),
        MockProvider(TreatmentsState),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(TreatmentOverviewComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
