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
        boundaryLayerConfig: {
          display_name: 'HUC-12',
          boundary_name: 'huc12',
          vector_name: 'sierra-nevada:vector_huc12',
          shape_name: 'Name",'
        },
        dataLayerConfig: {
          display_name: 'Habitat Connectivity',
          filepath: 'habitat_connectivity',
          normalized: true,
        },
        showExistingProjectsLayer: true,
      };
      let mapConfigStr =
        'Habitat Connectivity (Normalized) | Existing Projects | HUC-12';

      let transformedStr = pipe.transform(mapConfig);

      expect(transformedStr).toEqual(mapConfigStr);
    });
  });
});
