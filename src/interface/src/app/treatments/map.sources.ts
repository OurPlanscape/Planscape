import { environment } from '@env/environment';

export const MARTIN_SOURCES = {
  projectAreaAggregate: {
    tilesUrl: environment.martin_server + 'project_area_aggregate/{z}/{x}/{y}',
    sources: {
      projectAreaAggregate: 'project_area_aggregate',
    },
  },
  standsByTxPlan: {
    tilesUrl: environment.martin_server + 'stands_by_tx_plan/{z}/{x}/{y}',
    sources: {
      standsByTxPlan: 'stands_by_tx_plan',
    },
  },
  standsByPlanningArea: {
    tilesUrl: environment.martin_server + 'stands_by_planning_area/{z}/{x}/{y}',
    sources: {
      standsByPlanningArea: 'stands_by_planning_area',
    },
  },
  projectAreasByScenario: {
    tilesUrl:
      environment.martin_server + 'project_areas_by_scenario/{z}/{x}/{y}',
    sources: {
      projectAreasByScenario: 'project_areas_by_scenario',
      projectAreasByScenarioLabel: 'project_areas_by_scenario_label',
    },
  },
  standsByTxResult: {
    tilesUrl: environment.martin_server + 'stands_by_tx_result/{z}/{x}/{y}',
    sources: {
      standsByTxResult: 'stands_by_tx_result',
    },
  },
  planningArea: {
    tilesUrl: environment.martin_server + 'planning_area_by_id/{z}/{x}/{y}',
    sources: {
      planningArea: 'planning_area',
    },
  },
  scenarioStands: {
    tilesUrl: environment.martin_server + 'stands_by_planning_area/{z}/{x}/{y}',
    sources: {
      stands: 'stands_by_planning_area',
    },
  },
} as const;
