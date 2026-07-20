import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { FundingReportComponent } from './funding-report.component';
import { ActivatedRoute } from '@angular/router';
import { MockProvider } from 'ng-mocks';
import { MapConfigService } from '@app/maplibre-map/map-config.service';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { DataLayersStateService } from '@app/data-layers/data-layers.state.service';
import { BaseLayersStateService } from '@base-layers/base-layers.state.service';
import { of } from 'rxjs';
import { FundingMapConfigState } from '../funding-map-config-state';
import { FundingModuleService } from '@services/funding-module.service';
import { DataLayersService } from '@app/services';
import { DataLayer, FundingReport, Scenario } from '@types';
import { MatDialog } from '@angular/material/dialog';
import { ScenarioState } from '@scenario/scenario.state';

const AET_LAYER_NAME =
  'Percentage change in water availability after treatment';

const EMPTY_DATALAYERS = {
  carbon: [],
  water: [],
  biomass: [],
  wildfire_risk_reduction: [],
};

function makeReport(overrides: Partial<FundingReport> = {}): FundingReport {
  return {
    status: 'SUCCESS',
    created_at: '2026-01-01T00:00:00Z',
    created_by: 1,
    updated_at: '2026-01-01T00:00:00Z',
    id: 1,
    scenario: 123,
    results: null,
    treatment_datalayer: null,
    aet_datalayer: null,
    geopackage_status: null,
    geopackage_url: null,
    ...overrides,
  };
}

describe('FundingReportComponent', () => {
  let component: FundingReportComponent;
  let fixture: ComponentFixture<FundingReportComponent>;
  let selectDataLayer: jasmine.Spy;
  let getDataLayerById: jasmine.Spy;

  beforeEach(async () => {
    selectDataLayer = jasmine.createSpy('selectDataLayer');
    getDataLayerById = jasmine
      .createSpy('getDataLayerById')
      .and.callFake((id: number) =>
        of({ id, name: 'fetched layer' } as DataLayer)
      );

    await TestBed.configureTestingModule({
      imports: [
        FundingReportComponent,
        HttpClientTestingModule,
        MatSnackBarModule,
        NoopAnimationsModule,
      ],
      providers: [
        { provide: ActivatedRoute, useValue: { snapshot: {} } },
        MockProvider(DataLayersStateService, {
          dataTree$: of(null),
          paths$: of([]),
          viewedDataLayer$: of(null),
          loadingLayer$: of(false),
          selectDataLayer,
        }),
        MockProvider(BaseLayersStateService, {
          selectedBaseLayers$: of([]),
          loadingLayers$: of([]),
        }),
        MockProvider(FundingMapConfigState),
        MockProvider(MapConfigService),
        MockProvider(FundingModuleService, {
          loadFundingModule: () =>
            of({ options: { datalayers: EMPTY_DATALAYERS } } as any),
        }),
        MockProvider(DataLayersService, { getDataLayerById }),

        MockProvider(MatDialog),
        MockProvider(ScenarioState, {
          currentScenario$: of({ name: 'Test Scenario' } as Scenario),
        }),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(FundingReportComponent);
    component = fixture.componentInstance;
    component.report = makeReport();
  });

  it('should create', () => {
    fixture.detectChanges();
    expect(component).toBeTruthy();
  });

  it("builds the water section's layer from the report's aet_datalayer with a hardcoded name", () => {
    component.report = makeReport({ aet_datalayer: 42 });
    fixture.detectChanges();

    expect(component.sectionLayers['water']).toEqual([
      { id: 42, name: AET_LAYER_NAME },
    ]);
  });

  it('leaves the water section empty when the report has no aet_datalayer', () => {
    component.report = makeReport({ aet_datalayer: null });
    fixture.detectChanges();

    expect(component.sectionLayers['water']).toEqual([]);
  });

  it('fetches the AET layer by id and shows it when the water layer is selected', () => {
    component.report = makeReport({ aet_datalayer: 42 });
    fixture.detectChanges();

    component.onLayerSelected({ id: 42, name: AET_LAYER_NAME });

    expect(getDataLayerById).toHaveBeenCalledWith(42);
    expect(selectDataLayer).toHaveBeenCalledWith(
      jasmine.objectContaining({ id: 42 })
    );
  });
});
