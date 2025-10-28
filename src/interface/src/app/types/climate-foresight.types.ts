export type ClimateForesightRunStatus = 'draft' | 'running' | 'done';

export interface OutlierThresholds {
  p5: number;
  p10: number;
  p90: number;
  p95: number;
}

export interface InputDatalayer {
  id?: number;
  datalayer: number;
  favor_high: boolean;
  pillar: string;
  normalized_datalayer_id?: number | null;
  outlier_thresholds?: OutlierThresholds | null;
  statistics_calculated?: boolean;
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

export interface CreateClimateForesightRunPayload {
  name: string;
  planning_area: number;
}
