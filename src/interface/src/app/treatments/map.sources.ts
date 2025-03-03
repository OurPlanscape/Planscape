import { environment } from '../../environments/environment';

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
} as const;
