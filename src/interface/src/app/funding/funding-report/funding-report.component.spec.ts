import {
  ComponentFixture,
  fakeAsync,
  TestBed,
  tick,
  discardPeriodicTasks,
} from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { FundingReportComponent } from './funding-report.component';
import { ActivatedRoute } from '@angular/router';
import { MockProvider } from 'ng-mocks';
import { MapConfigService } from '@app/maplibre-map/map-config.service';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { DataLayersStateService } from '@app/data-layers/data-layers.state.service';
import { BaseLayersStateService } from '@base-layers/base-layers.state.service';
import { of, Subject } from 'rxjs';
import { FundingMapConfigState } from '../funding-map-config-state';
import { FundingModuleService } from '@services/funding-module.service';
import { DataLayersService } from '@app/services';
import { DataLayer, FundingReport, Scenario } from '@types';
import { MatDialog } from '@angular/material/dialog';
import { ScenarioState } from '@scenario/scenario.state';
import { POLLING_INTERVAL } from '@app/plan/plan-helpers';
import { FundingReportService } from '@app/services/funding-report.service';

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
    planning_area_acres: null,
    ...overrides,
  };
}

describe('FundingReportComponent', () => {
  let component: FundingReportComponent;
  let fixture: ComponentFixture<FundingReportComponent>;
  let selectDataLayer: jasmine.Spy;
  let getDataLayerById: jasmine.Spy;
  let getReport: jasmine.Spy;

  beforeEach(async () => {
    selectDataLayer = jasmine.createSpy('selectDataLayer');
    getDataLayerById = jasmine
      .createSpy('getDataLayerById')
      .and.callFake((id: number) =>
        of({ id, name: 'fetched layer' } as DataLayer)
      );
    getReport = jasmine.createSpy('getReport');

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
        MockProvider(FundingReportService, { getReport }),
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

  describe('pollForNewGeoPackage', () => {
    it('sets pollingForGeopackage$ to true immediately on call', fakeAsync(() => {
      getReport.and.returnValue(of({ geopackage_status: 'PENDING' } as any));
      fixture.detectChanges();

      component.pollForNewGeoPackage();

      expect(component.pollingForGeopackage$.value).toBeTrue();

      discardPeriodicTasks();
    }));

    it('calls fundingReportService.getReport with the report scenario on each tick', fakeAsync(() => {
      getReport.and.returnValue(of({ geopackage_status: 'PENDING' } as any));
      fixture.detectChanges();

      component.pollForNewGeoPackage();
      tick(POLLING_INTERVAL);
      tick(POLLING_INTERVAL);

      expect(getReport).toHaveBeenCalledWith(component.report.scenario);
      expect(getReport).toHaveBeenCalledTimes(2);

      discardPeriodicTasks();
    }));

    it('stops polling and resets the flag once status is SUCCEEDED', fakeAsync(() => {
      getReport.and.returnValues(
        of({ geopackage_status: 'PENDING' } as any),
        of({ geopackage_status: 'SUCCEEDED' } as any)
      );
      fixture.detectChanges();

      component.pollForNewGeoPackage();
      tick(POLLING_INTERVAL); // PENDING
      tick(POLLING_INTERVAL); // SUCCEEDED -> should complete

      expect(getReport).toHaveBeenCalledTimes(2);
      expect(component.pollingForGeopackage$.value).toBeFalse();

      // no further ticks should trigger additional calls
      tick(POLLING_INTERVAL);
      expect(getReport).toHaveBeenCalledTimes(2);
    }));

    it('stops polling and resets the flag once status is FAILED', fakeAsync(() => {
      getReport.and.returnValue(of({ geopackage_status: 'FAILED' } as any));
      fixture.detectChanges();

      component.pollForNewGeoPackage();
      tick(POLLING_INTERVAL);

      expect(getReport).toHaveBeenCalledTimes(1);
      expect(component.pollingForGeopackage$.value).toBeFalse();
    }));

    it('resets pollingForGeopackage$ to false on completion even mid-poll', fakeAsync(() => {
      getReport.and.returnValue(of({ geopackage_status: 'SUCCEEDED' } as any));
      fixture.detectChanges();

      component.pollForNewGeoPackage();
      tick(POLLING_INTERVAL);

      expect(component.pollingForGeopackage$.value).toBeFalse();
    }));

    it('ignores overlapping ticks while a request is still in flight (exhaustMap)', fakeAsync(() => {
      const inFlight = new Subject<any>();
      getReport.and.returnValue(inFlight.asObservable());
      fixture.detectChanges();

      component.pollForNewGeoPackage();
      tick(POLLING_INTERVAL); // first request starts, still pending

      // a second interval elapses while the first call hasn't resolved
      tick(POLLING_INTERVAL);

      // exhaustMap should not have started a second request yet
      expect(getReport).toHaveBeenCalledTimes(1);

      inFlight.next({ geopackage_status: 'SUCCEEDED' } as any);
      inFlight.complete();
      tick();

      expect(component.pollingForGeopackage$.value).toBeFalse();
    }));
  });
});
