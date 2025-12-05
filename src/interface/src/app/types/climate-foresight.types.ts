import { DataLayer } from './data-sets';

export type ClimateForesightRunStatus = 'draft' | 'running' | 'done';

export interface Percentiles {
  p5: number;
  p10: number;
  p90: number;
  p95: number;
}

export interface OutlierBound {
  value: number;
  percentile: number;
}

export interface OutlierBounds {
  lower: OutlierBound;
  upper: OutlierBound;
}

export interface BaseStatistics {
  min: number;
  max: number;
  mean: number;
  std: number;
  count: number;
  percentiles: Percentiles;
  outliers: OutlierBounds;
}

export interface LayerStatistics {
  original: BaseStatistics;
}

export interface ClimateForesightPillar {
  id: number;
  run_id: number | null;
  name: string;
  order: number;
  created_by: number;
  created_at: string;
  is_custom: boolean;
  can_delete: boolean;
}

export interface InputDatalayer {
  id?: number;
  datalayer: number;
  favor_high: boolean | null;
  pillar: number | null;
  normalized_datalayer_id?: number | null;
  statistics: LayerStatistics | null;
}

export interface ClimateForesightPillarRollup {
  id: number;
  run: number;
  pillar: number;
  pillar_name: string;
  rollup_datalayer_id: number | null;
  rollup_datalayer?: DataLayer | null;
  status: string;
  method: string;
  weights: Record<string, number> | null;
  created_at: string;
}

export interface FutureMappingEntry {
  layer_id: number | null;
  layer_name: string | null;
  matched: boolean;
  default: boolean;
}

export interface ClimateForesightLandscapeRollup {
  id: number;
  run: number;
  current_datalayer_id: number | null;
  future_datalayer_id: number | null;
  current_datalayer?: DataLayer | null;
  status: string;
  future_mapping: Record<string, FutureMappingEntry> | null;
  created_at: string;
}

export interface ClimateForesightPromote {
  id: number;
  run: number;
  status: string;
  monitor_datalayer_id: number | null;
  protect_datalayer_id: number | null;
  adapt_datalayer_id: number | null;
  transform_datalayer_id: number | null;
  adapt_protect_datalayer_id: number | null;
  integrated_condition_score_datalayer_id: number | null;
  mpat_matrix_datalayer_id: number | null;
  mpat_strength_datalayer_id: number | null;
  mpat_strength_datalayer?: DataLayer | null;
  adapt_protect_datalayer?: DataLayer | null;
  integrated_condition_score_datalayer?: DataLayer | null;
  created_at: string;
}

export interface ClimateForesightRun {
  id: number;
  name: string;
  planning_area: number;
  planning_area_name: string;
  created_at: string;
  creator: string;
  status: ClimateForesightRunStatus;
  current_step: number;
  furthest_step: number;
  input_datalayers?: InputDatalayer[];
  pillar_rollups?: ClimateForesightPillarRollup[];
  landscape_rollup?: ClimateForesightLandscapeRollup | null;
  promote?: ClimateForesightPromote | null;
}

export interface Pillar {
  id: number;
  run: number;
  name: string;
  order: number;
  created_at: string;
  is_custom: boolean;
  can_delete: boolean;
}

export interface CreateClimateForesightRunPayload {
  name: string;
  planning_area: number;
}
