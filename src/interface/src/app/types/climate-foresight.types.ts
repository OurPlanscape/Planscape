export type ClimateForesightRunStatus = 'draft' | 'running' | 'done';

export interface Percentiles {
  p5: number;
  p10: number;
  p90: number;
  p95: number;
}

export interface LayerStatistics {
  min: number;
  max: number;
  mean: number;
  std: number;
  count: number;
  percentiles: Percentiles;
}

export interface InputDatalayer {
  id?: number;
  datalayer: number;
  favor_high: boolean | null;
  pillar: number | null;
  normalized_datalayer_id?: number | null;
  statistics: LayerStatistics | null;
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
