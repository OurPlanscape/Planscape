import { ChartData } from '../project-areas-metrics/chart-data';

/**
 * Temp file to hold dummy data. remove once done!
 */
export function generateDummyData(): ChartData[] {
  const labels = [
    'Dead and down fuels',
    'Total Large tree carbon',
    'Residential Structures',
    'Potential Smoke Emissions',
    'Particulate Matter',
    'Community Integrity',
    'Species Richness: Cavity Nesters/Excavators',
    'Open Habitat Raptors Species Richness',
    'Wood Product Industry',
    'Ember Load Index',
    'Wildfire Ignitions',
  ];

  return labels.map((label) => ({
    label,
    values: Array.from({ length: 5 }, () => Math.floor(Math.random() * 10)),
  }));
}

/**
 * Temp data to fill in the report
 */
export function generateDummyReport() {
  return [
    { id: 1, acres: 123, percentTotal: 12, estimatedCost: '$12k', score: 12 },
    { id: 2, acres: 444, percentTotal: 2.2, estimatedCost: '$32k', score: 2 },
    {
      id: 3,
      acres: 983,
      percentTotal: 32.2,
      estimatedCost: '$432k',
      score: 32,
    },
    {
      id: 4,
      acres: 12,
      percentTotal: 12.2,
      estimatedCost: '$2k',
      score: 0.2,
    },
  ];
}
