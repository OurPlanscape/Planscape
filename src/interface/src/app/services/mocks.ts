import { Plan, Region } from '../types';
import { GeoJSON } from 'geojson';

export const MOCK_PLAN: Plan = {
  id: 1,
  name: 'mock plan',
  user: 2,
  region_name: Region.SIERRA_NEVADA,
  geometry: {
    type: 'FeatureCollection',
    features: [],
  },
  area_acres: 123,
  area_m2: 345,
  creator: 'John Plans',
  created_at: '2024-03-05T18:08:40.503963Z',
  latest_updated: '2024-03-05T18:08:40.503963Z',
  permissions: [],
  scenario_count: 0,
  role: 'Creator',
};

export const MOCK_FEATURE_COLLECTION: GeoJSON = {
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      geometry: {
        type: 'MultiPolygon',
        coordinates: [
          [
            [
              [10, 20],
              [10, 30],
              [15, 15],
            ],
          ],
        ],
      },
      properties: {
        shape_name: 'Test',
      },
    },
  ],
};
