import { HttpClientTestingModule } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { BehaviorSubject, of } from 'rxjs';
import { PlanService, PlanState } from 'src/app/services';
import {
  Region,
  Scenario,
  TreatmentGoalConfig,
  TreatmentQuestionConfig,
} from 'src/app/types';

import { PlanModule } from '../plan.module';
import { CreateScenariosComponent } from './create-scenarios.component';
import { HarnessLoader } from '@angular/cdk/testing';
import { MatButtonHarness } from '@angular/material/button/testing';
import { RouterTestingModule } from '@angular/router/testing';

//TODO Add the following tests once implementation for tested behaviors is added:
/**
 * 'configures proper priorities and weights based on chosen treatment question'
 * 'creates scenario when createScenario is called'
 * 'creates Project Areas when user uploads Project Area shapefile'
 */

describe('CreateScenariosComponent', () => {
  let component: CreateScenariosComponent;
  let fixture: ComponentFixture<CreateScenariosComponent>;
  let fakePlanService: PlanService;

  let loader: HarnessLoader;
  let defaultSelectedQuestion: TreatmentQuestionConfig = {
    short_question_text: '',
    scenario_output_fields: [''],
    scenario_priorities: [''],
    stand_thresholds: [''],
    global_thresholds: [''],
    weights: [0],
  };
  let fakeScenario: Scenario = {
    name: 'name',
    planning_area: '1',
    configuration: {},
  };

  beforeEach(async () => {
    fakePlanService = jasmine.createSpyObj<PlanService>(
      'PlanService',
      {
        getConditionScoresForPlanningArea: of(),
        getProject: of({
          id: 1,
          maxBudget: 100,
        }),
        updateProject: of(1),
        createProjectArea: of(1),
        createScenario: of('1'),
        getScenario: of(fakeScenario),
        updateStateWithShapes: undefined,
      },
      {
        planState$: new BehaviorSubject<PlanState>({
          all: {
            '1': {
              id: '1',
              ownerId: 'fakeowner',
              name: 'testplan',
              region: Region.SIERRA_NEVADA,
            },
          },
          currentPlanId: '1',
          currentConfigId: 1,
          currentScenarioId: '1',
          mapConditionLayer: null,
          mapShapes: null,
        }),
        setPlanRegion: () => {},
        treatmentGoalsConfig$: new BehaviorSubject<
          TreatmentGoalConfig[] | null
        >([
          {
            category_name: 'test_category',
            questions: [
              {
                short_question_text: 'test_question',
                scenario_output_fields: [''],
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
      declarations: [CreateScenariosComponent],
      providers: [{ provide: PlanService, useValue: fakePlanService }],
    }).compileComponents();

    fixture = TestBed.createComponent(CreateScenariosComponent);
    component = fixture.componentInstance;
    loader = TestbedHarnessEnvironment.loader(fixture);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should load existing scenario', () => {
    expect(fakePlanService.getScenario).toHaveBeenCalledOnceWith('1');
    component.formGroups[2].valueChanges.subscribe((_) => {
      expect(component.formGroups[2].get('budgetForm.maxCost')?.value).toEqual(
        100
      );
    });
  });

  it('should emit create scenario event on Generate button click', async () => {
    spyOn(component, 'createScenario');
    component.formGroups[0].get('scenarioName')?.setValue('scenarioName');
    component.formGroups[1]
      .get('selectedQuestion')
      ?.setValue(defaultSelectedQuestion);
    component.formGroups[2].get('physicalConstraintForm.maxSlope')?.setValue(1);
    component.formGroups[2]
      .get('physicalConstraintForm.minDistanceFromRoad')
      ?.setValue(1);
    component.formGroups[2].get('physicalConstraintForm.maxArea')?.setValue(1);
    fixture.detectChanges();

    const buttonHarness: MatButtonHarness = await loader.getHarness(
      MatButtonHarness.with({ text: /GENERATE/ })
    );

    // Click on "GENERATE SCENARIO" button
    await buttonHarness.click();

    expect(component.createScenario).toHaveBeenCalled();
  });

  it('should disable Generate button if form is invalid', async () => {
    const buttonHarness: MatButtonHarness = await loader.getHarness(
      MatButtonHarness.with({ text: /GENERATE/ })
    );
    component.formGroups[1].markAsDirty();
    component.formGroups[2]
      .get('physicalConstraintForm.minDistanceFromRoad')
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
    component.formGroups[0].get('scenarioName')?.setValue('scenarioName');
    component.formGroups[1]
      .get('selectedQuestion')
      ?.setValue(defaultSelectedQuestion);
    component.formGroups[2].get('physicalConstraintForm.maxSlope')?.setValue(1);
    component.formGroups[2]
      .get('physicalConstraintForm.minDistanceFromRoad')
      ?.setValue(1);
    component.formGroups[2].get('physicalConstraintForm.maxArea')?.setValue(1);
    component.generatingScenario = false;
    fixture.detectChanges();

    expect(await buttonHarness.isDisabled()).toBeFalse();
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
