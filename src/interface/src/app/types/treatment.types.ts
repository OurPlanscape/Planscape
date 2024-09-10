export type TreatmentStatus = 'FAILURE' | 'PENDING' | 'RUNNING' | 'SUCCESS';

export interface TreatmentPlan {
  id: number;
  name: string;
  status: TreatmentStatus;
  created_at: string;
  creator_name: string;
}
interface TreatmentProjectArea {
  project_area_id: number;
  project_area_name: string;
  total_stand_count: number;
  prescriptions: Prescription[];
}

export interface Prescription {
  action: string;
  area_acres: number;
  treated_stand_count: number;
  type: string;
  stand_ids: number[];
}

export interface TreatedStand {
  id: number;
  action: string;
}

export interface TreatmentSummary {
  project_areas: TreatmentProjectArea[];
}
