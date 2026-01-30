import { ScenarioV3Config } from './scenario.types';

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

export interface ScenarioDraftConfiguration {
  estimated_cost?: number;
  excluded_areas?: number[];
  max_area?: number;
  max_slope?: number | null;
  min_distance_from_road?: number | null;
  stand_size?: 'SMALL' | 'MEDIUM' | 'LARGE';
  max_budget?: number;
  max_project_count?: number;
  treatment_goal?: number;
  priority_objectives?: number[];
  cobenefits?: number[];
  type?: 'PRESET' | 'CUSTOM';
}

export interface ScenarioDraftPatchPayload {
  configuration: Partial<ScenarioV3Config>;
  name: string;
  planning_area: number;
  treatment_goal: number;
}
