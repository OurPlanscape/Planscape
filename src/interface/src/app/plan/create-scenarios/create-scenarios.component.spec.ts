import { HttpClientTestingModule } from '@angular/common/http/testing';
import {
  ComponentFixture,
  discardPeriodicTasks,
  fakeAsync,
  flush,
  TestBed,
  tick,
} from '@angular/core/testing';
import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { BehaviorSubject, of } from 'rxjs';

import {
  Scenario,
  ScenarioResultStatus,
  TreatmentGoalConfig,
  TreatmentQuestionConfig,
} from '@types';

import { PlanModule } from '../plan.module';
import { CreateScenariosLegacyComponent } from './create-scenarios.component';
import { HarnessLoader } from '@angular/cdk/testing';
import { MatLegacyButtonHarness as MatButtonHarness } from '@angular/material/legacy-button/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { POLLING_INTERVAL } from '../plan-helpers';
import {
  LegacyPlanState,
  LegacyPlanStateService,
  ScenarioService,
} from '@services';
import { CurrencyPipe } from '@angular/common';
import * as L from 'leaflet';
import { MOCK_PLAN } from '@services/mocks';

//TODO Add the following tests once implementation for tested behaviors is added:
/**
 * 'configures proper priorities and weights based on chosen treatment question'
 * 'creates Project Areas when user uploads Project Area shapefile'
 */

describe('CreateScenariosLegacyComponent', () => {
  let component: CreateScenariosLegacyComponent;
  let fixture: ComponentFixture<CreateScenariosLegacyComponent>;
  let fakeLegacyPlanStateService: LegacyPlanStateService;

  let loader: HarnessLoader;
  let defaultSelectedQuestion: TreatmentQuestionConfig = {
    short_question_text: '',
    scenario_output_fields_paths: {},
    scenario_priorities: [''],
    stand_thresholds: [''],
    global_thresholds: [''],
    weights: [0],
  };
  let fakeScenario: Scenario = {
    id: '1',
    name: 'name',
    planning_area: 1,
    configuration: {
      max_budget: 100,
    },
    status: 'ACTIVE',
    scenario_result: {
      status: 'PENDING',
      completed_at: '0',
      result: {
        features: [],
        type: 'test',
      },
    },
  };

  let fakePlanState$: BehaviorSubject<LegacyPlanState>;
  let fakeGetScenario: BehaviorSubject<Scenario>;

  beforeEach(async () => {
    fakePlanState$ = new BehaviorSubject<LegacyPlanState>({
      all: {
        '1': {
          ...MOCK_PLAN,
          area_acres: 12814,
          area_m2: 340000,
          geometry: new L.Polygon([
            new L.LatLng(38.715517043571914, -120.42857302225725),
            new L.LatLng(38.47079787227401, -120.5164425608172),
            new L.LatLng(38.52668443555346, -120.11828371421737),
          ]).toGeoJSON(),
        },
      },
      currentPlanId: 1,
      currentScenarioId: null,
      currentScenarioName: null,
      mapConditionLayer: null,
      mapShapes: null,
      legendUnits: null,
    });

    fakeGetScenario = new BehaviorSubject(fakeScenario);

    const demoScenario: Scenario = {
        id: '1',
        name: 'name',
        planning_area: 1,
        configuration: {
          max_budget: 200,
        },
        status: 'ACTIVE',
      },
      fakeScenarioService = jasmine.createSpyObj<ScenarioService>(
        'ScenarioService',
        {
          createScenario: of(demoScenario),
          getScenario: of(fakeScenario),
          getScenariosForPlan: of([demoScenario]),
          getExcludedAreas: new BehaviorSubject([]),
        }
      );
    fakeLegacyPlanStateService = jasmine.createSpyObj<LegacyPlanStateService>(
      'LegacyPlanStateService',
      {
        getScenario: fakeGetScenario,
        updateStateWithShapes: undefined,
        updateStateWithScenario: undefined,
      },
      {
        planState$: fakePlanState$,
        setPlanRegion: () => {},
        treatmentGoalsConfig$: new BehaviorSubject<
          TreatmentGoalConfig[] | null
        >([
          {
            category_name: 'test_category',
            questions: [
              {
                short_question_text: 'test_question',
                scenario_output_fields_paths: {},
                scenario_priorities: [''],
                stand_thresholds: [''],
                global_thresholds: [''],
                weights: [1],
              },
            ],
          },
        ]),
      }
    );

    await TestBed.configureTestingModule({
      imports: [
        BrowserAnimationsModule,
        HttpClientTestingModule,
        PlanModule,
        RouterTestingModule,
      ],
      declarations: [CreateScenariosLegacyComponent],
      providers: [
        CurrencyPipe,
        {
          provide: LegacyPlanStateService,
          useValue: fakeLegacyPlanStateService,
        },
        { provide: ScenarioService, useValue: fakeScenarioService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(CreateScenariosLegacyComponent);
    component = fixture.componentInstance;
    await component.constraintsPanelComponent.createForm();
    loader = TestbedHarnessEnvironment.loader(fixture);
  });

  it('should create', () => {
    spyOn(component, 'pollForChanges');
    fixture.detectChanges();
    expect(component).toBeTruthy();
  });

  it('should load existing scenario', async () => {
    const scenarioId = 'fakeScenarioId';
    fakePlanState$.next({
      ...fakePlanState$.value,
      ...{ currentScenarioId: scenarioId },
    });

    spyOn(component, 'pollForChanges');
    fixture.detectChanges();
    await fixture.whenStable();

    expect(fakeLegacyPlanStateService.getScenario).toHaveBeenCalledOnceWith(
      scenarioId
    );

    const value = component.constrainsForm?.get('budgetForm.maxCost')?.value;
    expect(value).toEqual(100);
  });

  describe('max area constraint validation', () => {
    beforeEach(fakeAsync(() => {
      spyOn(component, 'pollForChanges');
    }));

    it('should mark the form invalid if max_area is too small', fakeAsync(() => {
      fixture.detectChanges();
      tick();

      component.scenarioNameFormField?.setValue('Test Scenario');
      component.prioritiesComponent.setFormData(defaultSelectedQuestion);

      // Small area
      component.constraintsPanelComponent.setFormData({
        max_slope: 1,
        min_distance_from_road: 1,
        max_area: 10,
      });

      component.forms.updateValueAndValidity();
      expect(component.forms.valid).toBeFalse();

      // Cleaning timeouts and subscriptions
      flush();
      discardPeriodicTasks();
      fixture.destroy();
    }));

    it('should mark the form invalid if max_area is too big', fakeAsync(() => {
      fixture.detectChanges();
      tick();

      component.scenarioNameFormField?.setValue('Test Scenario');
      component.prioritiesComponent.setFormData(defaultSelectedQuestion);

      // Big area
      component.constraintsPanelComponent.setFormData({
        max_slope: 1,
        min_distance_from_road: 1,
        max_area: 9999999999,
      });

      component.forms.updateValueAndValidity();
      expect(component.forms.valid).toBeFalse();

      // Cleaning timeouts and subscriptions
      flush();
      discardPeriodicTasks();
      fixture.destroy();
    }));

    it('should mark the form valid if max_area is within allowed range', fakeAsync(async () => {
      component.constraintsPanelComponent.planningAreaAcres = 12814;

      await component.constraintsPanelComponent.loadExcludedAreas();

      component.constraintsPanelComponent.ngOnChanges({
        planningAreaAcres: {
          previousValue: 0,
          currentValue: 12814,
          firstChange: true,
          isFirstChange: () => true,
        },
      });

      fixture.detectChanges();
      tick();

      component.scenarioNameFormField?.setValue('Test Scenario');
      component.prioritiesComponent.setFormData(defaultSelectedQuestion);

      component.constraintsPanelComponent.setFormData({
        max_slope: 1,
        min_distance_from_road: 1,
        max_area: 3000,
      });

      component.forms.updateValueAndValidity();
      fixture.detectChanges();

      expect(component.forms.valid).toBeTrue();

      // Cleaning timeouts and subscriptions
      flush();
      discardPeriodicTasks();
      fixture.destroy();
    }));
  });

  describe('generate button', () => {
    beforeEach(() => {
      // spy on polling to avoid dealing with async and timeouts
      spyOn(component, 'pollForChanges');
      fixture.detectChanges();
      component.selectedTab = 0;
    });

    it('should emit create scenario event on Generate button click', async () => {
      spyOn(component, 'createScenario');

      fixture.detectChanges();
      await fixture.whenStable();

      component.scenarioNameFormField?.setValue('scenarioName');
      component.scenarioNameFormField?.markAsDirty();

      component.prioritiesComponent.setFormData(defaultSelectedQuestion);

      component.constraintsPanelComponent.setFormData({
        max_slope: 1,
        min_distance_from_road: 1,
        max_area: 3000,
      });

      component.forms.updateValueAndValidity();
      fixture.detectChanges();

      const buttonHarness = await loader.getHarness(
        MatButtonHarness.with({ text: /GENERATE/ })
      );

      expect(await buttonHarness.isDisabled()).toBeFalse();

      await buttonHarness.click();

      expect(component.createScenario).toHaveBeenCalled();
    });

    it('should disable Generate button if form is invalid', async () => {
      const buttonHarness: MatButtonHarness = await loader.getHarness(
        MatButtonHarness.with({ text: /GENERATE/ })
      );
      component.prioritiesForm?.markAsDirty();
      component.constrainsForm
        ?.get('physicalConstraintForm.minDistanceFromRoad')
        ?.setValue(-1);
      fixture.detectChanges();

      // Click on "GENERATE SCENARIO" button
      await buttonHarness.click();

      expect(await buttonHarness.isDisabled()).toBeTrue();
    });

    it('should enable Generate button if form is valid', async () => {
      const buttonHarness: MatButtonHarness = await loader.getHarness(
        MatButtonHarness.with({ text: /GENERATE/ })
      );
      component.scenarioNameFormField?.setValue('scenarioName');
      component.prioritiesComponent?.setFormData(defaultSelectedQuestion);

      component.constraintsPanelComponent.setFormData({
        max_slope: 1,
        min_distance_from_road: 1,
        max_area: 3000,
      });

      component.generatingScenario = false;
      fixture.detectChanges();

      expect(await buttonHarness.isDisabled()).toBeFalse();
    });
  });

  // TODO Re-enable when support for uploading project areas in implemented
  // it('update plan state when "identify project areas" form inputs change', () => {
  //   const generateAreas = component.formGroups[3].get('generateAreas');
  //   const uploadedArea = component.formGroups[3].get('uploadedArea');

  //   // Set "generate areas automatically" to true
  //   generateAreas?.setValue(true);

  //   expect(fakePlanService.updateStateWithShapes).toHaveBeenCalledWith(null);

  //   // Add an uploaded area and set "generate areas automatically" to false
  //   generateAreas?.setValue(false);
  //   uploadedArea?.setValue('testvalue');

  //   expect(fakePlanService.updateStateWithShapes).toHaveBeenCalledWith(
  //     'testvalue'
  //   );
  // });

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

  describe('polling', () => {
    beforeEach(() => {
      spyOn(component, 'loadConfig').and.callThrough();
    });

    it('should poll for changes if status is pending', fakeAsync(() => {
      setupPollingScenario(component, 'PENDING');

      fixture.detectChanges();
      tick();
      expect(component.loadConfig).toHaveBeenCalledTimes(1);

      tick(POLLING_INTERVAL);
      fixture.detectChanges();

      expect(component.loadConfig).toHaveBeenCalledTimes(2);

      discardPeriodicTasks();
      fixture.destroy();
    }));

    it('should not poll for changes if status is not pending', fakeAsync(() => {
      setupPollingScenario(component, 'SUCCESS');

      fixture.detectChanges();
      tick();

      expect(component.loadConfig).toHaveBeenCalledTimes(1);

      tick(POLLING_INTERVAL);
      fixture.detectChanges();

      expect(component.loadConfig).toHaveBeenCalledTimes(1);

      discardPeriodicTasks();
      fixture.destroy();
    }));
  });

  function setupPollingScenario(
    component: CreateScenariosLegacyComponent,
    status: ScenarioResultStatus
  ) {
    fakePlanState$.next({
      ...fakePlanState$.value,
      currentScenarioId: 'fakeScenarioId',
    });

    fakeGetScenario.next({
      ...fakeScenario,
      scenario_result: {
        ...fakeScenario.scenario_result!,
        status,
      },
    });

    component.scenarioId = 'fakeScenarioId';
  }
});
