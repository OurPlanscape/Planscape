/**
 * Global mock configuration for ngx-maplibre-gl components.
 * This file sets up ng-mocks to automatically mock all ngx-maplibre-gl
 * components in tests, eliminating WebGL dependencies.
 *
 * Import this file in test.ts to apply mocks globally.
 */

import { ngMocks, MockComponent, MockDirective, MockService } from 'ng-mocks';
import {
  ControlComponent,
  DraggableDirective,
  FeatureComponent,
  GeoJSONSourceComponent,
  ImageComponent,
  LayerComponent,
  MapComponent,
  MapService,
  MarkerComponent,
  PopupComponent,
  RasterSourceComponent,
  VectorSourceComponent,
} from '@maplibre/ngx-maplibre-gl';

/**
 * All ngx-maplibre-gl components that need to be mocked.
 */
export const NGX_MAPLIBRE_GL_COMPONENTS = [
  MapComponent,
  ControlComponent,
  LayerComponent,
  VectorSourceComponent,
  GeoJSONSourceComponent,
  RasterSourceComponent,
  ImageComponent,
  PopupComponent,
  FeatureComponent,
  MarkerComponent,
];

export const NGX_MAPLIBRE_GL_DIRECTIVES = [DraggableDirective];

/**
 * Pre-created mock components for use with TestBed.configureTestingModule().
 * Use these in the declarations array when testing components that import
 * ngx-maplibre-gl components.
 */
export const MOCK_NGX_MAPLIBRE_COMPONENTS = [
  MockComponent(MapComponent),
  MockComponent(ControlComponent),
  MockComponent(LayerComponent),
  MockComponent(VectorSourceComponent),
  MockComponent(GeoJSONSourceComponent),
  MockComponent(RasterSourceComponent),
  MockComponent(ImageComponent),
  MockComponent(PopupComponent),
  MockComponent(FeatureComponent),
  MockComponent(MarkerComponent),
  MockDirective(DraggableDirective),
];

/**
 * Configure ng-mocks to globally mock all ngx-maplibre-gl components and services.
 * These mocks will be automatically used when using MockBuilder.
 */
export function setupNgxMaplibreGlMocks(): void {
  // Mock all ngx-maplibre-gl components globally (for MockBuilder usage)
  NGX_MAPLIBRE_GL_COMPONENTS.forEach((component) => {
    ngMocks.globalMock(component);
  });

  NGX_MAPLIBRE_GL_DIRECTIVES.forEach((directive) => {
    ngMocks.globalMock(directive);
  });

  // Mock the MapService (required by many ngx-maplibre-gl components)
  ngMocks.globalMock(MapService);
}

/**
 * Get a mock MapService instance for use in tests.
 */
export function getMockMapService(): Partial<MapService> {
  return MockService(MapService);
}

// Export the individual mocked components for tests that need direct access
export const MOCKED_MAPLIBRE_COMPONENTS = [
  MapComponent,
  ControlComponent,
  LayerComponent,
  VectorSourceComponent,
  GeoJSONSourceComponent,
  RasterSourceComponent,
  ImageComponent,
  PopupComponent,
  FeatureComponent,
  MarkerComponent,
  DraggableDirective,
];
