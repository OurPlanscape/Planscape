import { StringifyMapConfigPipe } from './stringify-map-config.pipe';
import { BaseLayerType, MapConfig } from '@types';

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

    it('should still return empty string due to lack of dataLayerConfig::display_name and the lack of boundary::boundary_name', () => {
      let mapConfig: MapConfig = {
        baseLayerType: BaseLayerType.Road,
        boundaryLayerConfig: {
          display_name: 'HUC-12',
          boundary_name: '',
          vector_name: 'sierra-nevada:vector_huc12',
          shape_name: 'Name",',
        },
        dataLayerConfig: {},
        showExistingProjectsLayer: false,
      };

      let transformedStr = pipe.transform(mapConfig);

      expect(transformedStr).toEqual('');
    });

    it('should return just the boundary name', () => {
      let mapConfig: MapConfig = {
        baseLayerType: BaseLayerType.Road,
        boundaryLayerConfig: {
          display_name: 'HUC-12',
          boundary_name: 'huc12',
          vector_name: 'sierra-nevada:vector_huc12',
          shape_name: 'Name",',
        },
        dataLayerConfig: {},
        showExistingProjectsLayer: false,
      };
      let mapConfigStr = 'HUC-12';

      let transformedStr = pipe.transform(mapConfig);

      expect(transformedStr).toEqual(mapConfigStr);
    });

    it('should return just the existing projects', () => {
      let mapConfig: MapConfig = {
        baseLayerType: BaseLayerType.Road,
        boundaryLayerConfig: {
          display_name: 'HUC-12',
          boundary_name: '',
          vector_name: 'sierra-nevada:vector_huc12',
          shape_name: 'Name",',
        },
        dataLayerConfig: {},
        showExistingProjectsLayer: true,
      };
      let mapConfigStr = 'Existing Projects';

      let transformedStr = pipe.transform(mapConfig);

      expect(transformedStr).toEqual(mapConfigStr);
    });

    it('should return only the data layer name', () => {
      let mapConfig: MapConfig = {
        baseLayerType: BaseLayerType.Road,
        boundaryLayerConfig: {
          display_name: 'HUC-12',
          boundary_name: '',
          vector_name: 'sierra-nevada:vector_huc12',
          shape_name: 'Name",',
        },
        dataLayerConfig: {
          display_name: 'Habitat Connectivity',
          normalized: false,
        },
        showExistingProjectsLayer: false,
      };
      let mapConfigStr = 'Habitat Connectivity';

      let transformedStr = pipe.transform(mapConfig);

      expect(transformedStr).toEqual(mapConfigStr);
    });

    it('should return a fully formatted config string', () => {
      let mapConfig: MapConfig = {
        baseLayerType: BaseLayerType.Road,
        boundaryLayerConfig: {
          display_name: 'HUC-12',
          boundary_name: 'huc12',
          vector_name: 'sierra-nevada:vector_huc12',
          shape_name: 'Name",',
        },
        dataLayerConfig: {
          display_name: 'Habitat Connectivity',
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
