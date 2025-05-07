import {
  ComponentFixture,
  TestBed,
  discardPeriodicTasks,
  fakeAsync,
  tick,
} from '@angular/core/testing';
import { CreateScenariosComponent } from './create-scenarios.component';
import { MockComponent, MockProvider } from 'ng-mocks';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { CurrencyPipe } from '@angular/common';
import { BehaviorSubject, of } from 'rxjs';

import { ScenarioService, LegacyPlanStateService } from '@services';
import { PlanState } from '../plan.state';
import { ScenarioState } from 'src/app/maplibre-map/scenario.state';

import { SetPrioritiesComponent } from './set-priorities/set-priorities.component';
import { ConstraintsPanelComponent } from './constraints-panel/constraints-panel.component';
import { Scenario } from '@types';
import { MOCK_PLAN } from '@services/mocks';
import * as L from 'leaflet';
import { MatLegacySnackBarModule } from '@angular/material/legacy-snack-bar';
import { FormGroup } from '@angular/forms';

describe('CreateScenariosComponent (Unit)', () => {
  let fixture: ComponentFixture<CreateScenariosComponent>;
  let component: CreateScenariosComponent;

  const currentPlan$ = new BehaviorSubject({
    ...MOCK_PLAN,
    id: 123,
    region_name: 'test-region',
    area_acres: 1000,
    geometry: new L.Polygon([]).toGeoJSON(),
  });

  const currentScenarioId$ = new BehaviorSubject<string | null>(
    'fakeScenarioId'
  );

  const fakeScenario: Scenario = {
    id: 'fakeScenarioId',
    name: 'Test Scenario',
    planning_area: 123,
    configuration: {
      treatment_question: {
        short_question_text: '',
        scenario_priorities: [],
        weights: [],
        stand_thresholds: [],
        global_thresholds: [],
        scenario_output_fields_paths: {},
      },
    },
    status: 'ACTIVE',
    scenario_result: {
      status: 'PENDING',
      completed_at: '',
      result: { features: [], type: 'test' },
    },
  };

  const scenarioServiceSpy = jasmine.createSpyObj<ScenarioService>(
    'ScenarioService',
    ['getScenario', 'getScenariosForPlan']
  );
  scenarioServiceSpy.getScenario.and.returnValue(of(fakeScenario));
  scenarioServiceSpy.getScenariosForPlan.and.returnValue(of([fakeScenario]));

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        HttpClientTestingModule,
        RouterTestingModule,
        BrowserAnimationsModule,
        MatLegacySnackBarModule,
      ],
      declarations: [
        CreateScenariosComponent,
        MockComponent(SetPrioritiesComponent),
        MockComponent(ConstraintsPanelComponent),
      ],
      providers: [
        CurrencyPipe,
        MockProvider(LegacyPlanStateService, {
          updateStateWithScenario: jasmine.createSpy(),
          updateStateWithShapes: jasmine.createSpy(),
          setPlanRegion: jasmine.createSpy(),
        }),
        MockProvider(PlanState, { currentPlan$ } as any),
        MockProvider(ScenarioState, {
          currentScenarioId$,
          reloadScenario: jasmine.createSpy(),
        } as any),
        { provide: ScenarioService, useValue: scenarioServiceSpy },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(CreateScenariosComponent);
    component = fixture.componentInstance;
    // Reset scenarioId on each test
    currentScenarioId$.next('fakeScenarioId');
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should call loadConfig and pollForChanges if scenarioId exists', () => {
    spyOn(component as any, 'loadConfig');
    spyOn(component as any, 'pollForChanges');

    fixture.detectChanges();

    expect((component as any).loadConfig).toHaveBeenCalled();
    expect((component as any).pollForChanges).toHaveBeenCalled();
  });

  it('should not call loadConfig or pollForChanges if scenarioId is null', () => {
    currentScenarioId$.next(null);

    spyOn(component as any, 'loadConfig');
    spyOn(component as any, 'pollForChanges');

    fixture.detectChanges();

    expect((component as any).loadConfig).not.toHaveBeenCalled();
    expect((component as any).pollForChanges).not.toHaveBeenCalled();
    expect(component.selectedTab).toBe(0); // ScenarioTabs.CONFIG
  });

  it('should call setFormData on constraints and priorities if available', fakeAsync(() => {
    const constraintsSpy = jasmine.createSpy('setFormData');
    const prioritiesSpy = jasmine.createSpy('setFormData');

    // Mocking priorities and constrains component
    (component as any).prioritiesComponent = {
      setFormData: prioritiesSpy,
      createForm: () => new FormGroup({}),
    };
    (component as any).constraintsPanelComponent = {
      setFormData: constraintsSpy,
      createForm: () => new FormGroup({}),
    };

    fixture.detectChanges();
    tick();

    expect(constraintsSpy).toHaveBeenCalledWith(fakeScenario.configuration);
    expect(prioritiesSpy).toHaveBeenCalledWith(
      fakeScenario.configuration.treatment_question
    );

    discardPeriodicTasks();
  }));

  it('loadConfig should update scenarioState and call setFormData', fakeAsync(() => {
    const constraintsSpy = jasmine.createSpy('setFormData');
    const prioritiesSpy = jasmine.createSpy('setFormData');

    // Mocking priorities and constrains component
    (component as any).prioritiesComponent = {
      setFormData: prioritiesSpy,
      createForm: () => new FormGroup({}),
    };
    (component as any).constraintsPanelComponent = {
      setFormData: constraintsSpy,
      createForm: () => new FormGroup({}),
    };

    (component as any).scenarioState$.next('NOT_STARTED');

    component.loadConfig();
    tick();

    expect(component.scenarioId).toBe(fakeScenario.id);
    expect(component.scenarioName).toBe(fakeScenario.name);
    expect(component.scenarioState$.value).toBe('PENDING');
    expect(prioritiesSpy).toHaveBeenCalled();
    expect(constraintsSpy).toHaveBeenCalled();
  }));

  describe('convertSingleGeoJsonToGeoJsonArray', () => {
    beforeEach(() => {
      // spy on polling to avoid dealing with async and timeouts
      spyOn(component, 'pollForChanges');
      fixture.detectChanges();
    });

    it('converts a geojson with multiple multipolygons into geojsons', () => {
      const testMultiGeoJson: GeoJSON.GeoJSON = {
        type: 'FeatureCollection',
        features: [
          {
            type: 'Feature',
            geometry: {
              type: 'MultiPolygon',
              coordinates: [
                [
                  [
                    [-120.48760442258875, 38.86069261999541],
                    [-120.25134738486939, 38.63563031791014],
                    [-120.68265831280989, 38.65924332885403],
                    [-120.48760442258875, 38.86069261999541],
                  ],
                ],
                [
                  [
                    [-120.08926185006236, 38.70429439806091],
                    [-119.83102710804575, 38.575493119820806],
                    [-120.02882494064228, 38.56474992770867],
                    [-120.12497630750148, 38.59268150226389],
                    [-120.08926185006236, 38.70429439806091],
                  ],
                ],
                [
                  [
                    [-120.32277500514876, 38.59483057427002],
                    [-120.19090826710838, 38.65494898256424],
                    [-120.1947892445163, 38.584354895060606],
                    [-120.25934844928075, 38.55964521088927],
                    [-120.32277500514876, 38.59483057427002],
                  ],
                ],
              ],
            },
            properties: {},
          },
          {
            type: 'Feature',
            properties: {},
            geometry: {
              type: 'Polygon',
              coordinates: [
                [
                  [-120.399442, 38.957252],
                  [-120.646674, 38.631876],
                  [-120.020352, 38.651183],
                  [-120.07804, 38.818293],
                  [-120.306043, 38.79689],
                  [-120.399442, 38.957252],
                ],
              ],
            },
          },
        ],
      };

      const result =
        component.convertSingleGeoJsonToGeoJsonArray(testMultiGeoJson);

      expect(result).toEqual([
        {
          type: 'FeatureCollection',
          features: [
            {
              type: 'Feature',
              geometry: {
                type: 'MultiPolygon',
                coordinates: [
                  [
                    [
                      [-120.48760442258875, 38.86069261999541],
                      [-120.25134738486939, 38.63563031791014],
                      [-120.68265831280989, 38.65924332885403],
                      [-120.48760442258875, 38.86069261999541],
                    ],
                  ],
                  [
                    [
                      [-120.08926185006236, 38.70429439806091],
                      [-119.83102710804575, 38.575493119820806],
                      [-120.02882494064228, 38.56474992770867],
                      [-120.12497630750148, 38.59268150226389],
                      [-120.08926185006236, 38.70429439806091],
                    ],
                  ],
                  [
                    [
                      [-120.32277500514876, 38.59483057427002],
                      [-120.19090826710838, 38.65494898256424],
                      [-120.1947892445163, 38.584354895060606],
                      [-120.25934844928075, 38.55964521088927],
                      [-120.32277500514876, 38.59483057427002],
                    ],
                  ],
                ],
              },
              properties: {},
            },
          ],
        },
        {
          type: 'FeatureCollection',
          features: [
            {
              type: 'Feature',
              properties: {},
              geometry: {
                type: 'Polygon',
                coordinates: [
                  [
                    [-120.399442, 38.957252],
                    [-120.646674, 38.631876],
                    [-120.020352, 38.651183],
                    [-120.07804, 38.818293],
                    [-120.306043, 38.79689],
                    [-120.399442, 38.957252],
                  ],
                ],
              },
            },
          ],
        },
      ]);
    });
  });
});
