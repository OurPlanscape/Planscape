import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { NgxMaskModule } from 'ngx-mask';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { ActivatedRoute } from '@angular/router';
import { StepperSelectionEvent } from '@angular/cdk/stepper';
import { By } from '@angular/platform-browser';
import {
  BehaviorSubject,
  EMPTY,
  firstValueFrom,
  Observable,
  of,
  Subject,
} from 'rxjs';
import { MockComponents, MockModule, MockProvider } from 'ng-mocks';

import { ScenarioCreationComponent } from './scenario-creation.component';
import { FeaturesModule } from '@features/features.module';
import { overrideFeatureFlags } from '@features/testing';
import { SharedModule } from '@shared';
import { ScenarioService } from '@services';
import { ScenarioState } from '@scenario/scenario.state';
import { DataLayersStateService } from '@app/data-layers/data-layers.state.service';
import { NewScenarioState } from './new-scenario.state';
import { AvailableStands, DataLayer, Scenario, ScenarioV3Config } from '@types';
import {
  ScenarioStepConfig,
  SUB_UNITS_STEP,
  TREATMENT_GOAL_STEP_LABEL,
} from '@app/scenario/scenario.constants';
import { MOCK_SCENARIO } from '@services/mocks';

import { Step1WithOverviewComponent } from '@scenario-creation/step1-with-overview/step1-with-overview.component';
import { DataLayersComponent } from '@data-layers/data-layers/data-layers.component';
import { StandLevelConstraintsComponent } from '@scenario-creation/step3/stand-level-constraints.component';
import { TreatmentTargetComponent } from '@scenario-creation/treatment-target/treatment-target.component';
import { BaseLayersComponent } from '@base-layers/base-layers/base-layers.component';
import { ScenarioMapComponent } from '@maplibre-map/scenario-map/scenario-map.component';
import { FeatureService } from '@app/features/feature.service';
import { PlanState } from '@plan/plan.state';
import { WorkspaceState } from '@app/workspaces/workspace.state';
import { SHOW_FAVORITE_STAR } from '@data-layers/favorite-star/favorite-star.token';

describe('ScenarioCreationComponent', () => {
  let component: ScenarioCreationComponent;
  let fixture: ComponentFixture<ScenarioCreationComponent>;
  let setWorkspaceId: jasmine.Spy;
  let resetWorkspaceId: jasmine.Spy;

  async function setUpComponent(
    options: {
      flags?: string[];
      currentScenario$?: Observable<Scenario>;
      scenarioConfig$?: Observable<ScenarioV3Config>;
      currentStep$?: Observable<ScenarioStepConfig | null>;
      currentPlanWorkspaceId$?: Observable<number | null>;
    } = {}
  ) {
    const {
      flags = [],
      currentScenario$ = of(MOCK_SCENARIO),
      scenarioConfig$ = of({} as ScenarioV3Config),
      currentStep$ = of(null),
      currentPlanWorkspaceId$ = EMPTY,
    } = options;

    TestBed.resetTestingModule();

    await TestBed.configureTestingModule({
      imports: [
        FeatureService,
        HttpClientTestingModule,
        ScenarioCreationComponent,
        NgxMaskModule.forRoot(),
        NoopAnimationsModule,
        MatSnackBarModule,
        FeaturesModule,
        MockModule(SharedModule),
        MockComponents(
          Step1WithOverviewComponent,
          DataLayersComponent,
          StandLevelConstraintsComponent,
          TreatmentTargetComponent,
          BaseLayersComponent,
          ScenarioMapComponent
        ),
      ],
      providers: [
        MockProvider(ActivatedRoute, {
          snapshot: { data: { planId: 24 } } as any,
        }),
        MockProvider(ScenarioService),
        MockProvider(ScenarioState, { currentScenario$ }),
        MockProvider(DataLayersStateService, {
          paths$: of([]),
          viewedDataLayer$: of(null),
        }),
        MockProvider(NewScenarioState, {
          availableStands$: of({ summary: {} } as AvailableStands),
          currentStep$,
          scenarioConfig$,
          priorityObjectivesDetails$: of([]),
        }),
        MockProvider(PlanState, {
          currentPlanWorkspaceId$,
          currentPlan$: EMPTY,
        }),
      ],
    }).compileComponents();

    overrideFeatureFlags(); // explicit clear, no args
    overrideFeatureFlags(...flags);

    setWorkspaceId = spyOn(TestBed.inject(WorkspaceState), 'setWorkspaceId');
    resetWorkspaceId = spyOn(
      TestBed.inject(WorkspaceState),
      'resetWorkspaceId'
    );

    fixture = TestBed.createComponent(ScenarioCreationComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  beforeEach(async () => {
    await setUpComponent();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('does not invite favoriting while a scenario is being configured', () => {
    expect(fixture.debugElement.injector.get(SHOW_FAVORITE_STAR)).toBeFalse();
  });

  describe('the overview shared by the steps', () => {
    let currentStep$: BehaviorSubject<ScenarioStepConfig | null>;

    async function setUpOnStep(
      step: Partial<ScenarioStepConfig>,
      flags: string[] = []
    ) {
      currentStep$ = new BehaviorSubject<ScenarioStepConfig | null>(null);
      await setUpComponent({ flags, currentStep$ });
      currentStep$.next(step as ScenarioStepConfig);
    }

    function isShown() {
      fixture.detectChanges();
      return !!fixture.debugElement.query(By.css('app-scenario-summary'));
    }

    it('is drawn on the steps that have a map', async () => {
      await setUpOnStep({ label: 'Include Areas', hasMap: true });
      expect(isShown()).toBeTrue();
    });

    it('is left out of the steps that have no map', async () => {
      await setUpOnStep({ label: 'Include Areas', hasMap: false });

      expect(isShown()).toBeFalse();
    });

    it('leaves the treatment goal step to itself once the flag is on', async () => {
      await setUpOnStep({ label: TREATMENT_GOAL_STEP_LABEL, hasMap: true }, [
        'IMPROVED_TREATMENT_GOAL',
      ]);

      expect(isShown()).toBeFalse();
    });

    it('still covers the treatment goal step while the flag is off', async () => {
      await setUpOnStep({ label: TREATMENT_GOAL_STEP_LABEL, hasMap: true });

      expect(isShown()).toBeTrue();
    });
  });

  describe('the layer controls the shell puts around the map', () => {
    const drawnLayer = { id: 3, name: 'Fire Severity' } as DataLayer;

    let currentStep$: BehaviorSubject<ScenarioStepConfig | null>;

    async function setUpOnStep(
      step: Partial<ScenarioStepConfig>,
      flags: string[] = [],
      layer: DataLayer | null = drawnLayer
    ) {
      currentStep$ = new BehaviorSubject<ScenarioStepConfig | null>(null);
      await setUpComponent({ flags, currentStep$ });
      currentStep$.next(step as ScenarioStepConfig);
      if (layer) {
        fixture.debugElement.injector
          .get(DataLayersStateService)
          .selectDataLayer(layer);
      }
      fixture.detectChanges();
    }

    function hasClearMapButton() {
      return !!fixture.debugElement.query(By.css('.clear-btn'));
    }

    function mapShowsLayerName() {
      return fixture.debugElement.query(By.directive(ScenarioMapComponent))
        .componentInstance.showDataLayerName;
    }

    it('offers Clear Map and the layer name while a layer is drawn', async () => {
      await setUpOnStep({ label: 'Include Areas', hasMap: true });

      expect(hasClearMapButton()).toBeTrue();
      expect(mapShowsLayerName()).toBeTrue();
    });

    it('leaves both out of the step that has its own layer toggles', async () => {
      await setUpOnStep({ label: TREATMENT_GOAL_STEP_LABEL, hasMap: true }, [
        'IMPROVED_TREATMENT_GOAL',
      ]);

      expect(hasClearMapButton()).toBeFalse();
      expect(mapShowsLayerName()).toBeFalse();
    });

    it('keeps both on the treatment goal step while the flag is off', async () => {
      await setUpOnStep({ label: TREATMENT_GOAL_STEP_LABEL, hasMap: true });

      expect(hasClearMapButton()).toBeTrue();
      expect(mapShowsLayerName()).toBeTrue();
    });

    it('offers no Clear Map when no layer is drawn', async () => {
      await setUpOnStep({ label: 'Include Areas', hasMap: true }, [], null);

      expect(hasClearMapButton()).toBeFalse();
    });
  });

  // the data layers panel of these steps offers the favorites of a
  // workspace, and this route only carries the planning area
  describe('the workspace we are configuring in', () => {
    let currentPlanWorkspaceId$: Subject<number | null>;

    beforeEach(async () => {
      currentPlanWorkspaceId$ = new Subject<number | null>();
      await setUpComponent({ currentPlanWorkspaceId$ });
    });

    it('is the one the planning area belongs to', () => {
      currentPlanWorkspaceId$.next(42);

      expect(setWorkspaceId).toHaveBeenCalledOnceWith(42);
      expect(resetWorkspaceId).not.toHaveBeenCalled();
    });

    it('is none for a planning area outside a workspace', () => {
      currentPlanWorkspaceId$.next(null);

      expect(resetWorkspaceId).toHaveBeenCalled();
      expect(setWorkspaceId).not.toHaveBeenCalled();
    });
  });

  describe('Step Calculation Logic', () => {
    let scenarioConfigSubject: BehaviorSubject<ScenarioV3Config>;
    let currentScenarioSubject: BehaviorSubject<Scenario>;

    beforeEach(async () => {
      scenarioConfigSubject = new BehaviorSubject<ScenarioV3Config>(
        {} as ScenarioV3Config
      );
      currentScenarioSubject = new BehaviorSubject<Scenario>({
        id: 1,
        type: 'PRESET',
        parent: undefined,
      } as Scenario);

      await setUpComponent({
        currentScenario$: currentScenarioSubject.asObservable(),
        scenarioConfig$: scenarioConfigSubject.asObservable(),
      });
    });

    describe('hasParent$', () => {
      it('should emit false when parent is undefined (top-level scenario)', (done) => {
        currentScenarioSubject.next({ id: 1, parent: undefined } as Scenario);

        component.hasParent$.subscribe((hasParent) => {
          expect(hasParent).toBeFalse();
          done();
        });
      });

      it('should emit true when parent ID exists (child scenario)', (done) => {
        currentScenarioSubject.next({ id: 1, parent: 42 } as Scenario);

        component.hasParent$.subscribe((hasParent) => {
          expect(hasParent).toBeTrue();
          done();
        });
      });
    });

    describe('steps$', () => {
      it('should return an empty array if scenarioConfig has no type', (done) => {
        scenarioConfigSubject.next({} as ScenarioV3Config);

        component.steps$.subscribe((steps) => {
          expect(steps).toEqual([]);
          done();
        });
      });

      it('should not include SUB_UNITS_STEP for non-child, project areas approach scenarios', (done) => {
        currentScenarioSubject.next({ id: 1, parent: undefined } as Scenario);
        scenarioConfigSubject.next({
          type: 'PRESET',
          planning_approach: 'OPTIMIZE_PROJECT_AREAS',
        } as ScenarioV3Config);

        component.steps$.subscribe((steps) => {
          expect(steps).not.toContain(SUB_UNITS_STEP);
          expect(steps.at(-1)?.label).toBe('Save & Run Scenario');
          done();
        });
      });

      it('should include SUB_UNITS_STEP for non-child scenarios when approach is PRIORITIZE_SUB_UNITS', (done) => {
        currentScenarioSubject.next({ id: 1, parent: undefined } as Scenario);
        scenarioConfigSubject.next({
          type: 'PRESET',
          planning_approach: 'PRIORITIZE_SUB_UNITS',
        } as ScenarioV3Config);

        component.steps$.subscribe((steps) => {
          expect(steps[0]).toEqual(SUB_UNITS_STEP);
          done();
        });
      });

      it('should EXCLUDE SUB_UNITS_STEP if scenario has a parent id', (done) => {
        currentScenarioSubject.next({ id: 2, parent: 99 } as Scenario);
        scenarioConfigSubject.next({
          type: 'PRESET',
          planning_approach: 'PRIORITIZE_SUB_UNITS',
        } as ScenarioV3Config);

        component.steps$.subscribe((steps) => {
          expect(steps).not.toContain(SUB_UNITS_STEP);
          done();
        });
      });

      it('should not contain SUB_UNITS_STEP when non-child scenario type is CUSTOM and approach is OPTIMIZE_PROJECT_AREAS', (done) => {
        currentScenarioSubject.next({ id: 1, parent: undefined } as Scenario);
        scenarioConfigSubject.next({
          type: 'CUSTOM',
          planning_approach: 'OPTIMIZE_PROJECT_AREAS',
        } as ScenarioV3Config);

        component.steps$.subscribe((steps) => {
          expect(steps).not.toContain(SUB_UNITS_STEP);
          done();
        });
      });

      it('should contain SUB_UNITS_STEP when non-child scenario type is CUSTOM and approach is PRIORITIZE_SUB_UNITS', (done) => {
        currentScenarioSubject.next({ id: 1, parent: undefined } as Scenario);
        scenarioConfigSubject.next({
          type: 'CUSTOM',
          planning_approach: 'PRIORITIZE_SUB_UNITS',
        } as ScenarioV3Config);

        component.steps$.subscribe((steps) => {
          expect(steps).toContain(SUB_UNITS_STEP);
          done();
        });
      });

      // the treatment goal step is the only one that has no map of its own
      describe('the map beside the treatment goal step', () => {
        function treatmentGoalStep() {
          return component.steps.find(
            (step) => step.label === TREATMENT_GOAL_STEP_LABEL
          );
        }

        // setUpComponent rebuilds the TestBed, so the flagged runs have to be
        // handed the same subjects the surrounding describe drives
        function setUpWithFlag() {
          return setUpComponent({
            flags: ['IMPROVED_TREATMENT_GOAL'],
            currentScenario$: currentScenarioSubject.asObservable(),
            scenarioConfig$: scenarioConfigSubject.asObservable(),
          });
        }

        function configurePresetScenario() {
          currentScenarioSubject.next({ id: 1, parent: undefined } as Scenario);
          scenarioConfigSubject.next({
            type: 'PRESET',
            planning_approach: 'OPTIMIZE_PROJECT_AREAS',
          } as ScenarioV3Config);
        }

        it('is drawn once IMPROVED_TREATMENT_GOAL is on', async () => {
          await setUpWithFlag();
          configurePresetScenario();

          expect(treatmentGoalStep()?.hasMap).toBeTrue();
        });

        it('is left out while the flag is off', () => {
          configurePresetScenario();

          expect(treatmentGoalStep()?.hasMap).toBeFalse();
        });

        describe('the layer previewed from its tooltip', () => {
          const previewed = { id: 7, name: 'Wildfire Hazard Potential' };

          function dataLayersState() {
            return fixture.debugElement.injector.get(DataLayersStateService);
          }

          function cdkIndexOf(label: string) {
            return (
              component.steps.findIndex((step) => step.label === label) + 1
            );
          }

          function moveBetween(from: number, to: number) {
            component.handleStepChangeEvent({
              previouslySelectedIndex: from,
              selectedIndex: to,
            } as StepperSelectionEvent);
          }

          async function viewedLayer() {
            return firstValueFrom(dataLayersState().viewedDataLayer$);
          }

          beforeEach(async () => {
            await setUpWithFlag();
            configurePresetScenario();
            dataLayersState().selectDataLayer(previewed as DataLayer);
          });

          it('is wiped off the map when the step is left', async () => {
            moveBetween(
              cdkIndexOf(TREATMENT_GOAL_STEP_LABEL),
              cdkIndexOf('Include Areas')
            );

            expect(await viewedLayer()).toBeNull();
          });

          it('is wiped off the map when the step is reached', async () => {
            moveBetween(
              cdkIndexOf('Include Areas'),
              cdkIndexOf(TREATMENT_GOAL_STEP_LABEL)
            );

            expect(await viewedLayer()).toBeNull();
          });

          it('leaves the layers of the other steps alone', async () => {
            moveBetween(
              cdkIndexOf('Include Areas'),
              cdkIndexOf('Exclude Areas')
            );

            expect(await viewedLayer()).toBe(previewed as DataLayer);
          });
        });

        it('leaves every other step as it was', async () => {
          await setUpWithFlag();
          configurePresetScenario();

          const untouched = component.steps.filter(
            (step) => step.label !== TREATMENT_GOAL_STEP_LABEL
          );

          expect(untouched.every((step) => step.hasMap)).toBeTrue();
        });
      });

      it('should update component.steps array automatically on emission', () => {
        currentScenarioSubject.next({ id: 1, parent: undefined } as Scenario);
        scenarioConfigSubject.next({
          type: 'PRESET',
          planning_approach: 'OPTIMIZE_PROJECT_AREAS',
        } as ScenarioV3Config);

        expect(component.steps.length).toBeGreaterThan(0);
      });
    });
  });
});
