import { TestBed } from '@angular/core/testing';
import {
  getColorForProjectPosition,
  isValidTotalArea,
  processCumulativeAttainment,
  flattenMultipolygons,
  stripZCoords,
} from '@app/plan/plan-helpers';
import { Feature, Polygon, MultiPolygon } from 'geojson';
import { DEFAULT_AREA_COLOR, PROJECT_AREA_COLORS } from '@shared';
import { GeoJSONStoreFeatures } from 'terra-draw';

interface MockFeature {
  properties: {
    area_acres: number;
    attainment: Record<string, number>;
  };
}

describe('Plan Helpers', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({});
  });

  describe('getColorForProjectPosition', () => {
    it('should return a color based on the rank position', () => {
      expect(getColorForProjectPosition(1)).toBe(PROJECT_AREA_COLORS[0]);
    });

    it('should cycle thru the colors if more than defined', () => {
      expect(getColorForProjectPosition(52)).toBe(PROJECT_AREA_COLORS[1]);
    });

    it('should return default color if position is invalid', () => {
      expect(getColorForProjectPosition(0)).toBe(DEFAULT_AREA_COLOR);

      expect(getColorForProjectPosition(-32)).toBe(DEFAULT_AREA_COLOR);
    });
  });

  describe('isValidTotalArea', () => {
    it('should validate that area is more than 100 acres', () => {
      expect(isValidTotalArea(99)).toBe(false);
      expect(isValidTotalArea(100)).toBe(true);
      expect(isValidTotalArea(1000)).toBe(true);
    });
  });

  describe('processCumulativeAttainment', () => {
    it('should return empty arrays when features is empty', () => {
      const result = processCumulativeAttainment([]);
      expect(result.area).toEqual([]);
      expect(result.datasets).toEqual([]);
    });

    it('should handle a single feature by returning its area and raw attainment as the running sum', () => {
      const features: MockFeature[] = [
        {
          properties: {
            area_acres: 50,
            attainment: { A: 5, B: 15 },
          },
        },
      ];

      const { area, datasets } = processCumulativeAttainment(features);

      expect(area).toEqual([50]);

      const byLabel = datasets.reduce(
        (acc, ds) => {
          acc[ds.label] = ds.data;
          return acc;
        },
        {} as Record<string, number[]>
      );

      expect(Object.keys(byLabel).sort()).toEqual(['A', 'B']);
      expect(byLabel['A']).toEqual([5]);
      expect(byLabel['B']).toEqual([15]);
    });

    it('should compute the running sum of attainment values over multiple features with exact decimals', () => {
      const features: MockFeature[] = [
        { properties: { area_acres: 10, attainment: { FLDH: 0.5 } } },
        { properties: { area_acres: 15, attainment: { FLDH: 0.25 } } },
        { properties: { area_acres: 20, attainment: { FLDH: 0.125 } } },
        { properties: { area_acres: 5, attainment: { FLDH: 0.125 } } },
      ];

      const { area, datasets } = processCumulativeAttainment(features);

      // cumulative area should be correct
      expect(area).toEqual([10, 25, 45, 50]);

      // only one metric present
      expect(datasets.length).toBe(1);
      const ds = datasets[0];
      expect(ds.label).toBe('FLDH');

      expect(ds.data).toEqual([0.5, 0.75, 0.875, 1]);
    });
  });
});

describe('Sanitize z-coords', () => {
  const threeElementFeatures: GeoJSONStoreFeatures[] = [
    {
      type: 'Feature',
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [-122.352853, 43.777647, 0],
            [-122.352415, 43.777644, 0],
            [-122.351012, 43.777908, 0],
            [-122.34988, 43.778302, 0],
            [-122.348998, 43.778776, 0],
            [-122.352853, 43.777647, 0],
          ],
        ],
      },
      properties: {
        BASICOWNER: '111',
        OWNERCLASS: 'SOME OWNER',
        mode: 'polygon',
      },
    },
  ];

  it('should convert any coords with three elements to just the first two', () => {
    const sanitizedResult: GeoJSONStoreFeatures[] =
      stripZCoords(threeElementFeatures);
    expect(sanitizedResult[0].geometry.coordinates).toEqual([
      [
        [-122.352853, 43.777647],
        [-122.352415, 43.777644],
        [-122.351012, 43.777908],
        [-122.34988, 43.778302],
        [-122.348998, 43.778776],
        [-122.352853, 43.777647],
      ],
    ]);
  });
});

describe('Flatten multipolygon helper', () => {
  it('should return an empty array when given an empty array', () => {
    const result = flattenMultipolygons([]);
    expect(result).toEqual([]);
  });

  it('should return a single polygon when given a single polygon feature', () => {
    const features: Feature<Polygon>[] = [
      {
        type: 'Feature',
        geometry: {
          type: 'Polygon',
          coordinates: [
            [
              [0, 0],
              [1, 1],
              [1, 0],
              [0, 0],
            ],
          ],
        },
        properties: {},
      },
    ];
    const result = flattenMultipolygons(features);
    expect(result[0].geometry.type).toBe('Polygon');
  });

  it('should flatten multipolygons into individual polygons', () => {
    const features: Feature<MultiPolygon>[] = [
      {
        type: 'Feature',
        geometry: {
          type: 'MultiPolygon',
          coordinates: [
            [
              [
                [0, 0],
                [1, 1],
                [1, 0],
                [0, 0],
              ], // First polygon
            ],
            [
              [
                [2, 2],
                [3, 3],
                [3, 2],
                [2, 2],
              ], // Second polygon
            ],
          ],
        },
        properties: {},
      },
    ];
    const result = flattenMultipolygons(features);
    expect(result[0].geometry.type).toBe('Polygon');
    expect(result[1].geometry.type).toBe('Polygon');
  });

  it('should ignore non-polygon features', () => {
    const features: Feature<any>[] = [
      {
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: [0, 0],
        },
        properties: {},
      },
      {
        type: 'Feature',
        geometry: {
          type: 'Polygon',
          coordinates: [
            [
              [0, 0],
              [1, 1],
              [1, 0],
              [0, 0],
            ],
          ],
        },
        properties: {},
      },
    ];
    const result = flattenMultipolygons(features);
    expect(result[0].geometry.type).toBe('Polygon');
  });
});
