import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FullReportViewComponent } from './full-report-view.component';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { MockProvider } from 'ng-mocks';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { ActivatedRoute, Router } from '@angular/router';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { BehaviorSubject, of } from 'rxjs';
import { ScenarioState } from '@scenario/scenario.state';
import { MOCK_SCENARIO } from '@app/services/mocks';
import { MapConfigService } from '@app/maplibre-map/map-config.service';
import { DataLayersStateService } from '@app/data-layers/data-layers.state.service';
import { BaseLayersStateService } from '@base-layers/base-layers.state.service';
import { FundingMapConfigState } from '../funding-map-config-state';
import { MapConfigState } from '@app/maplibre-map/map-config.state';
import { FundingReportService } from '@services/funding-report.service';
import { FundingReport, FundingReportAETSummary } from '@types';

describe('FullReportViewComponent', () => {
  let component: FullReportViewComponent;
  let fixture: ComponentFixture<FullReportViewComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        NoopAnimationsModule,
        FullReportViewComponent,
        HttpClientTestingModule,
        MatSnackBarModule,
      ],
      providers: [
        MockProvider(DataLayersStateService, {
          dataTree$: of(null),
          paths$: of([]),
          viewedDataLayer$: of(null),
          loadingLayer$: of(false),
        }),
        MockProvider(BaseLayersStateService, {
          selectedBaseLayers$: of([]),
          loadingLayers$: of([]),
        }),
        MockProvider(FundingMapConfigState, { selectedProjectAreas$: of([]) }),
        MockProvider(MapConfigState),
        MockProvider(MapConfigService),
        MockProvider(ScenarioState, {
          currentScenarioId$: new BehaviorSubject<number | null>(null),
          currentScenario$: new BehaviorSubject(MOCK_SCENARIO),
          currentScenarioResource$: new BehaviorSubject({
            isLoading: false,
            data: MOCK_SCENARIO,
          }),
        }),
        { provide: ActivatedRoute, useValue: { firstChild: {} } },
        {
          provide: Router,
          useValue: jasmine.createSpyObj('Router', ['navigate']),
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(FullReportViewComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

describe('FullReportViewComponent recalculations', () => {
  let component: FullReportViewComponent;

  const baseReport: FundingReport = {
    status: 'SUCCESS',
    geopackage_status: null,
    geopackage_url: null,
    created_at: '2026-01-01T00:00:00Z',
    created_by: 1,
    updated_at: '2026-01-01T00:00:00Z',
    id: 1,
    scenario: 123,
    treatment_datalayer: null,
    aet_datalayer: null,
    results: {
      summary: {
        POTENTIAL_SMOKE: [{ year: 0, value: 1, baseline: 1, delta: 0 }],
        ABOVEGROUND_TOTAL: [{ year: 0, value: 1, baseline: 1, delta: 0 }],
        TOTAL_FLAME_SEVERITY: {
          '7_4': [{ year: 0, value: 1, baseline: 1, delta: 0 }],
        },
        AET: {
          percentage: 10,
          improved_acres: 5,
          total_project_area_acres: 100,
          improved_area_percent: 5,
        },
      },
      projects: {
        POTENTIAL_SMOKE: [],
        ABOVEGROUND_TOTAL: [],
        TOTAL_FLAME_SEVERITY: {
          '7_4': [
            {
              project_id: 1,
              proj_id: 1,
              year: 0,
              value: 1,
              baseline: 1,
              delta: 0,
            },
          ],
        },
      },
    },
  };

  const waterResponse: FundingReportAETSummary = {
    percentage: 25,
    improved_acres: 50,
    total_project_area_acres: 100,
    improved_area_percent: 50,
  };

  let fixture: ComponentFixture<FullReportViewComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        NoopAnimationsModule,
        FullReportViewComponent,
        HttpClientTestingModule,
        MatSnackBarModule,
      ],
      providers: [
        MockProvider(DataLayersStateService, {
          dataTree$: of(null),
          paths$: of([]),
          viewedDataLayer$: of(null),
          loadingLayer$: of(false),
        }),
        MockProvider(BaseLayersStateService, {
          selectedBaseLayers$: of([]),
          loadingLayers$: of([]),
        }),
        MockProvider(FundingMapConfigState, {
          selectedProjectAreas$: of([]),
          opacity$: of(1),
        }),
        MockProvider(MapConfigState),
        MockProvider(MapConfigService),
        MockProvider(ScenarioState, {
          currentScenarioId$: new BehaviorSubject<number | null>(123),
          currentScenario$: new BehaviorSubject(MOCK_SCENARIO),
          currentScenarioResource$: new BehaviorSubject({
            isLoading: false,
            data: MOCK_SCENARIO,
          }),
        }),
        MockProvider(FundingReportService, {
          getReport: () => of(baseReport),
          getWaterAvailability: () => of(waterResponse),
        }),
        { provide: ActivatedRoute, useValue: { firstChild: {} } },
        {
          provide: Router,
          useValue: jasmine.createSpyObj('Router', ['navigate']),
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(FullReportViewComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  /**
   * Subscribes to `report$` and returns a getter for its latest value. The
   * subscription stays open, so the returned getter reflects re-emissions
   * triggered by `updateWaterAvailability` (synchronous with the mocked deps).
   */
  function trackReport(): () => FundingReport {
    let report!: FundingReport;
    component.report$.subscribe((r) => (report = r as FundingReport));
    return () => report;
  }

  it('patches only summary.AET on a water recalculation, never the projects', () => {
    const report = trackReport();
    component.updateWaterAvailability(25);

    expect(report().results?.summary.AET).toEqual(waterResponse);
    // Water never touches the per-project breakdown.
    expect(report().results?.projects).toEqual(baseReport.results!.projects);
    expect('AET' in report().results!.projects).toBeFalse();
    // Pre-calculated flame length data is left untouched.
    expect(report().results?.summary.TOTAL_FLAME_SEVERITY).toEqual(
      baseReport.results!.summary.TOTAL_FLAME_SEVERITY
    );
  });
});
