import { ChartData } from '../project-areas-metrics/chart-data';

/**
 * Temp file to hold dummy data. remove once done!
 */
export function generateDummyData(): ChartData[] {
  const labels = [
    ['Dead and down fuels', 'Short Tons/Acre'],
    ['Total Large tree carbon', 'Mg C/ha'],
    ['Residential Structures', 'Unknown'],
    ['Potential Smoke Emissions', 'Short Tons of PM2.5'],
    ['Particulate Matter', 'Short Tons of PM2.5'],
    ['Community Integrity', 'Categorical'],
    ['Species Richness: Cavity Nesters/Excavators', 'Number of Species'],
    ['Open Habitat Raptors Species Richness', 'Number of Species'],
    ['Wood Product Industry', 'Dry Weight Ton/Acre'],
    ['Ember Load Index', 'Relative Number of Embers'],
    ['Wildfire Ignitions', 'Count of Fires'],
  ];

  return labels.map((label, i) => ({
    label: label[0],
    measurement: label[1],
    values: Array.from({ length: 5 }, () => Math.floor(Math.random() * 10)),
    metric_layer: '',
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
