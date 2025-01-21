import { Point } from 'geojson';
import { PrescriptionAction, PRESCRIPTIONS } from '../treatments/prescriptions';

export type TreatmentStatus =
  | 'FAILURE'
  | 'PENDING'
  | 'QUEUED'
  | 'RUNNING'
  | 'SUCCESS';

export type TreatmentType = keyof typeof PRESCRIPTIONS;

export interface TreatmentPlan {
  id: number;
  name: string;
  status: TreatmentStatus;
  created_at: string;
  creator_name: string;
  updated_at: string;
}

interface Totals {
  total_area_acres: number;
  total_stand_count: number;
  total_treated_area_acres: number;
  total_treated_stand_count: number;
}

export interface TreatmentProjectArea extends Totals {
  project_area_id: number;
  project_area_name: string;
  total_stand_count: number;
  prescriptions: Prescription[];
  extent: Extent;
  centroid: Point;
  total_treated_area_acres: number;
  total_treated_stand_count: number;
}

export interface Prescription {
  action: PrescriptionAction;
  area_acres: number;
  treated_stand_count: number;
  type: TreatmentType;
  stand_ids: number[];
}

export interface TreatedStand {
  id: number;
  action: string;
}

export interface TreatmentSummary extends Totals {
  project_areas: TreatmentProjectArea[];
  extent: Extent;
  planning_area_id: number;
  planning_area_name: string;
  scenario_id: number;
  scenario_name: string;
  treatment_plan_id: number;
  treatment_plan_name: string;
}

export type Extent = [number, number, number, number];
