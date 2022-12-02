import { StringifyMapConfigPipe } from './stringify-map-config.pipe';
import { BaseLayerType, MapConfig } from './types';

describe('StringifyMapConfigPipe', () => {
  let pipe: StringifyMapConfigPipe;

  beforeEach(() => {
    pipe = new StringifyMapConfigPipe();
  });

  it('should create an instance', () => {
    expect(pipe).toBeTruthy();
  });

  describe('transform', () => {
    it('should return empty string if input config is undefined', () => {
      let transformedStr = pipe.transform(undefined);

      expect(transformedStr).toEqual('');
    });

    it('should return formatted config string', () => {
      let mapConfig: MapConfig = {
        baseLayerType: BaseLayerType.Road,
        dataLayerConfig: {
          display_name: 'Habitat Connectivity',
          metric_name: '',
          filepath: '',
        },
        showDataLayer: true,
        normalizeDataLayer: true,
        showExistingProjectsLayer: true,
        showHuc12BoundaryLayer: true,
        showHuc10BoundaryLayer: false,
        showUsForestBoundaryLayer: false,
        showCountyBoundaryLayer: false,
      };
      let mapConfigStr = 'Habitat Connectivity (Normalized) | Existing Projects | HUC-12 Boundaries';

      let transformedStr = pipe.transform(mapConfig);

      expect(transformedStr).toEqual(mapConfigStr);
    });
  });
});
