import { TestBed } from '@angular/core/testing';

import { MapGeoJSONFeature } from 'maplibre-gl';
import { standIsForested } from './stands';

describe('DirectImpactsStateService', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({});
  });

  describe('standIsForested', () => {
    it('should be true if delta 0 is present', async () => {
      const isForested = standIsForested({
        id: 1,
        properties: {
          delta_0: 1,
        },
      } as any as MapGeoJSONFeature);
      expect(isForested).toBe(true);
    });
    it('should be true if delta 0 is 0', async () => {
      const isForested = standIsForested({
        id: 1,
        properties: {
          delta_0: 0,
        },
      } as any as MapGeoJSONFeature);
      expect(isForested).toBe(true);
    });
    it('should be false if delta 0 is not present', () => {
      const isForested = standIsForested({
        id: 1,
        properties: {},
      } as any as MapGeoJSONFeature);
      expect(isForested).toBe(false);
    });
    it('should be false if delta 0 is null', () => {
      const isForested = standIsForested({
        id: 1,
        properties: {
          delta_0: null,
        },
      } as any as MapGeoJSONFeature);
      expect(isForested).toBe(false);
    });
  });
});
