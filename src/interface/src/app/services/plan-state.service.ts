import { Injectable } from '@angular/core';
import { PlanService } from './plan.service';
import { ScenarioService } from './scenario.service';
import { TreatmentGoalsService } from './treatment-goals.service';
import {
  BackendProjectArea,
  CreatePlanPayload,
  Plan,
  ProjectArea,
  Region,
  Scenario,
  ScenarioConfig,
  TreatmentGoalConfig,
  TreatmentQuestionConfig,
} from '@types';
import { BehaviorSubject, map, switchMap, take, tap } from 'rxjs';
import { Feature } from 'geojson';

export interface PlanState {
  all: {
    [planId: number]: Plan;
  };
  currentPlanId: Plan['id'] | null;
  currentScenarioId: Scenario['id'] | null;
  mapConditionLayer: string | null;
  mapShapes: Feature[] | null;
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

  createPlan(basePlan: CreatePlanPayload) {
    return this.planService.createPlan(basePlan).pipe(
      tap((result: Plan) => {
        this.addPlanToState(result);
      })
    );
  }

  getPlan(planId: string) {
    return this.planService
      .getPlan(planId)
      .pipe(tap((plan) => this.addPlanToState(plan)));
  }

  getScenario(scenarioId: string) {
    return this.scenarioService.getScenario(scenarioId).pipe(
      switchMap((scenario) => {
        // TODO this is pretty bad, why do we need to pull stuff from another endpoint for this?
        return this.getSelectedQuestionFromConfig(
          scenario.configuration.question_id!
        ).pipe(
          take(1),
          map((selectedQuestion) => {
            return {
              ...scenario,
              ...{
                configuration: this.convertToScenarioConfig(
                  scenario.configuration,
                  selectedQuestion
                ),
              },
            };
          })
        );
      })
    );
  }

  getSelectedQuestionFromConfig(questionId: number) {
    var selectedQuestion: TreatmentQuestionConfig | null = null;

    return this.treatmentGoalsConfig$.pipe(
      map((goals) => {
        goals!.forEach((goal) => {
          goal.questions.forEach((question) => {
            if (question.id === questionId) {
              selectedQuestion = question;
            }
          });
        });
        return selectedQuestion;
      })
    );
  }

  private convertToScenarioConfig(
    config: any,
    selectedQuestion: any
  ): ScenarioConfig {
    return {
      ...config,
      ...{
        treatment_question: selectedQuestion,
        project_areas: this.convertToProjectAreas(config.project_areas),
      },
    };
  }

  private convertToProjectAreas(scenarioProjectAreas: {
    [id: number]: BackendProjectArea;
  }): ProjectArea[] {
    if (!scenarioProjectAreas) {
      return [];
    }

    let projectAreas: ProjectArea[] = [];
    Object.values(scenarioProjectAreas).forEach((projectArea) => {
      projectAreas.push({
        id: projectArea.id.toString(),
        projectId: projectArea.properties?.project?.toString(),
        projectArea: projectArea.geometry,
        owner: projectArea.properties?.owner?.toString(),
        estimatedAreaTreated: projectArea.properties?.estimated_area_treated,
      });
    });

    return projectAreas;
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

  updateStateWithPlan(planId: number | null) {
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
