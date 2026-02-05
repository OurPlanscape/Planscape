import { Feature, Polygon, MultiPolygon } from 'geojson';
import { acresForFeature } from '@app/maplibre-map/maplibre.helper';

describe('test acresForFeature helper function', () => {
  const standardPolygon: Feature<MultiPolygon> = {
    type: 'Feature',
    properties: {},
    geometry: {
      type: 'MultiPolygon',
      coordinates: [
        [
          [
            [-120.2609138, 35.1728389],
            [-120.527137917, 35.098357187],
            [-120.555161399, 35.004680945],
            [-120.31229027, 34.863007331],
            [-120.2609138, 35.1728389],
          ],
        ],
      ],
    },
  };

  const oneAcre: Feature<Polygon> = {
    type: 'Feature',
    properties: {},
    geometry: {
      type: 'Polygon',
      coordinates: [
        [
          [-119.401653695, 35.056945185],
          [-119.401660625, 35.05643746],
          [-119.400669614, 35.056431787],
          [-119.400683474, 35.056953695],
          [-119.401653695, 35.056945185],
        ],
      ],
    },
  };

  const badPolygon: Feature<Polygon> = {
    type: 'Feature',
    properties: {},
    geometry: {
      type: 'Polygon',
      coordinates: [[[0, 0]]],
    },
  };

  const multiple10Acres: Feature<MultiPolygon> = {
    type: 'Feature',
    properties: {},
    geometry: {
      type: 'MultiPolygon',
      coordinates: [
        [
          [
            [-119.40364611, 35.056965041],
            [-119.40365304, 35.056457316],
            [-119.402662029, 35.056451643],
            [-119.402675889, 35.056973551],
            [-119.40364611, 35.056965041],
          ],
        ],
        [
          [
            [-119.403649577, 35.055952422],
            [-119.403646112, 35.054962484],
            [-119.402623915, 35.054942628],
            [-119.402641241, 35.05597795],
            [-119.403649577, 35.055952422],
          ],
        ],
        [
          [
            [-119.401639834, 35.056933839],
            [-119.401674485, 35.055946751],
            [-119.400617638, 35.055983625],
            [-119.400638428, 35.05697355],
            [-119.401639834, 35.056933839],
          ],
        ],
        [
          [
            [-119.398704918, 35.055921222],
            [-119.398730059, 35.055138608],
            [-119.397659352, 35.055113079],
            [-119.397690538, 35.055881769],
            [-119.398704918, 35.055921222],
          ],
        ],
        [
          [
            [-119.398726594, 35.057280143],
            [-119.398695409, 35.056866023],
            [-119.397628166, 35.056894387],
            [-119.397645492, 35.057368072],
            [-119.398726594, 35.057280143],
          ],
        ],
      ],
    },
  };

  it('should calculate acres correctly for typical input', () => {
    const result = acresForFeature(standardPolygon); // 1 acre in square feet
    expect(Math.round(result)).toBe(132136);
  });

  it('should return 1 for a polygon with one acre', () => {
    const result = acresForFeature(oneAcre);
    expect(Math.round(result)).toBe(1);
  });

  it('should handle polygon of zero size', () => {
    const result = acresForFeature(badPolygon); // 0.5 acres
    expect(result).toBe(0);
  });

  it('should handle multiple noncontiguous shapes', () => {
    const result = acresForFeature(multiple10Acres);
    expect(Math.round(result)).toBe(10);
  });
});
