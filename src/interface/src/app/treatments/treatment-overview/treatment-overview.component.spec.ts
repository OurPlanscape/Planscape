import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { TreatmentOverviewComponent } from './treatment-overview.component';
import {
  MockComponent,
  MockDeclarations,
  MockProvider,
  MockProviders,
} from 'ng-mocks';
import { RouterTestingModule } from '@angular/router/testing';
import { TreatmentsState } from '../treatments.state';
import { TreatedStandsState } from '@treatments/treatment-map/treated-stands.state';
import { ProjectAreasTabComponent } from '@treatments/project-areas-tab/project-areas-tab.component';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { MapConfigState } from '@maplibre-map/map-config.state';
import { TreatmentPlanTabsComponent } from '@treatments/treatment-plan-tabs/treatment-plan-tabs.component';
import { AcresTreatedComponent } from '@treatments/acres-treated/acres-treated.component';
import { TreatmentSummaryButtonComponent } from '@treatments/treatment-summary-button/treatment-summary-button.component';
import { DataLayersComponent } from '@data-layers/data-layers/data-layers.component';
import { TreatmentPlanNotesComponent } from '@treatments/treatment-plan-notes/treatment-plan-notes.component';

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
