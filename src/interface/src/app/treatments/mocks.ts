import { TreatmentPlan, TreatmentSummary } from '@types';

export const MOCK_SUMMARY: TreatmentSummary = {
  project_areas: [
    {
      project_area_id: 1,
      project_area_name: 'Area 1',
      total_stand_count: 10,
      prescriptions: [
        {
          action: 'cut',
          area_acres: 100,
          treated_stand_count: 3,
          type: 'SINGLE',
          stand_ids: [1, 2, 3],
        },
        {
          action: 'burn',
          area_acres: 50,
          treated_stand_count: 2,
          type: 'SEQUENCE',
          stand_ids: [4, 5],
        },
      ],
      extent: [1, 2, 3, 4],
      centroid: {
        type: 'Point',
        coordinates: [],
      },
    },
  ],
  extent: [1, 2, 3, 4],
  planning_area_id: 1,
  planning_area_name: 'Test',
  scenario_id: 2,
  scenario_name: 'Test Scenario',
  treatment_plan_id: 3,
  treatment_plan_name: 'Test Treatment Plan',
};

export const MOCK_TREATMENT_PLAN: TreatmentPlan = {
  id: 123,
  name: 'Plan 1',
  status: 'SUCCESS',
  created_at: '2024-01-01T00:00:00Z',
  creator_name: 'John Doe',
};
