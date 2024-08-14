export type TreatmentStatus = 'FAILURE' | 'PENDING' | 'RUNNING' | 'SUCCESS';

export interface TreatmentPlan {
  id: number;
  name: string;
  status: TreatmentStatus;
  created_at: string;
  creator_name: string;
}
