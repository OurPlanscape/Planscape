/**
 * Global mock for maplibre-gl Map class.
 * This mock replaces the real MapLibreMap to avoid WebGL dependencies in tests.
 */
export class MockMapLibreMap {
  private listeners: Record<string, Function[]> = {};
  private container: HTMLElement;

  constructor(options?: {
    container?: HTMLElement | string;
    center?: [number, number];
    zoom?: number;
  }) {
    this.container =
      typeof options?.container === 'string'
        ? document.createElement('div')
        : options?.container || document.createElement('div');
  }

  getContainer() {
    return this.container;
  }

  getCanvas() {
    return document.createElement('canvas');
  }

  getCanvasContainer() {
    return document.createElement('div');
  }

  getCenter() {
    return { lng: 0, lat: 0, wrap: () => ({ lng: 0, lat: 0 }) };
  }

  getZoom() {
    return 10;
  }

  getBearing() {
    return 0;
  }

  getPitch() {
    return 0;
  }

  getBounds() {
    return {
      getNorth: () => 1,
      getSouth: () => -1,
      getEast: () => 1,
      getWest: () => -1,
      toArray: () => [
        [-1, -1],
        [1, 1],
      ],
      getCenter: () => ({ lng: 0, lat: 0 }),
      extend: () => this.getBounds(),
      contains: () => true,
    };
  }

  getStyle() {
    return {
      layers: [],
      sources: {},
    };
  }

  setStyle() {}

  getSource() {
    return null;
  }

  addSource() {}
  removeSource() {}

  getLayer() {
    return null;
  }

  addLayer() {}
  removeLayer() {}

  setFilter() {}
  getFilter() {
    return null;
  }

  setPaintProperty() {}
  getPaintProperty() {
    return null;
  }

  setLayoutProperty() {}
  getLayoutProperty() {
    return null;
  }

  setFeatureState() {}
  getFeatureState() {
    return {};
  }
  removeFeatureState() {}

  queryRenderedFeatures() {
    return [];
  }

  querySourceFeatures() {
    return [];
  }

  project() {
    return { x: 0, y: 0 };
  }

  unproject() {
    return { lng: 0, lat: 0 };
  }

  jumpTo() {}
  easeTo() {}
  flyTo() {}
  panTo() {}
  zoomTo() {}
  zoomIn() {}
  zoomOut() {}
  rotateTo() {}
  resetNorth() {}
  fitBounds() {}

  resize() {}

  loaded() {
    return true;
  }

  isMoving() {
    return false;
  }

  isZooming() {
    return false;
  }

  isRotating() {
    return false;
  }

  triggerRepaint() {}

  remove() {}

  on(event: string, layerOrFn: string | Function, fn?: Function) {
    const callback = typeof layerOrFn === 'function' ? layerOrFn : fn!;
    (this.listeners[event] ||= []).push(callback);
    return this;
  }

  off(event: string, layerOrFn: string | Function, fn?: Function) {
    const callback = typeof layerOrFn === 'function' ? layerOrFn : fn!;
    this.listeners[event] = (this.listeners[event] || []).filter(
      (f) => f !== callback
    );
    return this;
  }

  once(event: string, layerOrFn: string | Function, fn?: Function) {
    const callback = typeof layerOrFn === 'function' ? layerOrFn : fn!;
    const wrappedCallback = (...args: any[]) => {
      this.off(event, layerOrFn, wrappedCallback);
      callback(...args);
    };
    this.on(event, layerOrFn, wrappedCallback);
    return this;
  }

  fire(event: string, data?: any) {
    const callbacks = this.listeners[event] || [];
    callbacks.forEach((cb) => cb(data));
    return this;
  }

  // Additional methods that may be needed
  addControl() {
    return this;
  }
  removeControl() {
    return this;
  }
  hasControl() {
    return false;
  }

  addImage() {}
  hasImage() {
    return false;
  }
  removeImage() {}
  loadImage() {}

  setCursor() {}

  setMaxBounds() {}
  setMinZoom() {}
  setMaxZoom() {}
  setMinPitch() {}
  setMaxPitch() {}

  getMaxBounds() {
    return null;
  }
  getMinZoom() {
    return 0;
  }
  getMaxZoom() {
    return 22;
  }
  getMinPitch() {
    return 0;
  }
  getMaxPitch() {
    return 60;
  }

  setRenderWorldCopies() {}
  getRenderWorldCopies() {
    return true;
  }

  setProjection() {}
  getProjection() {
    return { name: 'mercator' };
  }
}
