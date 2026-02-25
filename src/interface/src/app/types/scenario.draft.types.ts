import { PLANNING_APPROACH, ScenarioConfigPayload } from './scenario.types';

// Backend response for available stands in a planning area (used by FE map/steps).
export interface AvailableStands {
  unavailable: {
    by_inclusions: number[];
    by_exclusions: number[];
    by_thresholds: number[];
  };
  summary: {
    total_area: number; // total PA stands area
    available_area: number; // total area - exclusions
    treatable_area: number; // available area - thresholds
    unavailable_area: number; // unavailable area
    treatable_stand_count: number; // number of available stands
  };
}

// FE-only draft wizard state for scenario creation steps (flat/legacy-style fields).
export interface ScenarioDraftConfiguration extends ScenarioConfigPayload {
  treatment_goal: number;
  excluded_areas: number[];
  name: string;
  planning_area: number;
  priority_objectives?: number[];
  cobenefits?: number[];
  planning_approach: PLANNING_APPROACH;
  subunit?: number;
}
