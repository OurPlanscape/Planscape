import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { NgxMaskModule } from 'ngx-mask';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { ActivatedRoute } from '@angular/router';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { MockComponents, MockModule, MockProvider } from 'ng-mocks';

import { ScenarioCreationComponent } from './scenario-creation.component';
import { FeaturesModule } from '@features/features.module';
import { overrideFeatureFlags } from '@features/testing';
import { SharedModule } from '@shared';
import { ScenarioService } from '@services';
import { ScenarioState } from '@scenario/scenario.state';
import { DataLayersStateService } from '@app/data-layers/data-layers.state.service';
import { NewScenarioState } from './new-scenario.state';
import { AvailableStands, Scenario, ScenarioV3Config } from '@types';
import { SUB_UNITS_STEP } from '@app/scenario/scenario.constants';
import { MOCK_SCENARIO } from '@services/mocks';

import { Step1WithOverviewComponent } from '@scenario-creation/step1-with-overview/step1-with-overview.component';
import { DataLayersComponent } from '@data-layers/data-layers/data-layers.component';
import { StandLevelConstraintsComponent } from '@scenario-creation/step3/stand-level-constraints.component';
import { ConstraintsStepComponent } from './constraints-step/constraints-step.component';
import { TreatmentTargetComponent } from '@scenario-creation/treatment-target/treatment-target.component';
import { BaseLayersComponent } from '@base-layers/base-layers/base-layers.component';
import { FeatureService } from '@app/features/feature.service';

describe('ScenarioCreationComponent', () => {
  let component: ScenarioCreationComponent;
  let fixture: ComponentFixture<ScenarioCreationComponent>;

  async function setUpComponent(
    options: {
      flags?: string[];
      currentScenario$?: Observable<Scenario>;
      scenarioConfig$?: Observable<ScenarioV3Config>;
    } = {}
  ) {
    const {
      flags = [],
      currentScenario$ = of(MOCK_SCENARIO),
      scenarioConfig$ = of({} as ScenarioV3Config),
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
          ConstraintsStepComponent,
          TreatmentTargetComponent,
          BaseLayersComponent
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
          currentStep$: of(null),
          scenarioConfig$,
          priorityObjectivesDetails$: of([]),
        }),
      ],
    }).compileComponents();

    overrideFeatureFlags(); // explicit clear, no args
    overrideFeatureFlags(...flags);

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
