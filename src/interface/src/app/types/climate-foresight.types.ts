export type ClimateForesightRunStatus = 'draft' | 'running' | 'done';

export interface DataLayerConfiguration {
  data_layer_id: number;
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
  selected_data_layers?: DataLayerConfiguration[];
}

export interface CreateClimateForesightRunPayload {
  name: string;
  planning_area: number;
}
