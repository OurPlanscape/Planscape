import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ScenarioCreationComponent } from './scenario-creation.component';
import { MockComponents, MockModule, MockProvider } from 'ng-mocks';
import { DataLayersComponent } from '@data-layers/data-layers/data-layers.component';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { DataLayersStateService } from '@data-layers/data-layers.state.service';
import { BehaviorSubject, of } from 'rxjs';
import { ScenarioService } from '@services';
import { ActivatedRoute } from '@angular/router';
import { ScenarioState } from '@scenario/scenario.state';
import { StandLevelConstraintsComponent } from '@scenario-creation/step3/stand-level-constraints.component';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { NgxMaskModule } from 'ngx-mask';
import { NewScenarioState } from './new-scenario.state';
import { BaseLayersComponent } from '@base-layers/base-layers/base-layers.component';
import { AvailableStands, Scenario, ScenarioV3Config } from '@types';
import { TreatmentTargetComponent } from '@scenario-creation/treatment-target/treatment-target.component';
import { SharedModule } from '@shared';
import { Step1WithOverviewComponent } from '@scenario-creation/step1-with-overview/step1-with-overview.component';
import { MOCK_SCENARIO } from '@services/mocks';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { SUB_UNITS_STEP } from '@app/scenario/scenario.constants';

describe('ScenarioCreationComponent', () => {
  let component: ScenarioCreationComponent;
  let fixture: ComponentFixture<ScenarioCreationComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        HttpClientTestingModule,
        ScenarioCreationComponent,
        NgxMaskModule.forRoot(),
        NoopAnimationsModule,
        MatSnackBarModule,
        MockModule(SharedModule),
        MockComponents(
          Step1WithOverviewComponent,
          DataLayersComponent,
          StandLevelConstraintsComponent,
          TreatmentTargetComponent,
          BaseLayersComponent
        ),
      ],
      providers: [
        MockProvider(ActivatedRoute, {
          snapshot: { data: { planId: 24 } } as any,
        }),
        MockProvider(ScenarioService),
        MockProvider(ScenarioState, {
          currentScenario$: of(MOCK_SCENARIO),
        }),
        MockProvider(DataLayersStateService, {
          paths$: of([]),
          viewedDataLayer$: of(null),
        }),
        MockProvider(NewScenarioState, {
          availableStands$: of({ summary: {} } as AvailableStands),
          currentStep$: of(null),
          scenarioConfig$: of({}),
          priorityObjectivesDetails$: of([]),
        }),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ScenarioCreationComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('ScenarioCreationComponent - Step Calculation Logic', () => {
    let component: ScenarioCreationComponent;
    let fixture: ComponentFixture<ScenarioCreationComponent>;

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

      await TestBed.configureTestingModule({
        imports: [
          HttpClientTestingModule,
          ScenarioCreationComponent,
          NgxMaskModule.forRoot(),
          NoopAnimationsModule,
          MatSnackBarModule,
          MockModule(SharedModule),
          MockComponents(
            Step1WithOverviewComponent,
            DataLayersComponent,
            StandLevelConstraintsComponent,
            TreatmentTargetComponent,
            BaseLayersComponent
          ),
        ],
        providers: [
          MockProvider(ActivatedRoute, {
            snapshot: { data: { planId: 24 } } as any,
          }),
          MockProvider(ScenarioService),
          MockProvider(ScenarioState, {
            currentScenario$: currentScenarioSubject.asObservable(),
          }),
          MockProvider(DataLayersStateService, {
            paths$: of([]),
            viewedDataLayer$: of(null),
          }),
          MockProvider(NewScenarioState, {
            availableStands$: of({ summary: {} } as AvailableStands),
            currentStep$: of(null),
            scenarioConfig$: scenarioConfigSubject.asObservable(),
            priorityObjectivesDetails$: of([]),
          }),
        ],
      }).compileComponents();

      fixture = TestBed.createComponent(ScenarioCreationComponent);
      component = fixture.componentInstance;
      fixture.detectChanges();
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
        currentScenarioSubject.next({ id: 2, parent: 99 } as Scenario); // Child scenario
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
