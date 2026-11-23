import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ScenarioLegendComponent } from './scenario-legend.component';
import { MockProvider } from 'ng-mocks';
import { PlanState } from '@plan/plan.state';
import { BehaviorSubject, firstValueFrom, of } from 'rxjs';
import { AvailableStands, Plan } from '@types';
import {
  CUSTOM_SCENARIO_OVERVIEW_STEPS,
  SCENARIO_OVERVIEW_STEPS,
  SUB_UNITS_STEP,
  ScenarioStepConfig,
} from '@scenario/scenario.constants';
import { NewScenarioState } from '../new-scenario.state';

/** What the legend shows for a step, with both kinds of stands on the map. */
interface ExpectedLegend {
  excluded: boolean;
  potentialTreatable: boolean;
  constrained: boolean;
  availablePercent: boolean;
}

const NOTHING: ExpectedLegend = {
  excluded: false,
  potentialTreatable: false,
  constrained: false,
  availablePercent: false,
};

const AFTER_EXCLUDING: ExpectedLegend = {
  excluded: true,
  potentialTreatable: true,
  constrained: false,
  availablePercent: false,
};

const AFTER_CONSTRAINING: ExpectedLegend = {
  excluded: false,
  potentialTreatable: true,
  constrained: true,
  availablePercent: true,
};

const OVERVIEW_LEGENDS: ExpectedLegend[] = [
  NOTHING, // Treatment Goal
  NOTHING, // Include Areas
  AFTER_EXCLUDING, // Exclude Areas
  AFTER_CONSTRAINING, // Stand-level Constraints
  AFTER_CONSTRAINING, // Treatment Target
  AFTER_CONSTRAINING, // Generate Output
];

const CUSTOM_LEGENDS: ExpectedLegend[] = [
  NOTHING, // Priority Objectives
  NOTHING, // Co-Benefits
  NOTHING, // Include Areas
  AFTER_EXCLUDING, // Exclude Areas
  AFTER_CONSTRAINING, // Stand-level Constraints
  AFTER_CONSTRAINING, // Treatment Target
  AFTER_CONSTRAINING, // Generate Output
];

describe('ScenarioLegendComponent', () => {
  let component: ScenarioLegendComponent;
  let fixture: ComponentFixture<ScenarioLegendComponent>;
  let currentStep$: BehaviorSubject<ScenarioStepConfig | null>;
  let hasExcludedStands$: BehaviorSubject<boolean>;
  let hasConstrainedStands$: BehaviorSubject<boolean>;

  beforeEach(async () => {
    currentStep$ = new BehaviorSubject<ScenarioStepConfig | null>(null);
    hasExcludedStands$ = new BehaviorSubject(true);
    hasConstrainedStands$ = new BehaviorSubject(true);

    await TestBed.configureTestingModule({
      imports: [ScenarioLegendComponent],
      providers: [
        MockProvider(PlanState, {
          currentPlan$: of({} as Plan),
        }),
        MockProvider(NewScenarioState, {
          availableStands$: of({} as AvailableStands),
          currentStep$,
          hasExcludedStands$,
          hasConstrainedStands$,
        }),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ScenarioLegendComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  /**
   * Locks down what each step of the workflow puts in the legend, so the step
   * flags can be reshuffled without changing what the user sees.
   */
  async function expectLegendFor(
    step: ScenarioStepConfig | null,
    expected: ExpectedLegend
  ) {
    currentStep$.next(step);

    expect({
      excluded: await firstValueFrom(component.showExcludedStands$),
      potentialTreatable: await firstValueFrom(
        component.showPotentialTreatableArea$
      ),
      constrained: await firstValueFrom(component.showConstrainedStands$),
      availablePercent: await firstValueFrom(component.showAvailablePercent$),
    }).toEqual(expected);
  }

  describe('what each step puts in the legend', () => {
    SCENARIO_OVERVIEW_STEPS.forEach((step, index) => {
      it(`describes '${step.label}'`, async () => {
        await expectLegendFor(step, OVERVIEW_LEGENDS[index]);
      });
    });

    CUSTOM_SCENARIO_OVERVIEW_STEPS.forEach((step, index) => {
      it(`describes '${step.label}' in a custom scenario`, async () => {
        await expectLegendFor(step, CUSTOM_LEGENDS[index]);
      });
    });

    it(`describes '${SUB_UNITS_STEP.label}'`, async () => {
      await expectLegendFor(SUB_UNITS_STEP, NOTHING);
    });

    it('describes nothing before the workflow starts', async () => {
      await expectLegendFor(null, NOTHING);
    });
  });

  describe('when the map has no stands to point at', () => {
    beforeEach(() => {
      hasExcludedStands$.next(false);
      hasConstrainedStands$.next(false);
    });

    it('leaves the excluded area out of the exclude step', async () => {
      await expectLegendFor(SCENARIO_OVERVIEW_STEPS[2], {
        ...AFTER_EXCLUDING,
        excluded: false,
      });
    });

    it('leaves the constraint out of the constraints step', async () => {
      await expectLegendFor(SCENARIO_OVERVIEW_STEPS[3], {
        ...AFTER_CONSTRAINING,
        constrained: false,
      });
    });
  });
});
