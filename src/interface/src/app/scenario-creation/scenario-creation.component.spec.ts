import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ScenarioCreationComponent } from './scenario-creation.component';
import { MockComponents, MockModule, MockProvider } from 'ng-mocks';
import { DataLayersComponent } from '@data-layers/data-layers/data-layers.component';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { DataLayersStateService } from '@data-layers/data-layers.state.service';
import { of } from 'rxjs';
import { ScenarioService } from '@services';
import { ActivatedRoute } from '@angular/router';
import { FormControl, ValidationErrors } from '@angular/forms';
import { ScenarioState } from '@scenario/scenario.state';
import { StandLevelConstraintsComponent } from '@scenario-creation/step3/stand-level-constraints.component';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { NgxMaskModule } from 'ngx-mask';
import { NewScenarioState } from './new-scenario.state';
import { BaseLayersComponent } from '@base-layers/base-layers/base-layers.component';
import { AvailableStands } from '@types';
import { TreatmentTargetComponent } from '@scenario-creation/treatment-target/treatment-target.component';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { SharedModule } from '@shared';
import { Step1WithOverviewComponent } from '@scenario-creation/step1-with-overview/step1-with-overview.component';
import { MOCK_SCENARIO } from '@services/mocks';

describe('ScenarioCreationComponent', () => {
  let component: ScenarioCreationComponent;
  let fixture: ComponentFixture<ScenarioCreationComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        HttpClientTestingModule,
        ScenarioCreationComponent,
        MatSnackBarModule,
        NgxMaskModule.forRoot(),
        NoopAnimationsModule,
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
        MockProvider(ScenarioService, {
          getScenariosForPlan: () =>
            of([{ name: 'Scenario A' }, { name: 'Scenario B' }] as any),
        }),
        MockProvider(ScenarioState, {
          currentScenario$: of(MOCK_SCENARIO),
        }),
        MockProvider(DataLayersStateService, { paths$: of([]) }),
        MockProvider(NewScenarioState, {
          availableStands$: of({ summary: {} } as AvailableStands),
          stepIndex$: of(0),
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

  describe('scenarioNameMustBeUnique (sync validator)', () => {
    it('returns null if name is not provided', () => {
      const validator = component.scenarioNameMustBeUnique(['Scenario A']);
      const control = new FormControl('');
      const result = validator(control) as ValidationErrors | null;
      expect(result).toBeNull();
    });

    it('returns null if list is empty', () => {
      const validator = component.scenarioNameMustBeUnique([]);
      const control = new FormControl('Any name');
      const result = validator(control) as ValidationErrors | null;
      expect(result).toBeNull();
    });

    it('returns null if name is unique', () => {
      const validator = component.scenarioNameMustBeUnique([
        'Scenario A',
        'Scenario B',
      ]);
      const control = new FormControl('Scenario C');
      const result = validator(control) as ValidationErrors | null;
      expect(result).toBeNull();
    });

    it('returns duplicate error if name already exists (case-insensitive)', () => {
      const validator = component.scenarioNameMustBeUnique([
        'Scenario A',
        'Scenario B',
      ]);
      const control = new FormControl('scenario a');
      const result = validator(control) as ValidationErrors | null;
      expect(result).toEqual({ duplicate: true });
    });

    it('returns duplicate error even with extra whitespace', () => {
      const validator = component.scenarioNameMustBeUnique(['Scenario A']);
      const control = new FormControl('   Scenario A   ');
      const result = validator(control) as ValidationErrors | null;
      expect(result).toEqual({ duplicate: true });
    });
  });
});
