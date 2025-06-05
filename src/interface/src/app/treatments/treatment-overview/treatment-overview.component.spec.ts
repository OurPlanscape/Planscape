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
import { TreatedStandsState } from '../treatment-map/treated-stands.state';
import { ProjectAreasTabComponent } from '../project-areas-tab/project-areas-tab.component';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { MapConfigState } from '../../maplibre-map/map-config.state';
import { TreatmentPlanTabsComponent } from '../treatment-plan-tabs/treatment-plan-tabs.component';
import { AcresTreatedComponent } from '../acres-treated/acres-treated.component';
import { TreatmentSummaryButtonComponent } from '../treatment-summary-button/treatment-summary-button.component';

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
          AcresTreatedComponent
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
