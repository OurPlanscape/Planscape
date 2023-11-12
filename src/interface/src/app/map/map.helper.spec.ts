import { TestBed } from '@angular/core/testing';
import { Feature, FeatureCollection } from 'geojson';
import { checkIfAreaInBoundaries } from './map.helper';

function createFeatureCollection(features: Feature[]): FeatureCollection {
  return {
    type: 'FeatureCollection',
    features: features,
  };
}

describe('MapHelper', () => {
  const boundaries: Feature = {
    type: 'Feature',
    properties: {},
    geometry: {
      type: 'Polygon',
      coordinates: [
        [
          [-121.203918, 38.940185],
          [-120.075073, 39.010648],
          [-119.874573, 38.483695],
          [-120.882568, 38.333039],
          [-121.203918, 38.940185],
        ],
      ],
    },
  };

  const featureWithin: Feature = {
    type: 'Feature',
    properties: {},
    geometry: {
      type: 'Polygon',
      coordinates: [
        [
          [-120.72052, 38.786204],
          [-120.135498, 38.781922],
          [-120.223389, 38.444985],
          [-120.695801, 38.597554],
          [-120.72052, 38.786204],
        ],
      ],
    },
  };

  const smallFeatureWithin: Feature = {
    type: 'Feature',
    properties: {},
    geometry: {
      type: 'Polygon',
      coordinates: [
        [
          [-120.536499, 38.820451],
          [-120.426636, 38.796908],
          [-120.539246, 38.775499],
          [-120.536499, 38.820451],
        ],
      ],
    },
  };

  const featureOutside: Feature = {
    type: 'Feature',
    properties: {},
    geometry: {
      type: 'Polygon',
      coordinates: [
        [
          [-120.261841, 38.905996],
          [-119.00116, 38.781922],
          [-119.30603, 38.143198],
          [-120.261841, 38.905996],
        ],
      ],
    },
  };

  beforeEach(() => {
    TestBed.configureTestingModule({});
  });

  describe('checkIfAreaInBoundaries', () => {
    it('should return true if area is in boundaries', () => {
      const areaWithin = createFeatureCollection([featureWithin]);
      expect(checkIfAreaInBoundaries(areaWithin, boundaries)).toBe(true);
    });
    it('should return false if area is outside boundaries', () => {
      const areaOutside = createFeatureCollection([featureOutside]);
      expect(checkIfAreaInBoundaries(areaOutside, boundaries)).toBe(false);
    });

    it('should return true if all areas are in boundaries', () => {
      const areasWithin = createFeatureCollection([
        featureWithin,
        smallFeatureWithin,
      ]);
      expect(checkIfAreaInBoundaries(areasWithin, boundaries)).toBe(true);
    });

    it('should return false if one area is outside boundaries', () => {
      const areaOutside = createFeatureCollection([
        featureWithin,
        featureOutside,
      ]);
      expect(checkIfAreaInBoundaries(areaOutside, boundaries)).toBe(false);
    });
  });
});
