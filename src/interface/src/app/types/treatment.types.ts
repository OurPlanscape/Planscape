export type TreatmentStatus = 'FAILURE' | 'PENDING' | 'RUNNING' | 'SUCCESS';

export interface TreatmentPlan {
  id: number;
  name: string;
  status: TreatmentStatus;
  created_at: string;
  creator_name: string;
}

export type TreatmentType =
  | 'No Treatment'
  | 'Moderate thin & Biomass removal'
  | 'Heavy thin & Biomass removal'
  | 'Moderate thin & Pile burn'
  | 'Heavy thin & Pile burn'
  | 'Moderate mastication'
  | 'Heavy mastication'
  | 'Prescribed fire'
  | 'Heavy thin & RX fire'
  | 'Mastication & RX fire';
