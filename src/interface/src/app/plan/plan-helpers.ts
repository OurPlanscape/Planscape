import { Plan, ScenarioResult } from '@types';
import {
  ProjectAreaReport,
  ProjectTotalReport,
} from '@app/plan/project-areas/project-areas.component';
import { DEFAULT_AREA_COLOR, PROJECT_AREA_COLORS } from '@shared';
import flatten from '@turf/flatten';
import { Feature, MultiPolygon, Polygon } from 'geojson';
import { GeoJSONStoreFeatures } from 'terra-draw';
import { Position } from '@turf/helpers';

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

export type STAND_SIZE = 'SMALL' | 'MEDIUM' | 'LARGE';

export const STAND_OPTIONS: Record<
  STAND_SIZE,
  { label: string; description: string | null; acres: number }
> = {
  SMALL: { label: 'Small', description: null, acres: 10 },
  MEDIUM: {
    label: 'Medium',
    description: null,
    acres: 100,
  },
  LARGE: {
    label: 'Large',
    description: 'Recommended for Larger Planning Areas',
    acres: 500,
  },
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

interface Series {
  label: string;
  data: number[]; // cumulative sum of raw attainment values
}

export function processCumulativeAttainment(features: any[]): {
  area: number[];
  datasets: Series[];
} {
  let cumArea = 0;
  const area: number[] = [];

  // for each metric we track a running sum + the per-step data
  const seriesMap: Record<
    string,
    {
      sum: number;
      data: number[];
    }
  > = {};

  for (const f of features) {
    const a = Number(f.properties?.area_acres) || 0;
    cumArea += a;
    area.push(cumArea);

    const att = f.properties?.attainment;
    if (att && typeof att === 'object') {
      for (const [metric, raw] of Object.entries(att)) {
        const v = Number(raw);
        if (Number.isNaN(v)) continue;

        if (!seriesMap[metric]) {
          seriesMap[metric] = { sum: 0, data: [] };
        }

        // just add the raw attainment to the running sum
        seriesMap[metric].sum += v;
        seriesMap[metric].data.push(seriesMap[metric].sum);
      }
    }
  }

  return {
    area,
    datasets: Object.entries(seriesMap).map(([label, { data }]) => ({
      label,
      data,
    })),
  };
}

export function hasAnalytics(results: ScenarioResult): boolean {
  return results.result.features.some(
    (feature) => feature.properties['attainment']
  );
}

/* from a mixed featuresArray of polygons and multipolygons,
  this function converts each multipolygon to a polygon,
  then returns a GeoJSONStoreFeatures array of just polygons
*/
export function flattenMultipolygons(
  featuresArray: Feature<Polygon | MultiPolygon>[]
): GeoJSONStoreFeatures[] {
  const polygons: GeoJSONStoreFeatures[] = [];
  featuresArray.forEach((f) => {
    if (f.geometry.type === 'Polygon') {
      polygons.push(f as GeoJSONStoreFeatures);
    } else if (f.geometry.type === 'MultiPolygon') {
      const flattened = flatten(f);
      if (flattened.features) {
        flattened.features.forEach((p) => {
          if (p.geometry && p.geometry.type === 'Polygon') {
            polygons.push(p as GeoJSONStoreFeatures);
          }
        });
      }
    }
  });
  return polygons;
}

export function planningAreaMetricsAreReady(pa: Plan) {
  return pa.map_status === 'DONE';
}

export function planningAreaMetricsFailed(pa: Plan) {
  return pa.map_status === 'FAILED';
}

export function stripZCoords(
  givenFeatures: GeoJSONStoreFeatures[]
): GeoJSONStoreFeatures[] {
  return givenFeatures.map((feature) => {
    if (feature.geometry && Array.isArray(feature.geometry.coordinates)) {
      feature.geometry.coordinates = sanitizeCoordinates(
        feature.geometry.coordinates
      );
    }
    return feature;
  });
}

function sanitizeCoordinates(coords: any): Position[] | any {
  if (!Array.isArray(coords)) {
    return coords;
  }

  return coords.map((coord) => {
    // If the coordinate is an array with 3 elements, return only the first two
    if (Array.isArray(coord) && coord.length === 3) {
      return [coord[0], coord[1]] as Position;
    }
    // Recursively sanitize deeper nested arrays
    return sanitizeCoordinates(coord);
  });
}
