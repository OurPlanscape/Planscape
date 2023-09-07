import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import {
  BehaviorSubject,
  catchError,
  map,
  Observable,
  of,
  take,
  tap,
} from 'rxjs';

import { BackendConstants } from '../backend-constants';
import { BasePlan, Plan, Region } from '../types';
import {
  PlanConditionScores,
  PlanPreview,
  Priority,
  ProjectArea,
  ProjectConfig,
  Scenario,
  TreatmentGoalConfig,
} from './../types/plan.types';
import { SessionService, MapService } from '../services';

export interface PlanState {
  all: {
    [planId: string]: Plan;
  };
  currentPlanId: Plan['id'] | null;
  currentScenarioId: Scenario['id'] | null;
  currentConfigId: ProjectConfig['id'] | null;
  mapConditionLayer: string | null;
  mapShapes: any | null;
  panelExpanded?: boolean;
}

export interface BackendPlan {
  id?: number;
  name: string;
  user?: number;
  region_name: Region;
  geometry?: GeoJSON.GeoJSON;
  scenarios?: number;
  projects?: number;
  creation_timestamp?: number; // in seconds since epoch
}

export interface BackendProjectArea {
  id: number;
  geometry: GeoJSON.GeoJSON;
  properties?: {
    estimated_area_treated?: number;
    owner?: number;
    project?: number;
  };
}

@Injectable({
  providedIn: 'root',
})
export class PlanService {
  // Warning: do not mutate state!
  readonly planState$ = new BehaviorSubject<PlanState>({
    all: {}, // All plans indexed by id
    currentPlanId: null,
    currentScenarioId: null,
    currentConfigId: null,
    mapConditionLayer: null,
    mapShapes: null,
    panelExpanded: true,
  });
  readonly treatmentGoalsConfig$ = new BehaviorSubject<
    TreatmentGoalConfig[] | null
  >(null);
  readonly selectedRegion$ = this.sessionService.region$;

  constructor(
    private http: HttpClient,
    private sessionService: SessionService,
    private mapService: MapService
  ) {
    this.http
      .get<TreatmentGoalConfig[]>(
        BackendConstants.END_POINT +
          '/plan/treatment_goals_config/?region_name=' +
          `${this.mapService.regionToString(this.selectedRegion$.getValue())}`
      )
      .pipe(take(1))
      .subscribe((config: TreatmentGoalConfig[]) => {
        this.treatmentGoalsConfig$.next(config);
      });
  }

  /** Makes a request to the backend to create a plan and updates state. */
  createPlan(
    basePlan: BasePlan
  ): Observable<{ success: boolean; result?: Plan }> {
    return this.createPlanApi(basePlan).pipe(
      take(1),
      map((createdPlan) => {
        return {
          success: true,
          result: createdPlan,
        };
      }),
      tap(({ result: createdPlan }) => {
        this.addPlanToState(createdPlan);
      })
    );
  }

  /** Makes a request to the backend to delete a plan with the given ID. */
  deletePlan(planIds: string[]): Observable<string> {
    return this.http.post<string>(
      BackendConstants.END_POINT.concat(
        '/planning/delete_planning_area/?id=',
        planIds.toString()
      ),
      {
        id: planIds,
      },
      {
        withCredentials: true,
      }
    );
  }

  /** Makes a request to the backend to fetch a plan with the given ID. */
  getPlan(planId: string): Observable<Plan> {
    return this.http
      .get<BackendPlan>(
        BackendConstants.END_POINT.concat(
          '/planning/get_planning_area_by_id/?id=',
          planId
        ),
        {
          withCredentials: true,
        }
      )
      .pipe(
        take(1),
        map((dbPlan) => this.convertToPlan(dbPlan)),
        tap((plan) => this.addPlanToState(plan))
      );
  }

  /** Makes a request to the backend for a list of all plans owned by a user.
   *  If the user is not provided, return all plans with owner=null.
   */
  listPlansByUser(userId: string | null): Observable<PlanPreview[]> {
    let url = BackendConstants.END_POINT.concat(
      '/planning/list_planning_areas'
    );
    if (userId) {
      url = url.concat('/?owner=', userId);
    }
    return this.http
      .get<BackendPlan[]>(url, {
        withCredentials: true,
      })
      .pipe(
        take(1),
        map((dbPlanList) =>
          dbPlanList.map((dbPlan) => this.convertToPlanPreview(dbPlan))
        )
      );
  }

  /** Makes a request to the backend for the average condition scores in a planning area. */
  getConditionScoresForPlanningArea(
    planId: string
  ): Observable<PlanConditionScores> {
    const url = BackendConstants.END_POINT.concat('/plan/scores/?id=', planId);
    return this.http
      .get<PlanConditionScores>(url, {
        withCredentials: true,
      })
      .pipe(take(1));
  }

  /**
   * Creates a project in a plan, and returns an ID which can be used to get or update the
   *  project. "Project" is synonymous with "Config" in the frontend.
   * */
  createProjectInPlan(planId: string): Observable<number> {
    const url = BackendConstants.END_POINT.concat('/planning/create_scenario/');
    return this.http
      .post<number>(
        url,
        {
          planning_area: Number(planId),
        },
        {
          withCredentials: true,
        }
      )
      .pipe(take(1));
  }

  /** Creates project area and returns the ID of the created project area. */
  createProjectArea(projectId: number, projectArea: GeoJSON.GeoJSON) {
    const url = BackendConstants.END_POINT.concat('/plan/create_project_area/');
    return this.http
      .post<number>(
        url,
        {
          project_id: Number(projectId),
          geometry: projectArea,
        },
        {
          withCredentials: true,
        }
      )
      .pipe(
        take(1),
        catchError((error) => {
          // TODO: Show error message! Move all error logic to the service.
          return of(null);
        })
      );
  }

  /** Creates multiple project areas for a project. */
  bulkCreateProjectAreas(projectId: number, projectAreas: GeoJSON.GeoJSON[]) {
    const url = BackendConstants.END_POINT.concat(
      '/plan/create_project_areas_for_project/'
    );
    return this.http
      .post<number>(
        url,
        {
          project_id: Number(projectId),
          geometries: projectAreas,
        },
        {
          withCredentials: true,
        }
      )
      .pipe(
        take(1),
        map(() => null)
      );
  }

  /** Updates a project with new parameters. */
  updateProject(projectConfig: ProjectConfig): Observable<number> {
    const url = BackendConstants.END_POINT.concat('/plan/update_project/');
    return this.http
      .put<number>(url, projectConfig, {
        withCredentials: true,
      })
      .pipe(take(1));
  }

  /** Fetches the projects for a plan from the backend. */
  getProjectsForPlan(planId: string): Observable<ProjectConfig[]> {
    const url = BackendConstants.END_POINT.concat(
      '/planning/list_scenarios_for_planning_area/?planning_area=',
      planId
    );
    return this.http
      .get(url, {
        withCredentials: true,
      })
      .pipe(
        take(1),
        map((response) =>
          (response as any[]).map((config) =>
            this.convertToProjectConfig(config)
          )
        )
      );
  }

  /** Fetches a project by its ID from the backend. */
  getProject(projectId: number): Observable<ProjectConfig> {
    const url = BackendConstants.END_POINT.concat(
      '/planning/get_scenario_by_id/?id=',
      projectId.toString()
    );
    return this.http
      .get(url, {
        withCredentials: true,
      })
      .pipe(
        take(1),
        map((response) => this.convertToProjectConfig(response))
      );
  }

  /** Deletes one or more projects from the backend. */
  deleteProjects(projectIds: number[]): Observable<number[]> {
    return this.http.post<number[]>(
      BackendConstants.END_POINT.concat('/plan/delete_projects/'),
      {
        project_ids: projectIds,
      },
      {
        withCredentials: true,
      }
    );
  }

  /** Fetches a scenario by its id from the backend. */
  getScenario(scenarioId: string): Observable<Scenario> {
    const url = BackendConstants.END_POINT.concat(
      '/planning/get_scenario_by_id/?id=',
      scenarioId
    );
    return this.http
      .get(url, {
        withCredentials: true,
      })
      .pipe(
        take(1),
        map((response) => this.convertBackendScenarioToScenario(response))
      );
  }

  /** Fetches the scenarios for a plan from the backend. */
  getScenariosForPlan(planId: string): Observable<Scenario[]> {
    return this.http
      .get<any[]>(
        BackendConstants.END_POINT.concat(
          '/planning/list_scenarios_for_planning_area/?planning_area=',
          planId
        ),
        {
          withCredentials: true,
        }
      )
      .pipe(
        map((scenarios) =>
          scenarios.map(this.convertBackendScenarioToScenario.bind(this))
        )
      );
  }

  /** Creates a scenario in the backend. Returns scenario ID. */
  createScenario(scenarioParameters: any): Observable<any> {
    scenarioParameters['configuration'] = this.convertConfigToScenario(
      scenarioParameters['configuration']
    );
    return this.http
      .post(
        BackendConstants.END_POINT + '/planning/create_scenario/',
        scenarioParameters,
        {
          withCredentials: true,
        }
      )
      .pipe(take(1));
  }

  /** Updates a scenario with new notes. */
  updateScenarioNotes(scenario: Scenario): Observable<number> {
    const url = BackendConstants.END_POINT.concat('/planning/update_scenario/');
    return this.http
      .patch<number>(
        url,
        {
          id: scenario.id,
          notes: scenario.notes,
        },
        {
          withCredentials: true,
        }
      )
      .pipe(take(1));
  }

  /** Deletes one or more scenarios from the backend. Returns IDs of deleted scenarios. */
  deleteScenarios(scenarioIds: string[]): Observable<string[]> {
    return this.http.post<string[]>(
      BackendConstants.END_POINT.concat('/planning/delete_scenario/'),
      {
        scenario_id: scenarioIds,
      },
      {
        withCredentials: true,
      }
    );
  }

  /** Favorite a scenario in the backend. */
  favoriteScenario(scenarioId: string): Observable<{ favorited: boolean }> {
    return this.http.post<{ favorited: boolean }>(
      BackendConstants.END_POINT.concat('/plan/favorite_scenario/'),
      {
        scenario_id: Number(scenarioId),
      },
      {
        withCredentials: true,
      }
    );
  }

  /** Unfavorite a scenario in the backend. */
  unfavoriteScenario(scenarioId: string): Observable<{ favorited: boolean }> {
    return this.http.post<{ favorited: boolean }>(
      BackendConstants.END_POINT.concat('/plan/unfavorite_scenario/'),
      {
        scenario_id: Number(scenarioId),
      },
      {
        withCredentials: true,
      }
    );
  }

  private convertToPlan(plan: BackendPlan): Plan {
    return {
      id: String(plan.id),
      ownerId: String(plan.user),
      name: plan.name,
      region: plan.region_name,
      planningArea: plan.geometry,
      savedScenarios: plan.scenarios ?? 0,
      configs: plan.projects ?? 0,
      createdTimestamp: this.convertBackendTimestamptoFrontendTimestamp(
        plan.creation_timestamp
      ),
    };
  }

  private convertToDbPlan(plan: BasePlan): BackendPlan {
    return {
      user: Number(plan.ownerId),
      name: plan.name,
      region_name: plan.region,
      geometry: plan.planningArea,
    };
  }

  private convertToPlanPreview(plan: BackendPlan): PlanPreview {
    return {
      id: String(plan.id),
      name: plan.name,
      region: plan.region_name,
      savedScenarios: plan.scenarios,
      configurations: plan.projects,
      createdTimestamp: this.convertBackendTimestamptoFrontendTimestamp(
        plan.creation_timestamp
      ),
    };
  }

  private convertToProjectConfig(config: any): ProjectConfig {
    return {
      id: config.id,
      name: config.name,
      est_cost: config.configuration.est_cost,
      max_budget: config.configuration.max_budget,
      min_distance_from_road: config.configuration.min_distance_from_road,
      max_slope: config.configuration.max_slope,
      max_treatment_area_ratio: config.configuration.max_treatment_area_ratio,
      priorities: config.configuration.priorities,
      weights: config.configuration.weights,
      excluded_areas: config.configuration.excluded_areas,
      createdTimestamp: this.convertBackendTimestamptoFrontendTimestamp(
        config.creation_timestamp
      ),
    };
  }

  private convertBackendScenarioToScenario(scenario: any): Scenario {
    return {
      id: scenario.id,
      name: scenario.name,
      plan_id: scenario.plan,
      projectId: scenario.project,
      owner: scenario.owner,
      createdTimestamp: this.convertBackendTimestamptoFrontendTimestamp(
        scenario.creation_timestamp
      ),
      config: this.convertToProjectConfig(scenario.config),
      priorities: this.convertToPriorities(scenario.priorities),
      projectAreas: this.convertToProjectAreas(scenario.project_areas),
      notes: scenario.notes,
      favorited: scenario.favorited,
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

  private convertToPriorities(scenarioPriorities: {
    [name: string]: number;
  }): Priority[] {
    if (!scenarioPriorities) {
      return [];
    }

    return Object.entries(scenarioPriorities).map(([priority, weight]) => {
      return {
        id: priority,
        name: priority.replace(/_/g, ' '),
        weight: weight,
      };
    });
  }

  private convertConfigToScenario(config: ProjectConfig): any {
    return {
      est_cost: config.est_cost,
      max_budget: config.max_budget,
      min_distance_from_road: config.min_distance_from_road,
      max_slope: config.max_slope,
      max_treatment_area_ratio: config.max_treatment_area_ratio,
      priorities: config.priorities,
      weights: config.weights,
      excluded_areas: config.excluded_areas,
    };
  }

  // Convert the timestamp stored in backend (measured in seconds since the epoch)
  // to the timestamp Angular assumes is used (milliseconds since the epoch).
  convertBackendTimestamptoFrontendTimestamp(
    timestamp: number | undefined
  ): number | undefined {
    return timestamp ? timestamp * 1000 : undefined;
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

  updateStateWithConfig(configId: number | null) {
    const currentState = Object.freeze(this.planState$.value);
    const updatedState = Object.freeze({
      ...currentState,
      all: {
        ...currentState.all,
      },
      currentConfigId: configId,
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

  updateStateWithPanelState(panelExpanded: boolean) {
    const currentState = Object.freeze(this.planState$.value);
    const updatedState = Object.freeze({
      ...currentState,
      all: {
        ...currentState.all,
      },
      panelExpanded: panelExpanded,
    });
    this.planState$.next(updatedState);
  }

  private createPlanApi(plan: BasePlan): Observable<Plan> {
    const createPlanRequest = this.convertToDbPlan(plan);
    return this.http
      .post(
        BackendConstants.END_POINT + '/planning/create_planning_area/',
        createPlanRequest,
        {
          withCredentials: true,
        }
      )
      .pipe(
        take(1),
        map((result: any) => {
          return {
            ...plan,
            id: result['id'].toString(),
            savedScenarios: 0,
          };
        })
      );
  }
}
