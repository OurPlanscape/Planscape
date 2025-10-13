export type ClimateForesightRunStatus = 'draft' | 'running' | 'done';

export interface InputDatalayer {
  id?: number;
  datalayer: number;
  favor_high: boolean;
  pillar: string;
}

export interface ClimateForesightRun {
  id: number;
  name: string;
  planning_area: number;
  planning_area_name: string;
  created_at: string;
  creator: string;
  status: ClimateForesightRunStatus;
  input_datalayers?: InputDatalayer[];
}

export interface CreateClimateForesightRunPayload {
  name: string;
  planning_area: number;
}
