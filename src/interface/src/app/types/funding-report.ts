// TODO full interface
export interface FundingReport {
  status: 'SUCCESS' | 'PENDING' | 'RUNNING' | 'FAILED';
  created_at: string;
  created_by: number;
  updated_at: string;
  id: number;
  scenario: number;
  results: null | object;
}
