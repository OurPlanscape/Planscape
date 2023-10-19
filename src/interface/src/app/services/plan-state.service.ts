import { Injectable } from '@angular/core';
import { PlanService } from './plan.service';
import { ScenarioService } from './scenario.service';
import { TreatmentGoalsService } from './treatment-goals.service';
import {
  BasePlan,
  Plan,
  Region,
  Scenario,
  TreatmentGoalConfig,
} from '../types';
import { BehaviorSubject, tap } from 'rxjs';

// TODO Remove Config
export interface PlanState {
  all: {
    [planId: string]: Plan;
  };
  currentPlanId: Plan['id'] | null;
  currentScenarioId: Scenario['id'] | null;
  mapConditionLayer: string | null;
  mapShapes: any | null;
  legendUnits: string | null;
}

@Injectable({
  providedIn: 'root',
})
export class PlanStateService {
  // Warning: do not mutate state!
  readonly planState$ = new BehaviorSubject<PlanState>({
    all: {}, // All plans indexed by id
    currentPlanId: null,
    currentScenarioId: null,
    mapConditionLayer: null,
    mapShapes: null,
    legendUnits: null,
  });
  readonly treatmentGoalsConfig$ = new BehaviorSubject<
    TreatmentGoalConfig[] | null
  >(null);

  readonly planRegion$ = new BehaviorSubject<Region>(Region.SIERRA_NEVADA);

  constructor(
    private planService: PlanService,
    private scenarioService: ScenarioService,
    private treatmentGoalsService: TreatmentGoalsService
  ) {
    this.treatmentGoalsService
      .getTreatmentGoalsForArea(this.planRegion$.getValue())
      .subscribe((config: TreatmentGoalConfig[]) => {
        this.treatmentGoalsConfig$.next(config);
      });
  }

  createPlan(basePlan: BasePlan) {
    return this.planService.createPlan(basePlan).pipe(
      tap(({ result: createdPlan }) => {
        this.addPlanToState(createdPlan);
      })
    );
  }

  getPlan(planId: string) {
    return this.planService
      .getPlan(planId)
      .pipe(tap((plan) => this.addPlanToState(plan)));
  }

  createScenario(scenarioParameters: any) {
    return this.scenarioService.createScenario(scenarioParameters).pipe(
      tap((result) => {
        if (result.id) {
          this.updateStateWithScenario(result.id.toString());
        }
      })
    );
  }

  getMetricData(metric_paths: any) {
    return this.scenarioService.getMetricData(
      metric_paths,
      this.planRegion$.value
    );
  }

  /**
   * Updates planRegion and treatmentGoalsConfig if value is a valid Region
   */
  setPlanRegion(value: Region) {
    if (Object.values(Region).includes(value)) {
      this.planRegion$.next(value);
      this.treatmentGoalsService
        .getTreatmentGoalsForArea(this.planRegion$.getValue())
        .subscribe((config: TreatmentGoalConfig[]) => {
          this.treatmentGoalsConfig$.next(config);
        });
    }
  }

  private addPlanToState(plan: Plan) {
    // Object.freeze() enforces shallow runtime immutability
    const currentState = Object.freeze(this.planState$.value);
    const updatedState = Object.freeze({
      ...currentState,
      all: {
        ...currentState.all,
        [plan.id]: plan,
      },
    });

    this.planState$.next(updatedState);
  }

  updateStateWithPlan(planId: string | null) {
    const currentState = Object.freeze(this.planState$.value);
    const updatedState = Object.freeze({
      ...currentState,
      all: {
        ...currentState.all,
      },
      currentPlanId: planId,
    });

    this.planState$.next(updatedState);
  }

  updateStateWithScenario(scenarioId: string | null) {
    const currentState = Object.freeze(this.planState$.value);
    const updatedState = Object.freeze({
      ...currentState,
      all: {
        ...currentState.all,
      },
      currentScenarioId: scenarioId,
    });

    this.planState$.next(updatedState);
  }

  updateStateWithConditionLayer(layer: string | null) {
    const currentState = Object.freeze(this.planState$.value);
    const updatedState = Object.freeze({
      ...currentState,
      all: {
        ...currentState.all,
      },
      mapConditionLayer: layer,
    });
    this.planState$.next(updatedState);
  }

  updateStateWithShapes(shapes: any | null) {
    const currentState = Object.freeze(this.planState$.value);
    const updatedState = Object.freeze({
      ...currentState,
      all: {
        ...currentState.all,
      },
      mapShapes: shapes,
    });
    this.planState$.next(updatedState);
  }

  updateStateWithLegendUnits(legendUnits: string | null) {
    const currentState = Object.freeze(this.planState$.value);
    const updatedState = Object.freeze({
      ...currentState,
      all: {
        ...currentState.all,
      },
      legendUnits: legendUnits,
    });

    this.planState$.next(updatedState);
  }
}
