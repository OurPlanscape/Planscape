export type ClimateForesightRunStatus = 'draft' | 'running' | 'done';

export interface ClimateForesightRun {
  id: number;
  name: string;
  planning_area: number;
  planning_area_name: string;
  created_at: string;
  creator?: string;
  status?: ClimateForesightRunStatus;
}

export interface CreateClimateForesightRunPayload {
  name: string;
  planning_area: number;
}
