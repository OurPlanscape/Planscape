import { ScenarioResult } from '@types';
import {
  ProjectAreaReport,
  ProjectTotalReport,
} from './project-areas/project-areas.component';
import { DEFAULT_AREA_COLOR, PROJECT_AREA_COLORS } from '@shared';

export const POLLING_INTERVAL = 3000;

// sizes in hectares
export const STAND_SIZES: Record<string, number> = {
  SMALL: 10,
  MEDIUM: 100,
  LARGE: 500,
};

export const STAND_SIZES_LABELS: Record<string, string> = {
  SMALL: 'Small',
  MEDIUM: 'Medium',
  LARGE: 'Large',
};

export function parseResultsToProjectAreas(
  results: ScenarioResult
): ProjectAreaReport[] {
  return results.result.features.map((featureCollection) => {
    const props = featureCollection.properties;
    return {
      rank: props.treatment_rank,
      acres: props.area_acres,
      percentTotal: props.pct_area,
      estimatedCost: props.total_cost,
      score: props.weightedPriority,
    };
  });
}

export function parseResultsToTotals(
  areaReports: ProjectAreaReport[]
): ProjectTotalReport {
  return areaReports.reduce(
    (acc, value) => {
      acc.acres += value.acres;
      acc.estimatedCost += value.estimatedCost;
      acc.percentTotal += value.percentTotal;
      return acc;
    },
    {
      acres: 0,
      percentTotal: 0,
      estimatedCost: 0,
    }
  );
}

export function getColorForProjectPosition(rank: number) {
  if (rank < 1) {
    return DEFAULT_AREA_COLOR;
  }
  return PROJECT_AREA_COLORS[(rank - 1) % PROJECT_AREA_COLORS.length];
}

export function getPlanPath(planId: number) {
  return '/plan/' + planId;
}

export function isValidTotalArea(area: number) {
  return area >= 100;
}
